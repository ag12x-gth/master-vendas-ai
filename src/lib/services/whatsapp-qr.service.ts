import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  proto,
  useMultiFileAuthState,
  WASocket,
  AnyMessageContent,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import { Server as SocketIOServer } from 'socket.io';
import { db } from '../db';
import { whatsappQrSessions, messages, conversations, contacts } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import path from 'path';
import fs from 'fs/promises';

interface SessionConfig {
  connectionId: string;
  companyId: string;
}

interface ActiveSession {
  socket: WASocket;
  config: SessionConfig;
  store?: ReturnType<typeof makeInMemoryStore>;
}

export class WhatsAppQRService {
  private static instance: WhatsAppQRService;
  private sessions: Map<string, ActiveSession> = new Map();
  private io?: SocketIOServer;
  
  private constructor() {}

  static getInstance(): WhatsAppQRService {
    if (!WhatsAppQRService.instance) {
      WhatsAppQRService.instance = new WhatsAppQRService();
    }
    return WhatsAppQRService.instance;
  }

  setSocketIO(io: SocketIOServer) {
    this.io = io;
    console.log('[WhatsApp QR] Socket.IO instance set successfully');
  }

  private getSessionPath(connectionId: string): string {
    return path.join(process.cwd(), 'whatsapp_sessions', connectionId);
  }

