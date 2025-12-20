import { Boom } from '@hapi/boom';
import { EventEmitter } from 'events';
import { db } from '@/lib/db';
import { connections, conversations, messages, contacts, aiPersonas, messageReactions } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import pino from 'pino';
import path from 'path';

const logger = pino({ level: 'silent' });
const DEBUG = process.env.DEBUG === 'true';

interface SessionData {
  socket: any;
  emitter: EventEmitter;
  qr?: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'qr' | 'failed';
  phone?: string;
  retryCount: number;
}

interface ChatClassification {
  type: 'individual' | 'group' | 'broadcast' | 'newsletter' | 'community' | 'status' | 'unknown';
  reason: string;
  shouldBlockAI: boolean;
}

function classifyChat(remoteJid: string, msg: any): ChatClassification {
  if (!remoteJid) {
    return { type: 'unknown', reason: 'No remoteJid provided', shouldBlockAI: true };
  }

  const jidLower = remoteJid.toLowerCase();
  
  if (jidLower.includes('@g.us')) {
    return { type: 'group', reason: 'JID suffix @g.us (WhatsApp group)', shouldBlockAI: true };
  }
  
  if (jidLower.includes('@newsletter')) {
    return { type: 'newsletter', reason: 'JID suffix @newsletter (WhatsApp channel)', shouldBlockAI: true };
  }
  
  if (jidLower.includes('@broadcast')) {
    return { type: 'broadcast', reason: 'JID suffix @broadcast (broadcast list)', shouldBlockAI: true };
  }
  
  if (jidLower.includes('@status')) {
    return { type: 'status', reason: 'JID suffix @status (status update)', shouldBlockAI: true };
  }
  
  if (jidLower.includes('@community')) {
    return { type: 'community', reason: 'JID suffix @community (WhatsApp community)', shouldBlockAI: true };
  }
  
  if (msg?.key?.participant || msg?.participant) {
    return { type: 'group', reason: 'Message has participant field (group message)', shouldBlockAI: true };
  }
  
  const phoneNumber = remoteJid.split('@')[0] || '';
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  if (digitsOnly.length > 15) {
    return { 
      type: 'unknown', 
      reason: `Number too long (${digitsOnly.length} digits, >15 indicates group/community)`, 
      shouldBlockAI: true 
    };
  }
  
  // Accept individual chats with @s.whatsapp.net suffix
  if (jidLower.includes('@s.whatsapp.net') && digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return { 
      type: 'individual', 
      reason: 'Valid individual chat (10-15 digits, @s.whatsapp.net)', 
      shouldBlockAI: false 
    };
  }
  
  // Also accept numbers with 10-15 digits even without standard suffix
  // This handles cases where JID format may vary
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    // Additional check: ensure it's not a known non-individual format
    if (!jidLower.includes('@g.us') && !jidLower.includes('@broadcast') && 
        !jidLower.includes('@newsletter') && !jidLower.includes('@status')) {
      return { 
        type: 'individual', 
        reason: `Valid phone number (${digitsOnly.length} digits, treating as individual)`, 
        shouldBlockAI: false 
      };
    }
  }
  
  return { 
    type: 'unknown', 
    reason: 'Could not classify chat type', 
    shouldBlockAI: true 
  };
}

class BaileysSessionManager {
  private sessions = new Map<string, SessionData>();
  private phoneToConnectionMap = new Map<string, string>();
  private messageQueue = new Map<string, any[]>();
  private pendingCreations = new Map<string, Promise<void>>();
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RECONNECT_INTERVAL = 5000;

  private getAuthPath(connectionId: string): string {
    return path.join(process.cwd(), 'whatsapp_sessions', `session_${connectionId}`);
  }

