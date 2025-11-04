import makeWASocket, {
  DisconnectReason,
  WASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  Browsers,
  delay,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { EventEmitter } from 'events';
import { useDatabaseAuthState } from './baileys-auth-db';
import { db } from '@/lib/db';
import { connections, conversations, messages, contacts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import pino from 'pino';

const logger = pino({ level: 'silent' });

interface SessionData {
  socket: WASocket;
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

  async createSession(connectionId: string, companyId: string): Promise<void> {
    try {
      if (this.sessions.has(connectionId)) {
        console.log(`[Baileys] Session ${connectionId} already exists`);
        return;
      }

      console.log(`[Baileys] Creating new session for connection ${connectionId}`);
      
      const emitter = new EventEmitter();
      
      console.log(`[Baileys] Fetching Baileys version...`);
      const { version } = await fetchLatestBaileysVersion();
      console.log(`[Baileys] Using version:`, version);
      
      console.log(`[Baileys] Loading auth state...`);
      const { state, saveCreds } = await useDatabaseAuthState(connectionId);
      console.log(`[Baileys] Auth state loaded, creds exists:`, !!state.creds);

      const sessionData: SessionData = {
        socket: null as any,
        emitter,
        status: 'connecting',
        retryCount: 0,
      };

      this.sessions.set(connectionId, sessionData);

      console.log(`[Baileys] Creating WASocket...`);
      const sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        logger,
        browser: Browsers.macOS('Master IA'),
        defaultQueryTimeoutMs: 60000,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
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
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(`[Baileys] Connection closed for ${connectionId}. Status code: ${statusCode}, Error: ${errorMessage}`);

            if (statusCode === undefined || statusCode === 500) {
              console.log(`[Baileys] Unexpected closure (statusCode: ${statusCode}). Not retrying to avoid infinite loop.`);
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
              
              await delay(this.RECONNECT_INTERVAL);
              this.sessions.delete(connectionId);
              await this.createSession(connectionId, companyId);
            } else {
              sessionData.status = statusCode === DisconnectReason.loggedOut ? 'disconnected' : 'failed';
              
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

      let contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.phone, phoneNumber),
          eq(contacts.companyId, companyId)
        ),
      });

      if (!contact) {
        const [newContact] = await db
          .insert(contacts)
          .values({
            companyId,
            name: msg.pushName || phoneNumber,
            phone: phoneNumber,
            whatsappName: msg.pushName,
          })
          .returning();
        contact = newContact;
      }

      let conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.contactId, contact!.id),
          eq(conversations.connectionId, connectionId)
        ),
      });

      if (!conversation) {
        const [newConv] = await db
          .insert(conversations)
          .values({
            companyId,
            contactId: contact!.id,
            connectionId,
            status: 'NEW',
            lastMessageAt: new Date(),
          })
          .returning();
        conversation = newConv;
      } else {
        await db
          .update(conversations)
          .set({ lastMessageAt: new Date(), archivedAt: null })
          .where(eq(conversations.id, conversation.id));
      }

      await db.insert(messages).values({
        conversationId: conversation!.id,
        providerMessageId: msg.key.id,
        senderType: 'USER',
        content: messageContent,
        contentType: msg.message?.imageMessage ? 'IMAGE' : 'TEXT',
        mediaUrl: msg.message?.imageMessage?.url,
        status: 'received',
        sentAt: new Date(msg.messageTimestamp! * 1000),
      });

      console.log(`[Baileys] Message saved from ${phoneNumber}`);
    } catch (error) {
      console.error('[Baileys] Error handling incoming message:', error);
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
    return this.sessions.get(connectionId)?.emitter;
  }

  getAllSessions(): Array<{ id: string; status: string; phone?: string }> {
    return Array.from(this.sessions.entries()).map(([id, data]) => ({
      id,
      status: data.status,
      phone: data.phone,
    }));
  }
}

export const sessionManager = new BaileysSessionManager();
