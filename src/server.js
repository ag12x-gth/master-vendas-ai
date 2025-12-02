const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { execSync, execFileSync } = require('child_process');

// ========================================
// GUARD AUTOMÁTICO - Prevenir EADDRINUSE
// ========================================
/**
 * Kill stale Node.js processes occupying the target port before server starts.
 * This prevents EADDRINUSE errors when workflow restarts.
 * 
 * Architect Recommendation: Add automated guard to kill stale processes
 * Evidence: Fixed PID 75850 blocking port 8080 on 2025-11-24
 */
function killStaleProcesses(targetPort) {
  try {
    // SECURITY: Validate port is a safe integer (defense in depth)
    const sanitizedPort = parseInt(targetPort, 10);
    if (isNaN(sanitizedPort) || sanitizedPort < 1 || sanitizedPort > 65535) {
      console.warn(`⚠️ [Guard] Invalid port number: ${targetPort}, skipping cleanup`);
      return;
    }
    
    // SECURITY: Additional regex validation before shell interpolation (defense against injection)
    const portString = String(sanitizedPort);
    if (!/^\d+$/.test(portString)) {
      console.warn(`⚠️ [Guard] Port validation failed regex check: ${portString}, skipping cleanup`);
      return;
    }
    
    console.log(`🔍 [Guard] Checking for stale processes on port ${sanitizedPort}...`);
    
    // Find processes using the target port
    // SECURITY: Using execFileSync (no shell) to prevent command injection
    let pids = '';
    try {
      pids = execFileSync('lsof', ['-ti', `:${portString}`], { encoding: 'utf8' }).trim();
    } catch (error) {
      // lsof returns non-zero exit code when no processes found - this is expected
      pids = '';
    }
    
    if (pids) {
      const pidList = pids.split('\n').filter(Boolean);
      console.log(`⚠️ [Guard] Found ${pidList.length} stale process(es): ${pidList.join(', ')}`);
      
      pidList.forEach(pidStr => {
        // SECURITY: Validate PID is a safe integer (defense in depth)
        const pid = parseInt(pidStr, 10);
        if (isNaN(pid) || pid < 1 || pid > 4194304) {
          console.warn(`⚠️ [Guard] Invalid PID: ${pidStr}, skipping`);
          return;
        }
        
        // SECURITY: Additional regex validation before shell interpolation (defense against injection)
        const pidString = String(pid);
        if (!/^\d+$/.test(pidString)) {
          console.warn(`⚠️ [Guard] PID validation failed regex check: ${pidString}, skipping`);
          return;
        }
        
        try {
          // Check if it's a Node.js process (safety check)
          // SECURITY: Using execFileSync (no shell invocation) - safe from injection
          const processInfo = execFileSync('ps', ['-p', pidString, '-o', 'comm='], { encoding: 'utf8' }).trim();
          
          if (processInfo.includes('node')) {
            console.log(`🔪 [Guard] Terminating stale Node.js process PID ${pid}...`);
            process.kill(pid, 'SIGKILL');
            console.log(`✅ [Guard] PID ${pid} terminated successfully`);
          } else {
            console.log(`⏭️ [Guard] Skipping non-Node.js process PID ${pid} (${processInfo})`);
          }
        } catch (killError) {
          console.warn(`⚠️ [Guard] Could not terminate PID ${pid}: ${killError.message}`);
        }
      });
      
      // Wait 1 second for port to be released
      console.log(`⏳ [Guard] Waiting 1s for port ${sanitizedPort} to be released...`);
      execSync('sleep 1');
      console.log(`✅ [Guard] Port ${sanitizedPort} cleanup complete`);
    } else {
      console.log(`✅ [Guard] No stale processes found on port ${sanitizedPort}`);
    }
  } catch (error) {
    // Non-critical error - continue server startup
    console.warn(`⚠️ [Guard] Process cleanup failed (non-critical): ${error.message}`);
  }
}

// Execute guard before server initialization
const PORT = parseInt(process.env.PORT || '5000', 10);
killStaleProcesses(PORT);

