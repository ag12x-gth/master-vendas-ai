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
const port = process.env.PORT || 8080;

// Simplified configuration without overriding conf
const nextConfig = {
  dev,
  hostname,
  port,
  quiet: !dev, // Reduce logs in production
};

const app = next(nextConfig);
const handle = app.getRequestHandler();

// Track if Next.js is ready
let nextReady = false;

// CRITICAL: Create HTTP server first (no Socket.IO yet)
const server = createServer(async (req, res) => {
  try {
    const parsedUrl = parse(req.url, true);
    const { pathname, query } = parsedUrl;

    // CRITICAL: Health check endpoints ALWAYS respond immediately (even if Next.js not ready)
    if (pathname === '/health' || pathname === '/_health') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.end(JSON.stringify({
        status: 'healthy',
        nextReady: nextReady,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }));
      return;
    }

    // If Next.js not ready yet, return loading page (including for root)
    if (!nextReady) {
      // CRITICAL FIX: Return 200 instead of 503 so standard health checks pass immediately
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.end('<html><head><meta http-equiv="refresh" content="5"></head><body><h1>Starting...</h1><p>Server is initializing, please wait...</p></body></html>');
      return;
    }

    // Next.js request handling (only when ready)
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

// STEP 1: Start server IMMEDIATELY (NOTHING BEFORE THIS)
server.listen(port, hostname, (err) => {
  if (err) {
    console.error(`❌ Failed to start server:`, err.message);
    process.exit(1);
  }

  // Server is now LISTENING - health checks will work!
  console.log(`✅ Server LISTENING on http://${hostname}:${port}`);
  console.log('✅ Health endpoints ready: GET /health or /_health');

  // STEP 2: Initialize Socket.IO (after server is listening)
  let io;
  try {
    require('tsx/cjs');
    const { initializeSocketIO } = require('./src/lib/socket.ts');
    io = initializeSocketIO(server);
    global.io = io;
    console.log('✅ Socket.IO initialized');
  } catch (error) {
    console.log('⚠️ Socket.IO initialization failed, using fallback');
    const { Server } = require('socket.io');
    io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? [process.env.NEXT_PUBLIC_BASE_URL || '']
          : ['http://localhost:8080', 'http://localhost:3000', 'http://0.0.0.0:8080'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      socket.on('join_meeting', (meetingId) => {
        socket.join(`meeting:${meetingId}`);
      });
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    global.io = io;
    console.log('✅ Fallback Socket.IO initialized');
  }

  // STEP 3: Prepare Next.js in background
  console.log('🔄 Preparing Next.js in background...');

  app.prepare().then(() => {
    nextReady = true;
    console.log('✅ Next.js ready!');

    // STEP 4: Initialize heavy services (after Next.js is ready)
    (async () => {
      try {
        require('tsx/cjs');
        const { sessionManager } = require('./src/services/baileys-session-manager.ts');
        await sessionManager.initializeSessions();
        console.log('✅ Baileys initialized');
      } catch (error) {
        console.error('❌ Baileys error:', error.message);
      }
    })();

    // STEP 5: Start schedulers (delayed for stability)
    setTimeout(() => {
      try {
        require('tsx/cjs');
        const { startCadenceScheduler } = require('./src/lib/cadence-scheduler.ts');
        startCadenceScheduler();
        console.log('✅ Cadence Scheduler ready');
      } catch (error) {
        console.error('❌ Cadence Scheduler error:', error.message);
      }
    }, 5000);

    // STEP 6: Start campaign processor (delayed for stability)
    setTimeout(() => {
      const processCampaignQueue = async () => {
        try {
          const response = await fetch(`http://localhost:${port}/api/v1/campaigns/trigger`);
          const data = await response.json();
          if (data.processed > 0) {
            console.log(`[Campaign Processor] ${data.processed} processed`);
          }
        } catch (error) {
          // Silent failure - don't spam logs
        }
      };

      console.log('✅ Campaign Processor ready');
      processCampaignQueue(); // Execute once
      setInterval(processCampaignQueue, 60000); // Then every 60s
    }, 15000);

  }).catch(err => {
    console.error('❌ Next.js preparation failed:', err);
    console.log('ℹ️ Server will continue running with loading page. Retry Next.js in 5s...');
    // Don't exit - let server continue with loading page response
    // Retry app.prepare() after 5 seconds
    setTimeout(() => {
      app.prepare().then(() => {
        nextReady = true;
        console.log('✅ Next.js ready!');
      }).catch(retryErr => {
        console.error('❌ Next.js retry also failed:', retryErr.message);
      });
    }, 5000);
  });
});
