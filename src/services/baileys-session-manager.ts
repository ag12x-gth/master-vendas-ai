import { Boom } from '@hapi/boom';
import { EventEmitter } from 'events';
import { db } from '@/lib/db';
import { connections, conversations, messages, contacts, aiPersonas, messageReactions } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import pino from 'pino';
import path from 'path';

const logger = pino({ level: 'silent' });

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
  
  if (jidLower.includes('@s.whatsapp.net') && digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return { 
      type: 'individual', 
      reason: 'Valid individual chat (10-15 digits, @s.whatsapp.net)', 
      shouldBlockAI: false 
    };
  }
  
  return { 
    type: 'unknown', 
    reason: 'Could not classify chat type', 
    shouldBlockAI: true 
  };
}

class BaileysSessionManager {
  private sessions = new Map<string, SessionData>();
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
    try {
      if (this.sessions.has(connectionId)) {
        console.log(`[Baileys] Session ${connectionId} already exists`);
        return;
      }

      console.log(`[Baileys] Creating new session for connection ${connectionId}`);
      
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
            console.log(`[Baileys] Connected successfully: ${connectionId}`);
            sessionData.status = 'connected';
            sessionData.retryCount = 0;

            const phoneNumber = sock.user?.id?.split(':')[0] || '';
            sessionData.phone = phoneNumber;

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

          await this.handleIncomingMessage(connectionId, companyId, msg);
        }
      });

      sock.ev.on('creds.update', saveCreds);
      
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
            console.log('[Baileys] Skipping image without media key (deleted/forwarded media)');
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
            console.log('[Baileys] Skipping video without media key (deleted/forwarded media)');
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
            console.log('[Baileys] Skipping audio without media key (deleted/forwarded media)');
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
            console.log('[Baileys] Skipping document without media key (deleted/forwarded media)');
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
            console.log('[Baileys] Skipping sticker without media key (deleted/forwarded media)');
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

      // Buscar conversa E conexão para determinar agente IA
      const [conversationData] = await db
        .select({
          conversationPersonaId: conversations.assignedPersonaId,
          connectionPersonaId: connections.assignedPersonaId,
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
      
      const { openAIService } = await import('./ai/openai-service');
      const aiResponse = await openAIService.generateResponseWithPersona(
        userMessage,
        contactName,
        conversationHistory,
        persona
      );

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
        console.log(`[SessionManager] ✅ Message sent successfully to ${to}: ${messageId}`);
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

  async deleteSession(connectionId: string): Promise<void> {
    const sessionData = this.sessions.get(connectionId);
    
    if (sessionData) {
      try {
        await sessionData.socket?.logout();
      } catch (error) {
        console.error('[Baileys] Error during logout:', error);
      }
      
      sessionData.socket?.end(undefined);
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

  async initializeSessions(): Promise<void> {
    try {
      console.log('[Baileys] Initializing sessions from database...');
      
      const existingConnections = await db.query.connections.findMany({
        where: and(
          eq(connections.connectionType, 'baileys'),
          eq(connections.isActive, true)
        ),
      });

      console.log(`[Baileys] Found ${existingConnections.length} active sessions to restore`);

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

      console.log('[Baileys] Session initialization complete');
    } catch (error) {
      console.error('[Baileys] Error during session initialization:', error);
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var baileysSessionManager: BaileysSessionManager | undefined;
}

export const sessionManager = global.baileysSessionManager || new BaileysSessionManager();

if (!global.baileysSessionManager) {
  global.baileysSessionManager = sessionManager;
  console.log('[Baileys] SessionManager instance created and stored globally');
}