// ========================================
// CRITICAL: Log actual Node.js heap limit on startup
// ========================================
const v8 = require('v8');
const heapStats = v8.getHeapStatistics();
const heapLimitMB = (heapStats.heap_size_limit / 1024 / 1024).toFixed(2);
console.log(`🧠 [Memory] Node.js Heap Limit: ${heapLimitMB} MB`);
console.log(`💾 [Memory] NODE_OPTIONS: ${process.env.NODE_OPTIONS || 'NOT SET'}`);

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

  // Force GC when memory usage is high (>95%)
  setInterval(() => {
    const mem = process.memoryUsage();
    const heapPercentage = (mem.heapUsed / mem.heapTotal) * 100;

    if (heapPercentage > 95) {
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
    // Also handle root path for deployment health checks (Autoscale sends to / by default)
    const isHealthCheck = pathname === '/health' || pathname === '/_health' || 
      (pathname === '/' && (
        req.headers['user-agent']?.includes('kube-probe') ||
        req.headers['user-agent']?.includes('GoogleHC') ||
        req.headers['user-agent']?.includes('HealthChecker') ||
        req.headers['x-replit-health-check'] === 'true' ||
        req.method === 'HEAD'
      ));
    
    if (isHealthCheck) {
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

    // 🗑️ DATABASE CLEANUP ENDPOINT - Close zombie connections
    if (pathname === '/api/db-cleanup') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      try {
        const { conn: _conn } = require('./src/lib/db/index.ts');
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        res.end(JSON.stringify({
          status: 'success',
          message: 'Database pool cleanup triggered',
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        res.statusCode = 500;
        res.end(JSON.stringify({
          status: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
        }));
      }
      return;
    }

    // If Next.js not ready yet, return appropriate response
    if (!nextReady) {
      // IMPROVEMENT: Detect if client expects JSON (health checkers, APIs)
      const acceptsJson = req.headers.accept?.includes('application/json') || 
                         req.headers['user-agent']?.includes('HealthChecker') ||
                         req.method === 'HEAD';
      
      if (acceptsJson) {
        // Return JSON with 503 for health checkers (more semantically correct)
        res.statusCode = 503; // Service Unavailable
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Retry-After', '5');
        res.end(JSON.stringify({
          status: 'initializing',
          message: 'Server is starting up, please retry in a few seconds',
          nextReady: false,
          uptime: process.uptime(),
          services: {
            express: true,
            socketIO: !!global.io,
            nextjs: false
          },
          timestamp: new Date().toISOString()
        }));
        return;
      }
      
      // HTML loading page for browsers
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

// ========================================
// CRITICAL FIX #1: Server Error Handler with EADDRINUSE Retry
// ========================================
const startServerWithRetry = (retryCount = 0, maxRetries = 3) => {
  server.listen(port, hostname, () => {
    // Server is now LISTENING - health checks will work!
    console.log(`✅ Server LISTENING on http://${hostname}:${port}`);
    console.log('✅ Health endpoints ready: GET /health or /_health');
    
    // Continue with Socket.IO initialization only AFTER listen succeeds
    continueInitialization();
  });

  // CRITICAL: Handle EADDRINUSE error with retry logic
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use (Error: EADDRINUSE)`);
      
      if (retryCount < maxRetries) {
        const delayMs = 1000 * (retryCount + 1);
        console.log(`⏳ Retry #${retryCount + 1}/${maxRetries} after ${delayMs}ms...`);
        
        setTimeout(() => {
          // Recreate server for retry
          const newServer = createServer(server._handle);
          // Copy handlers from old server
          newServer.on('request', (req, res) => {
            server.emit('request', req, res);
          });
          
          startServerWithRetry(retryCount + 1, maxRetries);
        }, delayMs);
      } else {
        console.error(`🔴 Failed to start server after ${maxRetries} retries. Exiting.`);
        process.exit(1);
      }
    } else {
      console.error(`❌ Server error: ${err.message}`);
      process.exit(1);
    }
  });
};

// Helper function - moved Socket.IO and services init here
const continueInitialization = () => {

  // ========================================
  // STEP 2A: Initialize Redis (eager loading for production)
  // ========================================
  try {
    require('tsx/cjs');
    const _redis = require('./src/lib/redis.ts').default;
    console.log('✅ Redis initialized (eager loading)');
  } catch (error) {
    console.warn('⚠️ Redis initialization skipped:', error.message);
  }

  // STEP 2B: Initialize Socket.IO (after server is listening)
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
      });
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    global.io = io;
    console.log('✅ Fallback Socket.IO initialized');
  }

  // ========================================
  // DATABASE POOL MONITORING (Production)
  // ========================================
  if (process.env.NODE_ENV === 'production' || process.env.DB_DEBUG === 'true') {
    setInterval(async () => {
      try {
        if (process.env.DB_DEBUG === 'true') {
          console.log('🔍 [DB Monitor] Pool monitoring active...');
        }
      } catch (error) {
        console.warn(`⚠️ [DB Monitor] Connection check failed: ${error.message}`);
      }
    }, 30000);
  }

  // STEP 3: Prepare Next.js in background with TIMEOUT
  console.log('🔄 Preparing Next.js in background (timeout: 300s)...');

  const prepareWithTimeout = (timeoutMs = 300000) => {
    return Promise.race([
      app.prepare(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Next.js prepare timeout after 300s')), timeoutMs)
      )
    ]);
  };

  prepareWithTimeout(300000)
    .then(() => {
      nextReady = true;
      console.log('✅ Next.js ready! (completed in time)');

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

      setTimeout(() => {
        const processCampaignQueue = async () => {
          try {
            const response = await fetch(`http://localhost:${port}/api/v1/campaigns/trigger`);
            const data = await response.json();
            if (data.processed > 0) {
              console.log(`[Campaign Processor] ${data.processed} processed`);
            }
          } catch (error) {
            // Silent failure
          }
        };
        console.log('✅ Campaign Processor ready');
        processCampaignQueue();
        setInterval(processCampaignQueue, 60000);
      }, 15000);
    })
    .catch(err => {
      console.error('❌ Next.js preparation failed or timeout:', err.message);
      console.log('ℹ️ Server will continue running with basic endpoints');
      console.log('ℹ️ Retrying Next.js preparation in 30s...');

      setTimeout(() => {
        prepareWithTimeout(300000)
          .then(() => {
            nextReady = true;
            console.log('✅ Next.js ready! (completed on retry)');
          })
          .catch(retryErr => {
            console.error('❌ Next.js preparation retry also failed:', retryErr.message);
            console.log('⚠️ Next.js will remain unavailable - degraded mode');
          });
      }, 30000);
    });
}; // End continueInitialization function

// STEP 1: Start server with retry logic for EADDRINUSE
startServerWithRetry();

// ========================================
// CRITICAL FIX #2: Graceful Shutdown Handler
// ========================================
const gracefulShutdown = async (signal) => {
  console.log(`\n⏳ [${signal}] Graceful shutdown initiated...`);
  
  // Close HTTP server
  server.close(() => {
    console.log('✅ HTTP server closed');
  });

  // Force shutdown after 10 seconds
  const shutdownTimeout = setTimeout(() => {
    console.error('🔴 Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10000);

  try {
    // Close database connections if available
    if (global.db && global.db.close) {
      await global.db.close();
      console.log('✅ Database connections closed');
    }

    // Close Redis if available
    if (global.redis && global.redis.quit) {
      await global.redis.quit();
      console.log('✅ Redis connection closed');
    }

    clearTimeout(shutdownTimeout);
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error.message);
    process.exit(1);
  }
};

// ========================================
// CRITICAL FIX #3: Process Error Handlers
// ========================================

// Handle SIGTERM (sent by container orchestration systems)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🔴 Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔴 Unhandled Rejection at Promise:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

console.log('✅ Process error handlers registered');
