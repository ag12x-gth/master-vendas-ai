import { Boom } from '@hapi/boom';
import { EventEmitter } from 'events';
import { db } from '@/lib/db';
import { connections, conversations, messages, contacts, aiPersonas } from '@/lib/db/schema';
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
      
      const messageContent =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        '';

      const [contact] = await db
        .insert(contacts)
        .values({
          companyId,
          name: msg.pushName || phoneNumber,
          phone: phoneNumber,
          whatsappName: msg.pushName,
        })
        .onConflictDoUpdate({
          target: [contacts.phone, contacts.companyId],
          set: {
            whatsappName: msg.pushName || sql`${contacts.whatsappName}`,
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
        contentType: msg.message?.imageMessage ? 'IMAGE' : 'TEXT',
        mediaUrl: msg.message?.imageMessage?.url,
        status: 'received',
        sentAt: new Date(msg.messageTimestamp! * 1000),
      });

      console.log(`[Baileys] Message saved from ${phoneNumber}`);

      // Verificar se é um grupo (grupos têm @g.us no remoteJid)
      const isGroup = remoteJid.includes('@g.us');
      
      // Auto-resposta AI se habilitada E não for grupo
      if (conversation.aiActive && messageContent.trim() && !isGroup) {
        await this.handleAIAutoResponse(
          connectionId,
          conversation.id,
          phoneNumber,
          messageContent,
          contact.name || contact.whatsappName || phoneNumber
        );
      } else if (isGroup && conversation.aiActive) {
        console.log(`[Baileys AI] Skipping auto-response for group: ${phoneNumber}`);
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

      // Buscar conversa com agente IA vinculado
      const [conversation] = await db
        .select({
          assignedPersonaId: conversations.assignedPersonaId,
        })
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

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

      let aiResponse: string;

      // Se tem agente IA personalizado vinculado, usar ele
      if (conversation?.assignedPersonaId) {
        const [persona] = await db
          .select()
          .from(aiPersonas)
          .where(eq(aiPersonas.id, conversation.assignedPersonaId))
          .limit(1);

        if (persona) {
          console.log(`[Baileys AI] Using persona: ${persona.name}`);
          const { openAIService } = await import('./ai/openai-service');
          aiResponse = await openAIService.generateResponseWithPersona(
            userMessage,
            contactName,
            conversationHistory,
            persona
          );
        } else {
          // Fallback para genérico se persona não existir mais
          const { openAIService } = await import('./ai/openai-service');
          aiResponse = await openAIService.generateResponse(
            userMessage,
            contactName,
            conversationHistory
          );
        }
      } else {
        // Sem agente personalizado, usar genérico
        const { openAIService } = await import('./ai/openai-service');
        aiResponse = await openAIService.generateResponse(
          userMessage,
          contactName,
          conversationHistory
        );
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
    const sessionData = this.sessions.get(connectionId);
    
    if (!sessionData || sessionData.status !== 'connected') {
      console.error(`[Baileys] Session ${connectionId} not connected`);
      return null;
    }

    try {
      const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      const sent = await sessionData.socket.sendMessage(jid, content);
      console.log(`[Baileys] Message sent to ${to}:`, sent?.key?.id);
      return sent?.key?.id || null;
    } catch (error) {
      console.error('[Baileys] Error sending message:', error);
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
    return this.sessions.get(connectionId);
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
  var baileysSessionManager: BaileysSessionManager | undefined;
}

export const sessionManager = global.baileysSessionManager || new BaileysSessionManager();

if (!global.baileysSessionManager) {
  global.baileysSessionManager = sessionManager;
  console.log('[Baileys] SessionManager instance created and stored globally');
}
