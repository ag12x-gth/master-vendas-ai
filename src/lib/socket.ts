import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import WhatsAppQRService from './services/whatsapp-qr.service';
import { jwtVerify } from 'jose';

let io: SocketIOServer | null = null;

// JWT Secret para validação
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
if (!JWT_SECRET_KEY) {
  throw new Error('JWT_SECRET_KEY não está definida nas variáveis de ambiente.');
}

// Função para validar o token JWT
async function validateSocketToken(token: string): Promise<{ userId: string; companyId: string; email: string } | null> {
  if (!token) {
    return null;
  }

  try {
    const secretKey = new TextEncoder().encode(JWT_SECRET_KEY);
    const { payload } = await jwtVerify(token, secretKey);
    
    if (!payload || !payload.userId || !payload.companyId) {
      return null;
    }

    return {
      userId: payload.userId as string,
      companyId: payload.companyId as string,
      email: payload.email as string,
    };
  } catch (error) {
    console.error('Socket auth error:', error);
    return null;
  }
}

export function initializeSocketIO(server: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? [process.env.NEXT_PUBLIC_BASE_URL || '']
        : ['http://localhost:5000', 'http://localhost:3000', 'http://0.0.0.0:5000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Middleware de autenticação para Socket.IO
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const session = await validateSocketToken(token);
    
    if (!session) {
      return next(new Error('Invalid or expired token'));
    }

    // Armazenar dados da sessão no socket para uso posterior
    socket.data.userId = session.userId;
    socket.data.companyId = session.companyId;
    socket.data.email = session.email;
    
    next();
  });

  // Initialize WhatsApp QR service with Socket.IO
  const whatsappService = WhatsAppQRService.getInstance();
  whatsappService.setSocketIO(io);

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id, 'Company:', socket.data.companyId);
    
    // Automaticamente adicionar o socket à sala da empresa
    const companyRoom = `company:${socket.data.companyId}`;
    socket.join(companyRoom);
    console.log(`Socket ${socket.id} joined room: ${companyRoom}`);

    // Handle WhatsApp QR connection requests
    socket.on('whatsapp:connect', async (data) => {
      const { connectionId } = data;
      // Use companyId from authenticated socket data, not from client
      const companyId = socket.data.companyId;
      
      if (!connectionId) {
        socket.emit('whatsapp:error', { 
          error: 'Missing connectionId' 
        });
        return;
      }
      
      if (!companyId) {
        socket.emit('whatsapp:error', { 
          error: 'Authentication error - company not found' 
        });
        return;
      }

      try {
        // Join room for this connection
        socket.join(`connection:${connectionId}`);
        
        // Start WhatsApp connection
        await whatsappService.connectSession(connectionId, companyId);
        
        socket.emit('whatsapp:connecting', { 
          connectionId,
          status: 'connecting' 
        });
      } catch (error) {
        console.error('Error connecting WhatsApp:', error);
        socket.emit('whatsapp:error', { 
          connectionId,
          error: error instanceof Error ? error.message : 'Failed to connect' 
        });
      }
    });

    // Handle status check requests
    socket.on('whatsapp:checkStatus', async (data) => {
      const { connectionId } = data;
      
      if (!connectionId) {
        socket.emit('whatsapp:error', { 
          error: 'Missing connectionId' 
        });
        return;
      }

      try {
        const status = await whatsappService.getStatus(connectionId);
        socket.emit('whatsapp:status', { 
          connectionId,
          ...status 
        });
      } catch (error) {
        console.error('Error checking status:', error);
        socket.emit('whatsapp:error', { 
          connectionId,
          error: error instanceof Error ? error.message : 'Failed to check status' 
        });
      }
    });

    // Handle disconnect requests
    socket.on('whatsapp:disconnect', async (data) => {
      const { connectionId } = data;
      
      if (!connectionId) {
        socket.emit('whatsapp:error', { 
          error: 'Missing connectionId' 
        });
        return;
      }

      try {
        await whatsappService.disconnectSession(connectionId);
        socket.emit('whatsapp:disconnected', { 
          connectionId,
          status: 'disconnected' 
        });
      } catch (error) {
        console.error('Error disconnecting WhatsApp:', error);
        socket.emit('whatsapp:error', { 
          connectionId,
          error: error instanceof Error ? error.message : 'Failed to disconnect' 
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Reconnect active sessions on server startup
  setTimeout(async () => {
    try {
      console.log('Attempting to reconnect active WhatsApp sessions...');
      await whatsappService.reconnectAllSessions();
    } catch (error) {
      console.error('Error reconnecting sessions:', error);
    }
  }, 5000);

  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}