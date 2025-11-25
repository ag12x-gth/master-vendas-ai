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
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    // ✅ PRIORIDADE: REDIS_URL > Upstash > Localhost
    let connectionUrl: string | undefined;
    
    if (redisUrl) {
      connectionUrl = redisUrl;
      console.log('✅ [BullMQ] Using provided REDIS_URL');
    } else if (upstashUrl && upstashToken) {
      // Convert Upstash REST URL to Redis protocol (fallback)
      const upstashHost = upstashUrl.replace('https://', '').replace(/\/$/, '').split(':')[0];
      connectionUrl = `rediss://default:${upstashToken}@${upstashHost}:6379`;
      console.log('✅ [BullMQ] Using Upstash Redis connection');
    }
    
    if (connectionUrl) {
      redisConnection = new Redis(connectionUrl, {
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });
    } else {
      // No valid connection URL - return null connection to prevent localhost attempts
      console.warn('⚠️ [BullMQ] No Redis URL provided. BullMQ will not be available.');
      throw new Error('Redis URL required for BullMQ');
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
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  // ✅ PRIORIDADE: REDIS_URL > Upstash > Localhost
  let connectionUrl: string | undefined;
  
  if (redisUrl) {
    connectionUrl = redisUrl;
  } else if (upstashUrl && upstashToken) {
    // Convert Upstash REST URL to Redis protocol (fallback)
    const upstashHost = upstashUrl.replace('https://', '').replace(/\/$/, '').split(':')[0];
    connectionUrl = `rediss://default:${upstashToken}@${upstashHost}:6379`;
  }
  
  if (connectionUrl) {
    return new Redis(connectionUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });
  }
  
  // Fallback to localhost
  return new Redis({
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