  async connectSession(connectionId: string, companyId: string): Promise<void> {
    console.log(`[WhatsApp QR] ====== STARTING NEW CONNECTION ======`);
    console.log(`[WhatsApp QR] Connection ID: ${connectionId}`);
    console.log(`[WhatsApp QR] Company ID: ${companyId}`);
    console.log(`[WhatsApp QR] Timestamp: ${new Date().toISOString()}`);
    
    if (this.sessions.has(connectionId)) {
      console.log(`[WhatsApp QR] Session already active for connection ${connectionId}`);
      return;
    }
    
    // Aguardar Socket.IO estar pronto
    let retries = 0;
    while (!this.io && retries < 10) {
      console.log(`[WhatsApp QR] Waiting for Socket.IO initialization... (${retries + 1}/10)`);
      await new Promise(resolve => setTimeout(resolve, 500));
      retries++;
    }
    
    if (!this.io) {
      console.error('[WhatsApp QR] ERROR: Socket.IO not initialized after 5 seconds');
      // Continue anyway, Socket.IO will be set later
    }

    const sessionPath = this.getSessionPath(connectionId);
    
    // Ensure directory exists
    await fs.mkdir(sessionPath, { recursive: true });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const versionInfo = await fetchLatestBaileysVersion();
    const version = versionInfo.version;

    // Criar logger silencioso compatível com pino e Baileys
    const createSilentLogger = (): any => {
      const logger: any = {
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {},
        level: 'silent',
        child: () => createSilentLogger()
      };
      return logger;
    };
    const silentLogger = createSilentLogger();

    const store = makeInMemoryStore({
      // Removido logger: console para evitar erro
    });
    
    // Load store data if exists
    const storeFile = path.join(sessionPath, 'store.json');
    try {
      await fs.readFile(storeFile, 'utf8');
      store.readFromFile(storeFile);
    } catch (err) {
      // Store file doesn't exist yet
    }

    console.log(`[WhatsApp QR] Initializing Baileys socket for ${connectionId}`);
    console.log(`[WhatsApp QR] Session path: ${sessionPath}`);
    console.log(`[WhatsApp QR] Baileys version: ${version?.join('.')}`);
    
    const socket = makeWASocket({
      version: version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, silentLogger),
      },
      logger: silentLogger,
      printQRInTerminal: false,
      generateHighQualityLinkPreview: true,
    });
    
    console.log(`[WhatsApp QR] ✅ Baileys socket initialized successfully for ${connectionId}`);

    store.bind(socket.ev);

    // Save store periodically
    setInterval(() => {
      store.writeToFile(storeFile);
    }, 10000);

    this.sessions.set(connectionId, {
      socket,
      config: { connectionId, companyId },
      store,
    });

    // Handle connection events
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      console.log(`[WhatsApp QR] Connection update for ${connectionId}:`, { 
        connection, 
        hasQR: !!qr,
        hasLastDisconnect: !!lastDisconnect 
      });

      if (qr) {
        console.log(`[WhatsApp QR] ====== QR CODE GENERATED ======`);
        console.log(`[WhatsApp QR] Connection ID: ${connectionId}`);
        console.log(`[WhatsApp QR] QR length: ${qr.length} characters`);
        console.log(`[WhatsApp QR] Timestamp: ${new Date().toISOString()}`);
        
        try {
          // O Baileys retorna o QR como string, precisamos converter para data URL
          console.log(`[WhatsApp QR] Converting QR to data URL...`);
          const qrCode = await QRCode.toDataURL(qr);
          console.log(`[WhatsApp QR] QR data URL generated, size: ${qrCode.length} characters`);
          
          // Emit QR code via Socket.IO to company room only (SECURITY FIX)
          if (this.io) {
            // IMPORTANT: Emit apenas para a sala da empresa específica para isolamento multi-tenant
            const room = `company:${companyId}`;
            const event1 = `whatsapp:qr:${connectionId}`;
            const event2 = 'whatsapp:qr';
            
            console.log(`[WhatsApp QR] Socket.IO is initialized, preparing to emit...`);
            console.log(`[WhatsApp QR] Room: ${room}`);
            console.log(`[WhatsApp QR] Event 1: ${event1}`);
            console.log(`[WhatsApp QR] Event 2: ${event2}`);
            
            this.io.to(room).emit(event1, { 
              qrCode, 
              connectionId 
            });
            
            // Também emitir sem o connectionId para debug
            this.io.to(room).emit(event2, { 
              qrCode, 
              connectionId 
            });
            
            console.log(`[WhatsApp QR] ✅ QR Code emitted successfully via Socket.IO`);
            console.log(`[WhatsApp QR] ================================`);
          } else {
            console.error('[WhatsApp QR] ❌ ERROR: Socket.IO not initialized, cannot emit QR code');
            console.error('[WhatsApp QR] This is a critical error - QR cannot be sent to frontend');
          }
        } catch (error: any) {
          console.error('[WhatsApp QR] ❌ Error generating QR code data URL:', {
            error: error.message,
            stack: error.stack,
            connectionId
          });
        }
      }

      if (connection === 'close') {
        const errorCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = errorCode !== DisconnectReason.loggedOut;
        
        console.log(`[WhatsApp QR] ====== CONNECTION CLOSED ======`);
        console.log(`[WhatsApp QR] Connection ID: ${connectionId}`);
        console.log(`[WhatsApp QR] Error code: ${errorCode}`);
        console.log(`[WhatsApp QR] Should reconnect: ${shouldReconnect}`);
        console.log(`[WhatsApp QR] Timestamp: ${new Date().toISOString()}`);
        
        if (shouldReconnect) {
          console.log(`[WhatsApp QR] Reconnecting session ${connectionId} in 5 seconds...`);
          setTimeout(() => {
            console.log(`[WhatsApp QR] Executing reconnection for ${connectionId}...`);
            this.connectSession(connectionId, companyId);
          }, 5000);
        } else {
          console.log(`[WhatsApp QR] Session ${connectionId} logged out, cleaning up...`);
          await this.disconnectSession(connectionId);
        }
      } else if (connection === 'open') {
        console.log(`[WhatsApp QR] ====== WHATSAPP CONNECTED ======`);
        console.log(`[WhatsApp QR] Connection ID: ${connectionId}`);
        
        // Update database with phone number and status
        const phoneNumber = socket.user?.id.split('@')[0] || '';
        console.log(`[WhatsApp QR] Phone number: ${phoneNumber}`);
        
        await db.update(whatsappQrSessions)
          .set({
            phoneNumber,
            isActive: true,
            lastConnectedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(whatsappQrSessions.connectionId, connectionId));
        
        // Notify frontend of successful connection - only to company room (SECURITY FIX)
        if (this.io) {
          // IMPORTANT: Emit apenas para a sala da empresa específica para isolamento multi-tenant
          console.log(`[WhatsApp QR] Emitting connected event to room company:${companyId}`);
          this.io.to(`company:${companyId}`).emit(`whatsapp:connected:${connectionId}`, {
            connectionId,
            phoneNumber,
            status: 'connected',
          });
        } else {
          console.error('[WhatsApp QR] ERROR: Socket.IO not initialized, cannot emit connected event');
        }
      }
    });

    socket.ev.on('creds.update', saveCreds);

    // Handle incoming messages
    socket.ev.on('messages.upsert', async (messageUpdate) => {
      for (const msg of messageUpdate.messages) {
        if (!msg.message || msg.key.fromMe) continue;
        
        await this.handleIncomingMessage(msg, connectionId, companyId);
      }
    });

    // Handle message status updates
    socket.ev.on('messages.update', async (messageUpdates) => {
      for (const update of messageUpdates) {
        await this.handleMessageStatusUpdate(update);
      }
    });
  }

  private async handleIncomingMessage(msg: proto.IWebMessageInfo, connectionId: string, companyId: string) {
    const fromNumber = msg.key.remoteJid?.split('@')[0] || '';
    const messageText = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text || 
                       '';

    if (!fromNumber || !messageText) return;

    try {
      // Find or create contact
      let contact = await db.select().from(contacts)
        .where(and(
          eq(contacts.phone, fromNumber),
          eq(contacts.companyId, companyId)
        ))
        .limit(1);

      if (!contact.length) {
        const [newContact] = await db.insert(contacts)
          .values({
            companyId,
            name: msg.pushName || fromNumber,
            phone: fromNumber,
          })
          .returning();
        contact = [newContact!];
      }

      const contactRecord = contact[0];
      if (!contactRecord) return;

      // Find or create conversation
      let conversation = await db.select().from(conversations)
        .where(and(
          eq(conversations.contactId, contactRecord.id),
          eq(conversations.connectionId, connectionId)
        ))
        .limit(1);

      if (!conversation.length) {
        const [newConversation] = await db.insert(conversations)
          .values({
            companyId,
            contactId: contactRecord.id,
            connectionId,
            status: 'active',
          })
          .returning();
        conversation = [newConversation!];
      }

      const conversationRecord = conversation[0];
      if (!conversationRecord) return;

      // Save message
      await db.insert(messages)
        .values({
          conversationId: conversationRecord.id,
          senderType: 'contact',
          content: messageText,
          status: 'received',
          providerMessageId: msg.key.id,
        });

      console.log(`Incoming message from ${fromNumber}: ${messageText}`);
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }

  private async handleMessageStatusUpdate(update: any) {
    if (!update.key?.id) return;

    const statusMap: Record<number, string> = {
      1: 'sent',
      2: 'delivered',
      3: 'read',
    };

    const status = statusMap[update.update?.status || 0];
    if (!status) return;

    try {
      await db.update(messages)
        .set({ status })
        .where(eq(messages.providerMessageId, update.key.id));
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  }

  async sendMessage(
    connectionId: string,
    phoneNumber: string,
    content: string | AnyMessageContent
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const session = this.sessions.get(connectionId);
    
    if (!session) {
      return { success: false, error: 'Session not found or not connected' };
    }

    try {
      // Format phone number (ensure it has country code and @s.whatsapp.net)
      const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
      
      // Prepare message content
      const messageContent: AnyMessageContent = typeof content === 'string' 
        ? { text: content }
        : content;

      // Send message
      const result = await session.socket.sendMessage(jid, messageContent);
      
      return { 
        success: true, 
        messageId: result?.key.id || undefined
      };
    } catch (error) {
      console.error('Error sending message:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send message' 
      };
    }
  }

  async getStatus(connectionId: string): Promise<{
    isConnected: boolean;
    phoneNumber?: string;
    lastConnectedAt?: Date;
  }> {
    const session = this.sessions.get(connectionId);
    
    if (!session) {
      // Check database for last known status
      const [dbSession] = await db.select()
        .from(whatsappQrSessions)
        .where(eq(whatsappQrSessions.connectionId, connectionId))
        .limit(1);

      return {
        isConnected: false,
        phoneNumber: dbSession?.phoneNumber || undefined,
        lastConnectedAt: dbSession?.lastConnectedAt || undefined,
      };
    }

    const phoneNumber = session.socket.user?.id.split('@')[0];

    return {
      isConnected: true,
      phoneNumber: phoneNumber || undefined,
      lastConnectedAt: new Date(),
    };
  }

  async disconnectSession(connectionId: string): Promise<void> {
    const session = this.sessions.get(connectionId);
    
    if (session) {
      await session.socket.logout();
      this.sessions.delete(connectionId);
    }

    // Update database
    await db.update(whatsappQrSessions)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(whatsappQrSessions.connectionId, connectionId));

    // Clean up session files
    try {
      const sessionPath = this.getSessionPath(connectionId);
      await fs.rm(sessionPath, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up session files:', error);
    }

    console.log(`Session ${connectionId} disconnected and cleaned up`);
  }

  async reconnectAllSessions(): Promise<void> {
    // Called on server startup to reconnect active sessions
    const activeSessions = await db.select()
      .from(whatsappQrSessions)
      .where(eq(whatsappQrSessions.isActive, true));

    for (const session of activeSessions) {
      const connection = await db.select()
        .from(require('../db/schema').connections)
        .where(eq(require('../db/schema').connections.id, session.connectionId))
        .limit(1);

      if (connection[0]) {
        console.log(`Attempting to reconnect session ${session.connectionId}...`);
        await this.connectSession(session.connectionId, connection[0].companyId);
      }
    }
  }
}

export default WhatsAppQRService;