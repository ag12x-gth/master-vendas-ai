import Redis from 'ioredis';

// Singleton Redis connection for BullMQ
let redisConnection: Redis | null = null;

/**
 * Get or create Redis connection for BullMQ
 * This is the REAL Redis connection required for BullMQ to work properly
 */
export function getRedisConnection(): Redis {
  if (!redisConnection) {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      // For development/testing, try to connect to local Redis
      // In production, REDIS_URL must be set
      console.warn('⚠️ REDIS_URL not set. Trying localhost:6379 for Redis connection.');
      console.warn('⚠️ For production, please set REDIS_URL environment variable.');
      console.warn('⚠️ Example: redis://user:password@redis-host:6379');
      
      redisConnection = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });
    } else {
      // Use the provided Redis URL
      redisConnection = new Redis(redisUrl, {
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });
    }

    // Handle connection events
    redisConnection.on('connect', () => {
      console.log('✅ Redis connected successfully for BullMQ');
    });

    redisConnection.on('error', (error: any) => {
      // ✅ CORRIGIDO: Silenciar ECONNREFUSED em desenvolvimento (esperado quando Redis não está rodando)
      if (!process.env.REDIS_URL && error.code === 'ECONNREFUSED') {
        // Silenciar erro esperado - Redis não está rodando em dev
        return;
      }
      // Log outros erros apenas
      if (error.code !== 'ECONNREFUSED') {
        console.error('❌ Redis connection error:', error.message);
      }
      // Don't throw here - let BullMQ handle reconnection
    });

    redisConnection.on('close', () => {
      console.log('🔌 Redis connection closed');
    });

    redisConnection.on('reconnecting', (delay: number) => {
      console.log(`🔄 Redis reconnecting in ${delay}ms...`);
    });
  }

  return redisConnection;
}

/**
 * Create a new Redis connection for BullMQ workers
 * BullMQ requires separate connections for Queue and Worker
 */
export function createRedisConnection(): Redis {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    const connection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });
    return connection;
  }

  return new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });
}

/**
 * Close Redis connections gracefully
 */
export async function closeRedisConnections(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}