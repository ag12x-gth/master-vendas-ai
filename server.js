const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const path = require('path');

// Memory optimization: Enable garbage collection monitoring
if (global.gc) {
  console.log('🧹 Garbage collection exposed, enabling aggressive memory management');
  
  // Force garbage collection every 30 seconds
  setInterval(() => {
    const beforeMem = process.memoryUsage();
    global.gc();
    const afterMem = process.memoryUsage();
    
    const freed = {
      heapUsed: ((beforeMem.heapUsed - afterMem.heapUsed) / 1024 / 1024).toFixed(2),
      external: ((beforeMem.external - afterMem.external) / 1024 / 1024).toFixed(2),
      total: ((beforeMem.rss - afterMem.rss) / 1024 / 1024).toFixed(2)
    };
    
    if (parseFloat(freed.heapUsed) > 0) {
      console.log(`🧹 [GC] Freed ${freed.heapUsed}MB heap, ${freed.external}MB external, ${freed.total}MB total`);
    }
  }, 30000); // Every 30 seconds
  
  // Force GC when memory usage is high (>80%)
  setInterval(() => {
    const mem = process.memoryUsage();
    const heapPercentage = (mem.heapUsed / mem.heapTotal) * 100;
    
    if (heapPercentage > 80) {
      console.warn(`⚠️ [Memory] High heap usage: ${heapPercentage.toFixed(2)}%, forcing GC`);
      global.gc();
    }
  }, 10000); // Check every 10 seconds
} else {
  console.warn('⚠️ Garbage collection not exposed. Run with --expose-gc flag for better memory management');
}

// Log memory usage every minute
setInterval(() => {
  const mem = process.memoryUsage();
  const stats = {
    rss: (mem.rss / 1024 / 1024).toFixed(2),
    heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2),
    heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(2),
    external: (mem.external / 1024 / 1024).toFixed(2),
    heapPercentage: ((mem.heapUsed / mem.heapTotal) * 100).toFixed(2)
  };
  
  console.log(`📊 [Memory Stats] RSS: ${stats.rss}MB | Heap: ${stats.heapUsed}/${stats.heapTotal}MB (${stats.heapPercentage}%) | External: ${stats.external}MB`);
}, 60000); // Every minute

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

  // Initialize Socket.IO service
  let io;
  try {
    // Use tsx/cjs to enable TypeScript imports in Node.js
    require('tsx/cjs');
    const { initializeSocketIO } = require('./src/lib/socket.ts');
    // Pass the server and get the Socket.IO instance back
    io = initializeSocketIO(server);
    // Make Socket.IO globally available
    global.io = io;
    console.log('Socket.IO service initialized and made globally available');
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

      socket.on('join_meeting', (meetingId) => {
        socket.join(`meeting:${meetingId}`);
        console.log(`Socket ${socket.id} joined meeting: ${meetingId}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    // Make fallback Socket.IO globally available too
    global.io = io;
    console.log('Fallback Socket.IO made globally available');
  }

  server.listen(port, async (err) => {
    if (err) {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Porta ${port} já está em uso!`);
        console.log('🔧 Tentando auto-fix...');
        
        const { exec } = require('child_process');
        exec('bash scripts/auto-fix-server.sh', (error, stdout, stderr) => {
          if (error) {
            console.error('Auto-fix falhou:', error);
            process.exit(1);
          }
          console.log(stdout);
          console.log('✅ Auto-fix concluído. Reinicie o servidor.');
          process.exit(0);
        });
      } else {
        throw err;
      }
    } else {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log('> Socket.IO server initialized');
      
      try {
        require('tsx/cjs');
        const { sessionManager } = require('./src/services/baileys-session-manager.ts');
        await sessionManager.initializeSessions();
      } catch (error) {
        console.error('❌ Baileys session initialization error:', error.message);
      }
      
      // Campaign Queue Processor - Executa a cada 1 minuto
      const processCampaignQueue = async () => {
        try {
          const response = await fetch(`http://localhost:${port}/api/v1/campaigns/trigger`);
          const data = await response.json();
          if (data.processed > 0) {
            console.log(`[Campaign Processor] ${data.processed} campanhas processadas às ${data.now}`);
          }
        } catch (error) {
          console.error('[Campaign Processor] Erro:', error.message);
        }
      };
      
      // Inicia o processador após 10 segundos (aguarda servidor estabilizar)
      setTimeout(() => {
        console.log('[Campaign Processor] Scheduler iniciado - processando a cada 60 segundos');
        processCampaignQueue(); // Executa imediatamente
        setInterval(processCampaignQueue, 60000); // Depois a cada 1 minuto
      }, 10000);
      
      // Cadence Scheduler - Detector diário + Processor horário
      try {
        require('tsx/cjs');
        const { startCadenceScheduler } = require('./src/lib/cadence-scheduler.ts');
        startCadenceScheduler();
        console.log('✅ Cadence Scheduler initialized successfully');
      } catch (error) {
        console.error('❌ Cadence Scheduler initialization error:', error.message);
      }
    }
  });
});
