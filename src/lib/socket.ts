import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { jwtVerify } from 'jose';

let io: SocketIOServer | null = null;

// JWT Secret para validação
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY_CALL;
if (!JWT_SECRET_KEY) {
  throw new Error('JWT_SECRET_KEY_CALL não está definida nas variáveis de ambiente.');
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
        : ['http://localhost:8080', 'http://localhost:3000', 'http://0.0.0.0:8080'],
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

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id, 'Company:', socket.data.companyId);
    
    // Automaticamente adicionar o socket à sala da empresa
    const companyRoom = `company:${socket.data.companyId}`;
    socket.join(companyRoom);
    console.log(`Socket ${socket.id} joined room: ${companyRoom}`);

    // Eventos para reuniões
    socket.on('join_meeting', (meetingId: string) => {
      const meetingRoom = `meeting:${meetingId}`;
      socket.join(meetingRoom);
      console.log(`Socket ${socket.id} joined meeting room: ${meetingRoom}`);
    });

    socket.on('leave_meeting', (meetingId: string) => {
      const meetingRoom = `meeting:${meetingId}`;
      socket.leave(meetingRoom);
      console.log(`Socket ${socket.id} left meeting room: ${meetingRoom}`);
    });

    // NOVO: Eventos para campanhas
    socket.on('subscribe_campaign', ({ campaignId }: { campaignId: string }) => {
      const campaignRoom = `campaign:${campaignId}`;
      socket.join(campaignRoom);
      console.log(`Socket ${socket.id} subscribed to campaign: ${campaignRoom}`);
    });

    socket.on('unsubscribe_campaign', ({ campaignId }: { campaignId: string }) => {
      const campaignRoom = `campaign:${campaignId}`;
      socket.leave(campaignRoom);
      console.log(`Socket ${socket.id} unsubscribed from campaign: ${campaignRoom}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}