  async clearFilesystemAuth(connectionId: string): Promise<void> {
    try {
      const authPath = this.getAuthPath(connectionId);
      const fs = await import('fs/promises');
      
      try {
        await fs.access(authPath);
        await fs.rm(authPath, { recursive: true, force: true });
        console.log(`[Baileys] Cleared filesystem auth for ${connectionId} at ${authPath}`);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          console.log(`[Baileys] Filesystem auth already clean for ${connectionId}`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('[Baileys] Error clearing filesystem auth:', error);
      throw error;
    }
  }

  async createSession(connectionId: string, companyId: string): Promise<void> {
    if (this.sessions.has(connectionId)) {
      const session = this.sessions.get(connectionId);
      if (session && (session.status === 'connected' || session.status === 'connecting')) {
        console.log(`[Baileys] Session ${connectionId} already exists (status: ${session.status}), skipping creation`);
        return;
      }
    }

    const pendingCreation = this.pendingCreations.get(connectionId);
    if (pendingCreation) {
      console.log(`[Baileys] ⏳ Session ${connectionId} creation already in progress, waiting...`);
      await pendingCreation;
      return;
    }

    const creationPromise = this._doCreateSession(connectionId, companyId);
    this.pendingCreations.set(connectionId, creationPromise);
    
    try {
      await creationPromise;
    } finally {
      this.pendingCreations.delete(connectionId);
    }
  }

  private async _doCreateSession(connectionId: string, companyId: string): Promise<void> {
    try {
      if (this.sessions.has(connectionId)) {
        const session = this.sessions.get(connectionId);
        if (session && (session.status === 'connected' || session.status === 'connecting')) {
          console.log(`[Baileys] Session ${connectionId} already exists after await, skipping`);
          return;
        }
      }

      const [connectionData] = await db
        .select()
        .from(connections)
        .where(eq(connections.id, connectionId))
        .limit(1);

      if (!connectionData) {
        throw new Error(`Connection ${connectionId} not found in database`);
      }

      const phoneNumber = connectionData.phone;
      
      if (phoneNumber) {
        const existingConnectionId = this.phoneToConnectionMap.get(phoneNumber);
        if (existingConnectionId && existingConnectionId !== connectionId) {
          console.warn(`[Baileys] ⚠️  CONFLICT DETECTED: Phone ${phoneNumber} already connected via ${existingConnectionId}`);
          console.warn(`[Baileys] ⚠️  Attempting to connect again with ${connectionId} - BLOCKING to prevent 'Stream Errored (conflict)'`);
          
          const existingSession = this.sessions.get(existingConnectionId);
          if (existingSession && existingSession.status === 'connected') {
            console.warn(`[Baileys] ❌ Cannot create duplicate session. Phone ${phoneNumber} is active on connection ${existingConnectionId}`);
            throw new Error(`Phone ${phoneNumber} already connected. Disconnect existing session first.`);
          } else {
            console.log(`[Baileys] 🔄 Existing session ${existingConnectionId} is not connected, removing stale mapping`);
            this.phoneToConnectionMap.delete(phoneNumber);
          }
        }
      }

      console.log(`[Baileys] Creating new session for connection ${connectionId} (Phone: ${phoneNumber || 'unknown'})`);
      
      const emitter = new EventEmitter();
      
      console.log(`[Baileys] Initiating dynamic Baileys import...`);
      const Baileys = await import('@whiskeysockets/baileys');
      
      if (!Baileys.useMultiFileAuthState || !Baileys.makeWASocket || !Baileys.Browsers) {
        throw new Error('Baileys functions not available');
      }
      
      console.log(`[Baileys] Fetching Baileys version...`);
      const { version } = await Baileys.fetchLatestBaileysVersion();
      console.log(`[Baileys] Using version:`, version);
      
      console.log(`[Baileys] Loading auth state from filesystem...`);
      const authPath = this.getAuthPath(connectionId);
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { state, saveCreds } = await Baileys.useMultiFileAuthState(authPath);
      console.log(`[Baileys] Auth state loaded from ${authPath}`);

      const sessionData: SessionData = {
        socket: null as any,
        emitter,
        status: 'connecting',
        retryCount: 0,
      };

      this.sessions.set(connectionId, sessionData);

      console.log(`[Baileys] Creating WASocket...`);
      const sock = Baileys.makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger,
        browser: Baileys.Browsers.macOS('Chrome'),
      });

      sessionData.socket = sock;
      console.log(`[Baileys] WASocket created successfully`);

      sock.ev.on('connection.update', async (update) => {
        try {
          const { connection, lastDisconnect, qr } = update;
          
          console.log(`[Baileys] Connection update for ${connectionId}:`, connection, lastDisconnect?.error);

          if (qr) {
            console.log(`[Baileys] QR Code generated for ${connectionId}`);
            sessionData.qr = qr;
            sessionData.status = 'qr';
            emitter.emit('qr', qr);

            await db
              .update(connections)
              .set({ qrCode: qr, status: 'connecting' })
              .where(eq(connections.id, connectionId));
          }

          if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const errorMessage = lastDisconnect?.error?.message;
            const shouldReconnect = statusCode !== 401;
            
            console.log(`[Baileys] Connection closed for ${connectionId}. Status code: ${statusCode}, Error: ${errorMessage}`);
            
            if (sessionData.phone) {
              const mappedConnectionId = this.phoneToConnectionMap.get(sessionData.phone);
              if (mappedConnectionId === connectionId) {
                this.phoneToConnectionMap.delete(sessionData.phone);
                console.log(`[Baileys] 🗑️  Removed phone mapping for ${sessionData.phone}`);
              }
            }

            if (statusCode === 515) {
              console.log(`[Baileys] Error 515 - WhatsApp stream error. Will reconnect...`);
              sessionData.retryCount++;
              
              if (sessionData.retryCount < this.MAX_RETRY_ATTEMPTS) {
                console.log(`[Baileys] Attempting reconnect (${sessionData.retryCount}/${this.MAX_RETRY_ATTEMPTS})`);
                await new Promise(resolve => setTimeout(resolve, this.RECONNECT_INTERVAL));
                this.sessions.delete(connectionId);
                await this.createSession(connectionId, companyId);
              } else {
                sessionData.status = 'failed';
                await db
                  .update(connections)
                  .set({ 
                    status: 'failed', 
                    qrCode: null,
                    isActive: false 
                  })
                  .where(eq(connections.id, connectionId));
                emitter.emit('error', { message: 'Max reconnection attempts reached' });
                this.sessions.delete(connectionId);
              }
              return;
            }

            if (statusCode === undefined) {
              console.log(`[Baileys] Unexpected closure (statusCode: undefined). Not retrying to avoid infinite loop.`);
              sessionData.status = 'failed';
              
              await db
                .update(connections)
                .set({ 
                  status: 'failed', 
                  qrCode: null,
                  isActive: false 
                })
                .where(eq(connections.id, connectionId));

              emitter.emit('error', { message: errorMessage || 'Connection closed unexpectedly' });
              this.sessions.delete(connectionId);
              return;
            }

            if (shouldReconnect && sessionData.retryCount < this.MAX_RETRY_ATTEMPTS) {
              sessionData.retryCount++;
              console.log(`[Baileys] Attempting reconnect (${sessionData.retryCount}/${this.MAX_RETRY_ATTEMPTS})`);
              
              await new Promise(resolve => setTimeout(resolve, this.RECONNECT_INTERVAL));
              this.sessions.delete(connectionId);
              await this.createSession(connectionId, companyId);
            } else {
              sessionData.status = statusCode === 401 ? 'disconnected' : 'failed';
              
              await db
                .update(connections)
                .set({ 
                  status: sessionData.status, 
                  qrCode: null,
                  isActive: false 
                })
                .where(eq(connections.id, connectionId));

              emitter.emit('disconnected', { reason: statusCode });
              this.sessions.delete(connectionId);
            }
          }

          if (connection === 'open') {
            if (DEBUG) console.log(`[Baileys] Connected successfully: ${connectionId}`);
            sessionData.status = 'connected';
            sessionData.retryCount = 0;

            const phoneNumber = sock.user?.id?.split(':')[0] || '';
            sessionData.phone = phoneNumber;

            if (phoneNumber) {
              const existingConnectionId = this.phoneToConnectionMap.get(phoneNumber);
              if (existingConnectionId && existingConnectionId !== connectionId) {
                console.warn(`[Baileys] ⚠️  Phone ${phoneNumber} was mapped to ${existingConnectionId}, updating to ${connectionId}`);
              }
              this.phoneToConnectionMap.set(phoneNumber, connectionId);
              if (DEBUG) console.log(`[Baileys] ✅ Registered phone mapping: ${phoneNumber} → ${connectionId}`);
            }

            await db
              .update(connections)
              .set({
                status: 'connected',
                phone: phoneNumber,
                qrCode: null,
                isActive: true,
                lastConnected: new Date(),
              })
              .where(eq(connections.id, connectionId));

            emitter.emit('connected', { phone: phoneNumber });
            
            const queuedMessages = this.messageQueue.get(connectionId);
            if (queuedMessages && queuedMessages.length > 0) {
              console.log(`[Baileys] 📥 Processing ${queuedMessages.length} queued messages from reconnection`);
              for (const msg of queuedMessages) {
                try {
                  await this.handleIncomingMessage(connectionId, companyId, msg);
                } catch (error) {
                  console.error(`[Baileys] Error processing queued message:`, error);
                }
              }
              this.messageQueue.delete(connectionId);
              console.log(`[Baileys] ✅ Queue cleared for ${connectionId}`);
            }
          }
        } catch (error) {
          console.error(`[Baileys] Error in connection.update handler:`, error);
        }
      });

      sock.ev.on('messages.upsert', async ({ messages: newMessages, type }) => {
        if (type !== 'notify') return;

        for (const msg of newMessages) {
          if (!msg.message) continue;
          if (msg.key.fromMe) continue;

          if (sessionData.status === 'connected') {
            await this.handleIncomingMessage(connectionId, companyId, msg);
          } else {
            console.warn(`[Baileys] ⚠️  Message received but connection not ready (status: ${sessionData.status}). Queueing for later.`);
            const queue = this.messageQueue.get(connectionId) || [];
            queue.push(msg);
            this.messageQueue.set(connectionId, queue);
            console.log(`[Baileys] 📥 Queued message from ${msg.key.remoteJid}. Queue size: ${queue.length}`);
          }
        }
      });

      sock.ev.on('creds.update', saveCreds);
      
      sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
          try {
            const { key, update: statusUpdate } = update;
            if (!key.id || !key.fromMe) continue;
            
            const status = statusUpdate?.status;
            if (!status) continue;
            
            let newStatus: string | null = null;
            if (status === 2) newStatus = 'sent';
            else if (status === 3) newStatus = 'delivered';
            else if (status === 4) newStatus = 'read';
            else if (status === 5) newStatus = 'played';
            
            if (newStatus) {
              const { whatsappDeliveryReports } = await import('@/lib/db/schema');
              const { eq, and } = await import('drizzle-orm');
              
              const updatedRows = await db
                .update(whatsappDeliveryReports)
                .set({ 
                  status: newStatus,
                  updatedAt: new Date()
                })
                .where(
                  and(
                    eq(whatsappDeliveryReports.providerMessageId, key.id),
                    eq(whatsappDeliveryReports.connectionId, connectionId)
                  )
                )
                .returning({ id: whatsappDeliveryReports.id });
              
              if (updatedRows.length > 0 && updatedRows[0]) {
                console.log(`[Baileys Receipt] ✅ Updated delivery report ${updatedRows[0].id} to status: ${newStatus}`);
                
                // NOVO: Emitir evento WebSocket para atualizar frontend em tempo real
                try {
                  const { getSocketIO } = await import('@/lib/socket');
                  const io = getSocketIO();
                  if (io) {
                    const campaignResult = await db
                      .select({ campaignId: whatsappDeliveryReports.campaignId })
                      .from(whatsappDeliveryReports)
                      .where(eq(whatsappDeliveryReports.id, updatedRows[0].id))
                      .limit(1);
                    
                    if (campaignResult.length > 0 && campaignResult[0]) {
                      const campaignId = campaignResult[0].campaignId;
                      io.to(`campaign:${campaignId}`).emit(`campaign:${campaignId}:delivery-report`, {
                        campaignId,
                        reportId: updatedRows[0].id,
                        status: newStatus,
                        updatedAt: new Date().toISOString(),
                      });
                    }
                  }
                } catch (error) {
                  console.warn('[Baileys Receipt] Failed to emit WebSocket event:', error);
                }
              }
            }
          } catch (error) {
            console.error('[Baileys Receipt] Error processing message update:', error);
          }
        }
      });
      
      console.log(`[Baileys] Session setup complete for ${connectionId}`);
    } catch (error) {
      console.error(`[Baileys] Error creating session ${connectionId}:`, error);
      this.sessions.delete(connectionId);
      
      await db
        .update(connections)
        .set({ 
          status: 'failed', 
          qrCode: null,
          isActive: false 
        })
        .where(eq(connections.id, connectionId));
      
      throw error;
    }
  }

  private async handleIncomingMessage(
    connectionId: string,
    companyId: string,
    msg: any
  ): Promise<void> {
    try {
      const remoteJid = msg.key.remoteJid || '';
      const phoneNumber = remoteJid.split('@')[0];
      
      let messageContent = '';
      let contentType = 'TEXT';
      let mediaUrl: string | null = null;

      const Baileys = await import('@whiskeysockets/baileys');
      const { uploadFileToS3 } = await import('@/lib/s3');
      const { v4: uuidv4 } = await import('uuid');

      if (msg.message?.conversation) {
        messageContent = msg.message.conversation;
        contentType = 'TEXT';
      } else if (msg.message?.extendedTextMessage) {
        messageContent = msg.message.extendedTextMessage.text || '';
        contentType = 'TEXT';
      } else if (msg.message?.imageMessage) {
        messageContent = msg.message.imageMessage.caption || '📷 Imagem';
        contentType = 'IMAGE';
        
        try {
          if (!msg.message.imageMessage.mediaKey || msg.message.imageMessage.mediaKey.length === 0) {
            if (DEBUG) console.log('[Baileys] Skipping image without media key (deleted/forwarded media)');
            messageContent = '📷 Imagem (indisponível)';
          } else {
            const buffer = await Baileys.downloadMediaMessage(msg, 'buffer', {});
            const s3Key = `zapmaster/${companyId}/media_recebida/${uuidv4()}.jpg`;
            mediaUrl = await uploadFileToS3(s3Key, buffer as Buffer, 'image/jpeg');
            console.log(`[Baileys] Image uploaded successfully: ${mediaUrl}`);
          }
        } catch (error: any) {
          console.error('[Baileys] Error downloading/uploading image:', error?.message || error);
          messageContent = '📷 Imagem (erro ao carregar)';
        }
      } else if (msg.message?.videoMessage) {
        messageContent = msg.message.videoMessage.caption || '📹 Vídeo';
        contentType = 'VIDEO';
        
        try {
          if (!msg.message.videoMessage.mediaKey || msg.message.videoMessage.mediaKey.length === 0) {
            if (DEBUG) console.log('[Baileys] Skipping video without media key (deleted/forwarded media)');
            messageContent = '📹 Vídeo (indisponível)';
          } else {
            const buffer = await Baileys.downloadMediaMessage(msg, 'buffer', {});
            const s3Key = `zapmaster/${companyId}/media_recebida/${uuidv4()}.mp4`;
            mediaUrl = await uploadFileToS3(s3Key, buffer as Buffer, 'video/mp4');
            console.log(`[Baileys] Video uploaded successfully: ${mediaUrl}`);
          }
        } catch (error: any) {
          console.error('[Baileys] Error downloading/uploading video:', error?.message || error);
          messageContent = '📹 Vídeo (erro ao carregar)';
        }
      } else if (msg.message?.audioMessage) {
        messageContent = '🎵 Áudio';
        contentType = 'AUDIO';
        
        try {
          if (!msg.message.audioMessage.mediaKey || msg.message.audioMessage.mediaKey.length === 0) {
            if (DEBUG) console.log('[Baileys] Skipping audio without media key (deleted/forwarded media)');
            messageContent = '🎵 Áudio (indisponível)';
          } else {
            const buffer = await Baileys.downloadMediaMessage(msg, 'buffer', {});
            const s3Key = `zapmaster/${companyId}/media_recebida/${uuidv4()}.ogg`;
            mediaUrl = await uploadFileToS3(s3Key, buffer as Buffer, 'audio/ogg');
            console.log(`[Baileys] Audio uploaded successfully: ${mediaUrl}`);
          }
        } catch (error: any) {
          console.error('[Baileys] Error downloading/uploading audio:', error?.message || error);
          messageContent = '🎵 Áudio (erro ao carregar)';
        }
      } else if (msg.message?.documentMessage) {
        const filename = msg.message.documentMessage.fileName || 'documento';
        messageContent = msg.message.documentMessage.caption || `📄 ${filename}`;
        contentType = 'DOCUMENT';
        
        try {
          if (!msg.message.documentMessage.mediaKey || msg.message.documentMessage.mediaKey.length === 0) {
            if (DEBUG) console.log('[Baileys] Skipping document without media key (deleted/forwarded media)');
            messageContent = `📄 ${filename} (indisponível)`;
          } else {
            const buffer = await Baileys.downloadMediaMessage(msg, 'buffer', {});
            const extension = filename.split('.').pop() || 'bin';
            const s3Key = `zapmaster/${companyId}/media_recebida/${uuidv4()}.${extension}`;
            const mimeType = msg.message.documentMessage.mimetype || 'application/octet-stream';
            mediaUrl = await uploadFileToS3(s3Key, buffer as Buffer, mimeType);
            console.log(`[Baileys] Document uploaded successfully: ${mediaUrl}`);
          }
        } catch (error: any) {
          console.error('[Baileys] Error downloading/uploading document:', error?.message || error);
          messageContent = `📄 ${filename} (erro ao carregar)`;
        }
      } else if (msg.message?.stickerMessage) {
        messageContent = '🎨 Sticker';
        contentType = 'STICKER';
        
        try {
          if (!msg.message.stickerMessage.mediaKey || msg.message.stickerMessage.mediaKey.length === 0) {
            if (DEBUG) console.log('[Baileys] Skipping sticker without media key (deleted/forwarded media)');
            messageContent = '🎨 Sticker (indisponível)';
          } else {
            const buffer = await Baileys.downloadMediaMessage(msg, 'buffer', {});
            const s3Key = `zapmaster/${companyId}/media_recebida/${uuidv4()}.webp`;
            mediaUrl = await uploadFileToS3(s3Key, buffer as Buffer, 'image/webp');
            console.log(`[Baileys] Sticker uploaded successfully: ${mediaUrl}`);
          }
        } catch (error: any) {
          console.error('[Baileys] Error downloading/uploading sticker:', error?.message || error);
          messageContent = '🎨 Sticker (erro ao carregar)';
        }
      } else if (msg.message?.reactionMessage) {
        const targetKey = msg.message.reactionMessage.key;
        const emoji = msg.message.reactionMessage.text;

        const targetMessageId = targetKey.id;
        const [targetMessage] = await db.select({ id: messages.id })
          .from(messages)
          .where(eq(messages.providerMessageId, targetMessageId))
          .limit(1);

        if (targetMessage) {
          if (!emoji || emoji === '') {
            await db.delete(messageReactions)
              .where(and(
                eq(messageReactions.messageId, targetMessage.id),
                eq(messageReactions.reactorPhone, phoneNumber)
              ));
            console.log(`[Baileys] Reação removida para mensagem ${targetMessage.id} por ${phoneNumber}`);
          } else {
            await db.insert(messageReactions)
              .values({
                messageId: targetMessage.id,
                reactorPhone: phoneNumber,
                reactorName: msg.pushName,
                emoji,
              })
              .onConflictDoUpdate({
                target: [messageReactions.messageId, messageReactions.reactorPhone],
                set: { emoji, reactorName: msg.pushName },
              });
            console.log(`[Baileys] Reação ${emoji} salva para mensagem ${targetMessage.id} por ${phoneNumber}`);
          }
        }
        return;
      } else {
        messageContent = 'Mensagem não suportada';
      }

      // Detect if this is a group/community using JID-first logic
      const { detectGroup } = await import('@/lib/utils/phone');
      const isGroup = detectGroup({ remoteJid, phone: phoneNumber });

      const [contact] = await db
        .insert(contacts)
        .values({
          companyId,
          name: msg.pushName || phoneNumber,
          phone: phoneNumber,
          whatsappName: msg.pushName,
          isGroup,
        })
        .onConflictDoUpdate({
          target: [contacts.phone, contacts.companyId],
          set: {
            whatsappName: msg.pushName || sql`${contacts.whatsappName}`,
            isGroup,
          },
        })
        .returning();

      if (!contact) {
        console.error('[Baileys] Failed to create/update contact');
        return;
      }

      // Check if conversation already exists for notification purposes
      const existingConversation = await db.query.conversations.findFirst({
        where: (convs, { and, eq }) => and(
          eq(convs.contactId, contact.id),
          eq(convs.connectionId, connectionId)
        ),
      });
      const isNewConversation = !existingConversation;

      const [conversation] = await db
        .insert(conversations)
        .values({
          companyId,
          contactId: contact.id,
          connectionId,
          status: 'NEW',
          lastMessageAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [conversations.contactId, conversations.connectionId],
          set: {
            lastMessageAt: new Date(),
            archivedAt: null,
          },
        })
        .returning();

      if (!conversation) {
        console.error('[Baileys] Failed to create/update conversation');
        return;
      }

      // Notify users about new conversation
      if (isNewConversation) {
        try {
          const { UserNotificationsService } = await import('@/lib/notifications/user-notifications.service');
          await UserNotificationsService.notifyNewConversation(
            companyId,
            conversation.id,
            contact.name || contact.whatsappName || contact.phone
          );
          console.log(`[UserNotifications] New conversation notification sent for ${conversation.id}`);
        } catch (notifError) {
          console.error('[UserNotifications] Error sending new conversation notification:', notifError);
        }
      }

      await db.insert(messages).values({
        conversationId: conversation.id,
        providerMessageId: msg.key.id,
        senderType: 'USER',
        content: messageContent,
        contentType,
        mediaUrl,
        status: 'received',
        sentAt: new Date(msg.messageTimestamp! * 1000),
      })
      .onConflictDoNothing({ target: [messages.providerMessageId] });

      console.log(`[Baileys] Message saved from ${phoneNumber}`);

      // Classificar tipo de chat usando função robusta
      const chatClassification = classifyChat(remoteJid, msg);
      
      console.log(`[Baileys Chat Classifier] Type: ${chatClassification.type} | Reason: ${chatClassification.reason} | Block AI: ${chatClassification.shouldBlockAI}`);
      
      // Auto-resposta AI apenas para chats individuais
      if (conversation.aiActive && messageContent.trim() && !chatClassification.shouldBlockAI) {
        await this.handleAIAutoResponse(
          connectionId,
          conversation.id,
          phoneNumber,
          messageContent,
          contact.name || contact.whatsappName || phoneNumber
        );
      } else if (chatClassification.shouldBlockAI && conversation.aiActive) {
        console.log(`[Baileys AI] 🚫 Blocked auto-response | Type: ${chatClassification.type} | Contact: ${phoneNumber} | Reason: ${chatClassification.reason}`);
      }
    } catch (error) {
      console.error('[Baileys] Error handling incoming message:', error);
    }
  }

  private async handleAIAutoResponse(
    connectionId: string,
    conversationId: string,
    phoneNumber: string,
    userMessage: string,
    contactName: string
  ): Promise<void> {
    try {
      console.log(`[Baileys AI] Generating auto-response for ${phoneNumber}`);

      // Buscar conversa E conexão para determinar agente IA e companyId
      const [conversationData] = await db
        .select({
          conversationPersonaId: conversations.assignedPersonaId,
          connectionPersonaId: connections.assignedPersonaId,
          companyId: conversations.companyId,
        })
        .from(conversations)
        .leftJoin(connections, eq(conversations.connectionId, connections.id))
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversationData) {
        console.log(`[Baileys AI] 🚫 Conversation ${conversationId} not found. Skipping auto-response.`);
        return;
      }

      // Buscar histórico recente de mensagens
      const recentMessages = await db.query.messages.findMany({
        where: eq(messages.conversationId, conversationId),
        orderBy: (messages, { desc }) => [desc(messages.sentAt)],
        limit: 6,
      });

      const conversationHistory = recentMessages
        .reverse()
        .map((msg) => ({
          role: msg.senderType === 'USER' ? ('user' as const) : ('assistant' as const),
          content: msg.content || '',
        }))
        .filter((msg) => msg.content.trim());

      // Determinar qual agente IA usar (prioridade: conversa > conexão)
      const personaId = conversationData.conversationPersonaId || conversationData.connectionPersonaId;

      if (!personaId) {
        console.log(`[Baileys AI] 🚫 No AI persona assigned to conversation or connection. Skipping auto-response.`);
        return;
      }

      // Buscar agente IA personalizado
      const [persona] = await db
        .select()
        .from(aiPersonas)
        .where(eq(aiPersonas.id, personaId))
        .limit(1);

      if (!persona) {
        console.log(`[Baileys AI] 🚫 Persona ${personaId} not found. Skipping auto-response.`);
        return;
      }

      const source = conversationData.conversationPersonaId ? 'conversation' : 'connection';
      console.log(`[Baileys AI] Using persona: ${persona.name} (from ${source})`);
      
      // Detectar se é primeira resposta das últimas 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentAIMessages = await db.query.messages.findMany({
        where: (messages, { and, eq, gte }) => and(
          eq(messages.conversationId, conversationId),
          eq(messages.senderType, 'AI'),
          gte(messages.sentAt, oneDayAgo)
        ),
        limit: 1,
      });

      const isFirstResponse = recentAIMessages.length === 0;
      
      // Calcular delay humanizado baseado na configuração do agente
      let minDelay = isFirstResponse ? persona.firstResponseMinDelay : persona.followupResponseMinDelay;
      let maxDelay = isFirstResponse ? persona.firstResponseMaxDelay : persona.followupResponseMaxDelay;
      
      // Guard: garantir que min <= max (corrigir ranges malformados)
      if (minDelay > maxDelay) {
        console.warn(`[Baileys AI] ⚠️  Invalid delay range detected (min: ${minDelay}, max: ${maxDelay}). Swapping values.`);
        [minDelay, maxDelay] = [maxDelay, minDelay];
      }
      
      const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      
      const responseType = isFirstResponse ? 'primeira resposta (24h)' : 'demais respostas';
      console.log(`[Baileys AI] Delay humanizado: ${randomDelay}s (${responseType}, range: ${minDelay}-${maxDelay}s)`);
      
      // Aplicar delay antes de gerar resposta
      await new Promise(resolve => setTimeout(resolve, randomDelay * 1000));
      
      const { openAIService } = await import('./ai/openai-service');
      
      // Implementar retry com backoff exponencial
      let aiResponse: string | null = null;
      let _lastError: Error | null = null;
      const maxRetries = 3;
      const baseDelay = 2000; // 2 segundos
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[Baileys AI] Attempting to generate response (attempt ${attempt}/${maxRetries})`);
          aiResponse = await openAIService.generateResponseWithPersona(
            userMessage,
            contactName,
            conversationHistory,
            persona
          );
          console.log(`[Baileys AI] ✅ Response generated successfully on attempt ${attempt}`);
          break;
        } catch (error) {
          _lastError = error as Error;
          const statusCode = (error as any)?.status || (error as any)?.code;
          const errorType = (error as any)?.error?.type || (error as any)?.type || (error as any)?.code;
          
          const isInsufficientQuota = errorType === 'insufficient_quota' || 
            (error as any)?.error?.code === 'insufficient_quota';
          const isRateLimit = (statusCode === 429 && !isInsufficientQuota) || 
            errorType === 'rate_limit_error';
          
          if (isInsufficientQuota) {
            console.error(`[Baileys AI] ❌ QUOTA ESGOTADA: A chave OpenAI não tem créditos suficientes. Usando fallback imediato.`);
            console.error(`[Baileys AI] 💡 Ação necessária: Verificar billing em https://platform.openai.com/account/billing`);
            
            // Notificar admin sobre quota esgotada (fire-and-forget)
            if (conversationData.companyId) {
              import('@/lib/notifications/user-notifications.service').then(({ UserNotificationsService }) => {
                UserNotificationsService.notifyOpenAIQuotaExhausted(
                  conversationData.companyId,
                  persona.name
                ).catch(err => console.error('[Baileys AI] Erro ao notificar quota:', err));
              });
            }
            
            aiResponse = `Olá! No momento estou com uma limitação temporária. Por favor, tente novamente em alguns minutos ou entre em contato diretamente pelo nosso canal de atendimento.`;
            break;
          } else if (isRateLimit && attempt < maxRetries) {
            const backoffDelay = baseDelay * Math.pow(2, attempt - 1);
            console.warn(`[Baileys AI] ⚠️  Rate limit temporário (429) na tentativa ${attempt}. Retry em ${backoffDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          } else if (attempt === maxRetries) {
            console.error(`[Baileys AI] ❌ Falha ao gerar resposta após ${maxRetries} tentativas. Usando fallback.`);
            aiResponse = `Desculpe, estou processando sua mensagem. Por favor, tente novamente em breve.`;
          } else {
            throw error;
          }
        }
      }

      // Garantir que temos uma resposta (usando fallback se necessário)
      if (!aiResponse) {
        aiResponse = `Desculpe, estou processando sua mensagem. Por favor, tente novamente em breve.`;
      }

      // Enviar resposta via WhatsApp
      const messageId = await this.sendMessage(connectionId, phoneNumber, {
        text: aiResponse,
      });

      if (messageId) {
        // Salvar mensagem da AI no banco
        await db.insert(messages).values({
          conversationId,
          providerMessageId: messageId,
          senderType: 'AI',
          content: aiResponse,
          contentType: 'TEXT',
          status: 'sent',
          sentAt: new Date(),
        });

        await db
          .update(conversations)
          .set({ lastMessageAt: new Date() })
          .where(eq(conversations.id, conversationId));

        console.log(`[Baileys AI] Auto-response sent to ${phoneNumber}`);
      } else {
        console.error(`[Baileys AI] Failed to send auto-response to ${phoneNumber}`);
      }
    } catch (error) {
      console.error('[Baileys AI] Error in auto-response:', error);
    }
  }

  async sendMessage(
    connectionId: string,
    to: string,
    content: any
  ): Promise<string | null> {
    console.log(`[SessionManager] Attempting to send message via connection ${connectionId} to ${to}`);
    
    const sessionData = this.sessions.get(connectionId);
    
    if (!sessionData) {
      console.error(`[SessionManager] ❌ Session ${connectionId} not found in SessionManager`);
      console.log(`[SessionManager] Available sessions: ${Array.from(this.sessions.keys()).join(', ') || 'none'}`);
      return null;
    }
    
    if (sessionData.status !== 'connected') {
      console.error(`[SessionManager] ❌ Session ${connectionId} not connected. Current status: ${sessionData.status}`);
      return null;
    }

    try {
      // Remove o símbolo '+' se presente, pois o WhatsApp não aceita no JID
      const cleanNumber = to.replace(/^\+/, '');
      const jid = cleanNumber.includes('@') ? cleanNumber : `${cleanNumber}@s.whatsapp.net`;
      console.log(`[SessionManager] Sending to JID: ${jid}`);
      
      const sent = await sessionData.socket.sendMessage(jid, content);
      const messageId = sent?.key?.id || null;
      
      if (messageId) {
        if (DEBUG) console.log(`[SessionManager] ✅ Message sent successfully to ${to}: ${messageId}`);
      } else {
        console.warn(`[SessionManager] ⚠️  Message sent but no ID returned for ${to}`);
      }
      
      return messageId;
    } catch (error) {
      console.error(`[SessionManager] ❌ Error sending message to ${to}:`, error);
      console.error(`[SessionManager] Error details:`, {
        connectionId,
        to,
        contentType: typeof content,
        sessionStatus: sessionData.status,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  async validateWhatsAppNumber(
    connectionId: string,
    phoneNumber: string
  ): Promise<{ exists: boolean; jid?: string; error?: string }> {
    const sessionData = this.sessions.get(connectionId);
    
    if (!sessionData) {
      return { exists: false, error: 'Sessão não encontrada' };
    }
    
    if (sessionData.status !== 'connected') {
      return { exists: false, error: `Sessão não conectada: ${sessionData.status}` };
    }

    try {
      const cleanNumber = phoneNumber.replace(/^\+/, '').replace(/\D/g, '');
      
      const results = await sessionData.socket.onWhatsApp(cleanNumber);
      const result = results?.[0];
      
      if (result?.exists) {
        console.log(`[SessionManager] ✅ Número válido: ${phoneNumber} → ${result.jid}`);
        return { exists: true, jid: result.jid };
      } else {
        console.log(`[SessionManager] ❌ Número não registrado no WhatsApp: ${phoneNumber}`);
        return { exists: false, error: 'Número não registrado no WhatsApp' };
      }
    } catch (error) {
      console.error(`[SessionManager] Erro ao validar número ${phoneNumber}:`, error);
      return { exists: false, error: (error as Error).message };
    }
  }

  async deleteSession(connectionId: string): Promise<void> {
    const sessionData = this.sessions.get(connectionId);
    
    if (sessionData) {
      try {
        await sessionData.socket?.logout();
      } catch (error) {
        console.error('[Baileys] Error during logout:', error);
      }
      
      sessionData.socket?.end(undefined);
      
      if (sessionData.phone) {
        const mappedConnectionId = this.phoneToConnectionMap.get(sessionData.phone);
        if (mappedConnectionId === connectionId) {
          this.phoneToConnectionMap.delete(sessionData.phone);
          console.log(`[Baileys] 🗑️  Cleared phone mapping for ${sessionData.phone}`);
        }
      }
      
      if (this.messageQueue.has(connectionId)) {
        const queueSize = this.messageQueue.get(connectionId)?.length || 0;
        this.messageQueue.delete(connectionId);
        console.log(`[Baileys] 🗑️  Cleared message queue (${queueSize} messages) for ${connectionId}`);
      }
      
      this.sessions.delete(connectionId);
      console.log(`[Baileys] Session ${connectionId} deleted`);
    }

    await db
      .update(connections)
      .set({ status: 'disconnected', isActive: false })
      .where(eq(connections.id, connectionId));
  }

  getSession(connectionId: string): SessionData | undefined {
    const session = this.sessions.get(connectionId);
    
    if (!session) {
      console.warn(`[SessionManager] ⚠️  Session not found for connectionId: ${connectionId}`);
      console.log(`[SessionManager] Available sessions: ${Array.from(this.sessions.keys()).join(', ') || 'none'}`);
    }
    
    return session;
  }

  getSessionStatus(connectionId: string): 'connecting' | 'connected' | 'disconnected' | 'qr' | 'failed' | null {
    const session = this.sessions.get(connectionId);
    if (!session) {
      return null;
    }
    return session.status;
  }

  async hasFilesystemAuth(connectionId: string): Promise<boolean> {
    try {
      const authPath = this.getAuthPath(connectionId);
      const fs = await import('fs/promises');
      await fs.access(authPath);
      const files = await fs.readdir(authPath);
      
      const hasCreds = files.some(f => f.includes('creds') || f.includes('auth'));
      if (!hasCreds) {
        console.log(`[Baileys] hasFilesystemAuth: Directory exists but no auth files for ${connectionId}`);
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  async ensureSession(connectionId: string, companyId: string): Promise<{
    success: boolean;
    status: 'connected' | 'connecting' | 'qr' | 'needs_qr' | 'failed';
    message: string;
  }> {
    const existingSession = this.sessions.get(connectionId);
    if (existingSession) {
      console.log(`[Baileys] ensureSession: Session ${connectionId} already in memory with status: ${existingSession.status}`);
      return {
        success: existingSession.status === 'connected',
        status: existingSession.status as any,
        message: `Session exists with status: ${existingSession.status}`,
      };
    }

    const hasAuth = await this.hasFilesystemAuth(connectionId);
    
    if (hasAuth) {
      console.log(`[Baileys] ensureSession: Found auth files for ${connectionId}, attempting to restore...`);
      try {
        await this.createSession(connectionId, companyId);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const restoredSession = this.sessions.get(connectionId);
        if (restoredSession?.status === 'connected') {
          console.log(`[Baileys] ensureSession: Session ${connectionId} restored and connected`);
          return {
            success: true,
            status: 'connected',
            message: 'Session restored from filesystem auth',
          };
        }
        
        return {
          success: false,
          status: restoredSession?.status as any || 'qr',
          message: 'Session restored but awaiting connection',
        };
      } catch (error) {
        console.error(`[Baileys] ensureSession: Error restoring session ${connectionId}:`, error);
        return {
          success: false,
          status: 'failed',
          message: `Error restoring session: ${(error as Error).message}`,
        };
      }
    } else {
      console.log(`[Baileys] ensureSession: No auth files for ${connectionId}, needs QR scan`);
      
      await db
        .update(connections)
        .set({ status: 'disconnected' })
        .where(eq(connections.id, connectionId));
      
      return {
        success: false,
        status: 'needs_qr',
        message: 'No authentication found. Please scan QR code to connect.',
      };
    }
  }

  getEventEmitter(connectionId: string): EventEmitter | undefined {
    console.log(`[SessionManager] Getting emitter for ${connectionId}. Total sessions in map:`, this.sessions.size);
    console.log(`[SessionManager] Session IDs in map:`, Array.from(this.sessions.keys()));
    return this.sessions.get(connectionId)?.emitter;
  }

  getAllSessions(): Array<{ id: string; status: string; phone?: string }> {
    return Array.from(this.sessions.entries()).map(([id, data]) => ({
      id,
      status: data.status,
      phone: data.phone,
    }));
  }

  checkAvailability(connectionId: string, companyId?: string): {
    available: boolean;
    status: string;
    details: string;
  } {
    const logContext = companyId ? `[Company: ${companyId.slice(0, 8)}]` : '';
    console.log(`[SessionManager] ${logContext} Checking availability for connection ${connectionId}`);
    
    const session = this.sessions.get(connectionId);
    
    if (!session) {
      console.warn(`[SessionManager] ${logContext} ❌ Connection ${connectionId} not found`);
      console.log(`[SessionManager] ${logContext} Total active sessions: ${this.sessions.size}`);
      console.log(`[SessionManager] ${logContext} Available sessions: ${Array.from(this.sessions.keys()).join(', ') || 'none'}`);
      
      return {
        available: false,
        status: 'not_found',
        details: `Session ${connectionId} does not exist in SessionManager`
      };
    }
    
    const isConnected = session.status === 'connected';
    const statusEmoji = isConnected ? '✅' : '⚠️';
    
    console.log(`[SessionManager] ${logContext} ${statusEmoji} Connection ${connectionId}: ${session.status}${session.phone ? ` (${session.phone})` : ''}`);
    
    return {
      available: isConnected,
      status: session.status,
      details: `Session ${connectionId} status: ${session.status}, phone: ${session.phone || 'unknown'}`
    };
  }

  private sessionLockAcquired = false;
  private lockHeartbeatInterval: NodeJS.Timeout | null = null;
  private readonly SESSION_LOCK_KEY = 'baileys:session:lock';
  private readonly SESSION_LOCK_TTL = 30; // 30 seconds TTL
  private readonly LOCK_HEARTBEAT_INTERVAL = 10000; // Renew every 10 seconds

  private lockId: string | null = null;
  private shutdownHandlersRegistered = false;

  private async tryAcquireSessionLock(): Promise<boolean> {
    try {
      const redisModule = await import('@/lib/redis');
      const redis = redisModule.redis;
      
      this.lockId = `${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      // Check for stale/orphaned locks first
      const existingLock = await redis.get(this.SESSION_LOCK_KEY);
      if (existingLock) {
        // Check TTL - if TTL is -1 (no expiry) or very high, it's likely orphaned
        const ttl = await redis.ttl(this.SESSION_LOCK_KEY);
        if (ttl === -1 || ttl > this.SESSION_LOCK_TTL * 2) {
          console.log(`[Baileys Lock] ⚠️ Found orphaned lock (TTL: ${ttl}), forcing cleanup`);
          await redis.del(this.SESSION_LOCK_KEY);
        } else if (ttl > 0) {
          console.log(`[Baileys Lock] ⏳ Another process owns the lock (TTL: ${ttl}s), skipping`);
          return false;
        }
      }
      
      // Atomic SET with NX (only set if not exists) and EX (expiry)
      // This prevents race conditions between check and set
      const setResult = await redis.set(this.SESSION_LOCK_KEY, this.lockId, 'EX', this.SESSION_LOCK_TTL);
      
      // Verify we got the lock
      const verifyLock = await redis.get(this.SESSION_LOCK_KEY);
      if (verifyLock !== this.lockId) {
        console.log('[Baileys Lock] ⏳ Lost race condition, another process got the lock');
        return false;
      }
      
      console.log(`[Baileys Lock] ✅ Acquired session lock (ID: ${this.lockId})`);
      this.sessionLockAcquired = true;
      
      // Register shutdown handlers to release lock on exit
      if (!this.shutdownHandlersRegistered) {
        const cleanup = async () => {
          console.log('[Baileys Lock] 🛑 Shutdown detected, releasing lock...');
          await this.releaseSessionLock();
        };
        
        process.once('SIGINT', cleanup);
        process.once('SIGTERM', cleanup);
        process.once('exit', () => {
          // Sync cleanup on exit (best effort)
          if (this.lockHeartbeatInterval) {
            clearInterval(this.lockHeartbeatInterval);
            this.lockHeartbeatInterval = null;
          }
        });
        this.shutdownHandlersRegistered = true;
      }
      
      // Start heartbeat to renew lock (only if TTL is getting low)
      this.lockHeartbeatInterval = setInterval(async () => {
        try {
          const currentValue = await redis.get(this.SESSION_LOCK_KEY);
          if (currentValue === this.lockId) {
            const currentTtl = await redis.ttl(this.SESSION_LOCK_KEY);
            // Only renew if TTL is less than half the original
            if (currentTtl < this.SESSION_LOCK_TTL / 2) {
              await redis.expire(this.SESSION_LOCK_KEY, this.SESSION_LOCK_TTL);
              if (DEBUG) console.log('[Baileys Lock] 💓 Lock heartbeat renewed');
            }
          } else {
            console.warn('[Baileys Lock] ⚠️ Lock was taken by another process, stopping heartbeat');
            if (this.lockHeartbeatInterval) {
              clearInterval(this.lockHeartbeatInterval);
              this.lockHeartbeatInterval = null;
            }
            this.sessionLockAcquired = false;
          }
        } catch (error) {
          console.error('[Baileys Lock] Error renewing heartbeat:', error);
        }
      }, this.LOCK_HEARTBEAT_INTERVAL);
      
      return true;
    } catch (error) {
      console.error('[Baileys Lock] Error acquiring lock:', error);
      // In case of Redis failure, allow this process to proceed
      console.log('[Baileys Lock] ⚠️ Proceeding without distributed lock (Redis unavailable)');
      return true;
    }
  }

  async releaseSessionLock(): Promise<void> {
    try {
      if (this.lockHeartbeatInterval) {
        clearInterval(this.lockHeartbeatInterval);
        this.lockHeartbeatInterval = null;
      }
      
      if (this.sessionLockAcquired && this.lockId) {
        const redisModule = await import('@/lib/redis');
        const redis = redisModule.redis;
        
        // Only delete if we own the lock (compare-and-delete)
        const currentValue = await redis.get(this.SESSION_LOCK_KEY);
        if (currentValue === this.lockId) {
          await redis.del(this.SESSION_LOCK_KEY);
          console.log('[Baileys Lock] 🔓 Released session lock');
        } else {
          console.log('[Baileys Lock] ℹ️ Lock already released or taken by another process');
        }
        this.sessionLockAcquired = false;
        this.lockId = null;
      }
    } catch (error) {
      console.error('[Baileys Lock] Error releasing lock:', error);
    }
  }

  async initializeSessions(): Promise<void> {
    try {
      const baileysEnabled = process.env.BAILEYS_SESSIONS_ENABLED === 'true';
      
      if (!baileysEnabled) {
        console.log('[Baileys] ⏸️  Sessions disabled in this environment (BAILEYS_SESSIONS_ENABLED != true)');
        console.log('[Baileys] ℹ️  Only production environment connects to WhatsApp sessions');
        return;
      }
      
      const currentEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';
      console.log(`[Baileys] 🌍 Environment: ${currentEnv}`);
      
      // Try to acquire distributed lock before initializing sessions
      const hasLock = await this.tryAcquireSessionLock();
      if (!hasLock) {
        console.log('[Baileys] ⏭️  Skipping session initialization - another process owns the lock');
        return;
      }
      
      if (DEBUG) console.log('[Baileys] Initializing sessions from database...');
      
      const existingConnections = await db.query.connections.findMany({
        where: and(
          eq(connections.connectionType, 'baileys'),
          eq(connections.isActive, true),
          eq(connections.environment, currentEnv)
        ),
      });

      console.log(`[Baileys] Found ${existingConnections.length} active sessions to restore (env: ${currentEnv})`);

      for (const connection of existingConnections) {
        try {
          const fs = await import('fs/promises');
          const authPath = this.getAuthPath(connection.id);
          
          await fs.access(authPath);
          console.log(`[Baileys] Restoring session ${connection.id} (${connection.config_name})`);
          
          await this.createSession(connection.id, connection.companyId);
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            console.log(`[Baileys] Auth not found for ${connection.id}, marking as disconnected`);
            await db
              .update(connections)
              .set({ status: 'disconnected', isActive: false })
              .where(eq(connections.id, connection.id));
          } else {
            console.error(`[Baileys] Error restoring session ${connection.id}:`, error);
          }
        }
      }

      if (DEBUG) console.log('[Baileys] Session initialization complete');
    } catch (error) {
      console.error('[Baileys] Error during session initialization:', error);
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __BAILEYS_SESSION_MANAGER: BaileysSessionManager | undefined;
  // eslint-disable-next-line no-var
  var __BAILEYS_INSTANCE_ID: string | undefined;
  // eslint-disable-next-line no-var
  var __BAILEYS_INIT_STARTED: boolean | undefined;
}

const BAILEYS_MANAGER_KEY = Symbol.for('baileys_session_manager');
const BAILEYS_INSTANCE_KEY = Symbol.for('baileys_instance_id');
const BAILEYS_INIT_KEY = Symbol.for('baileys_init_started');

function getOrCreateSessionManager(): BaileysSessionManager {
  const globalObj = global as any;
  
  if (globalObj[BAILEYS_MANAGER_KEY] && globalObj[BAILEYS_INSTANCE_KEY]) {
    console.log(`[Baileys] Reusing existing SessionManager (ID: ${globalObj[BAILEYS_INSTANCE_KEY]})`);
    return globalObj[BAILEYS_MANAGER_KEY];
  }
  
  if (global.__BAILEYS_SESSION_MANAGER && global.__BAILEYS_INSTANCE_ID) {
    console.log(`[Baileys] Reusing existing SessionManager (ID: ${global.__BAILEYS_INSTANCE_ID}) [fallback]`);
    return global.__BAILEYS_SESSION_MANAGER;
  }

  const instanceId = `sm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  console.log(`[Baileys] Creating new SessionManager singleton (ID: ${instanceId})`);
  const manager = new BaileysSessionManager();
  
  globalObj[BAILEYS_MANAGER_KEY] = manager;
  globalObj[BAILEYS_INSTANCE_KEY] = instanceId;
  global.__BAILEYS_SESSION_MANAGER = manager;
  global.__BAILEYS_INSTANCE_ID = instanceId;
  
  if (DEBUG) console.log('[Baileys] SessionManager instance created and stored globally (Symbol + Direct)');
  
  if (typeof window === 'undefined') {
    const initAlreadyStarted = globalObj[BAILEYS_INIT_KEY] || global.__BAILEYS_INIT_STARTED;
    
    if (initAlreadyStarted) {
      console.log('[Baileys] ⏳ Session initialization already started by another worker, skipping...');
    } else {
      globalObj[BAILEYS_INIT_KEY] = true;
      global.__BAILEYS_INIT_STARTED = true;
      
      if (DEBUG) console.log('[Baileys] Starting automatic session restoration...');
      manager.initializeSessions().catch(err => {
        console.error('[Baileys] Failed to auto-restore sessions:', err);
      });
    }
  }
  
  return manager;
}

export const sessionManager = getOrCreateSessionManager();
