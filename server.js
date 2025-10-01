const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 5000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;

      if (pathname === '/a') {
        await app.render(req, res, '/a', query);
      } else if (pathname === '/b') {
        await app.render(req, res, '/b', query);
      } else {
        await handle(req, res, parsedUrl);
      }
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Import and initialize WhatsApp QR service using tsx
  let io;
  try {
    // Use tsx/cjs to enable TypeScript imports in Node.js
    require('tsx/cjs');
    const { initializeSocketIO } = require('./src/lib/socket.ts');
    // Pass the server and get the Socket.IO instance back
    io = initializeSocketIO(server);
    // Make Socket.IO globally available for WhatsApp QR service
    global.io = io;
    console.log('Socket.IO service initialized with WhatsApp QR support and made globally available');
  } catch (error) {
    console.log('Socket.IO initialization error:', error.message);
    console.log('Using fallback Socket.IO setup...');
    
    // Fallback: Create basic Socket.IO setup if the full service fails
    const { Server } = require('socket.io');
    io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? [process.env.NEXT_PUBLIC_BASE_URL || '']
          : ['http://localhost:5000', 'http://localhost:3000', 'http://0.0.0.0:5000'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });
    
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> Socket.IO server initialized');
  });
});