import { Server } from 'socket.io';
import { NextRequest, NextResponse } from 'next/server';
import WhatsAppQRService from '@/lib/services/whatsapp-qr.service';

let io: Server | null = null;

function initSocket() {
  if (!io) {
    // Create a minimal HTTP server for Socket.IO
    const httpServer = require('http').createServer();
    
    io = new Server(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? [process.env.NEXT_PUBLIC_BASE_URL || '']
          : ['http://localhost:5000', 'http://localhost:3000', 'http://0.0.0.0:5000'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      path: '/api/socket/',
    });

    // Initialize WhatsApp QR service with Socket.IO
    const whatsappService = WhatsAppQRService.getInstance();
    whatsappService.setSocketIO(io);

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Handle WhatsApp QR connection requests
      socket.on('whatsapp:connect', async (data) => {
        const { connectionId, companyId } = data;
        
        if (!connectionId || !companyId) {
          socket.emit('whatsapp:error', { 
            error: 'Missing connectionId or companyId' 
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

    // Reconnect active sessions on initialization
    setTimeout(async () => {
      try {
        console.log('Attempting to reconnect active WhatsApp sessions...');
        await whatsappService.reconnectAllSessions();
      } catch (error) {
        console.error('Error reconnecting sessions:', error);
      }
    }, 5000);

    // Listen on a different port for Socket.IO
    const socketPort = parseInt(process.env.SOCKET_PORT || '3001');
    httpServer.listen(socketPort, () => {
      console.log(`Socket.IO server listening on port ${socketPort}`);
    });
  }

  return io;
}

export async function GET(_request: NextRequest) {
  initSocket();
  
  return NextResponse.json({
    success: true,
    message: 'Socket.IO server initialized',
    socketUrl: process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_BASE_URL 
      : 'http://localhost:3001'
  });
}

export async function POST(_request: NextRequest) {
  initSocket();
  
  return NextResponse.json({
    success: true,
    message: 'Socket.IO server initialized'
  });
}