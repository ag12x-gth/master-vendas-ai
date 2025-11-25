import IORedis from 'ioredis';
import fs from 'fs';
import path from 'path';
import { 
  recordCacheOperation,
  cacheSize,
  cacheMemoryUsage,
} from './metrics';

// Enhanced cache implementation for fallback when Redis is unavailable
class EnhancedCache {
  private data: Map<string, { value: any; expireAt?: number }> = new Map();
  private metrics = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  private persistPath = '/tmp/cache/redis-cache.json';
  private cleanupInterval: NodeJS.Timeout | null = null;
  private saveInterval: NodeJS.Timeout | null = null;
  private statsInterval: NodeJS.Timeout | null = null;
  private maxSize = 10000; // Maximum number of keys
  private debugMode = process.env.CACHE_DEBUG === 'true';
  private lastReportTime = Date.now();

  constructor() {
    this.initializeCache();
    this.startCleanupTask();
    this.startAutoSave();
    if (this.debugMode) {
      this.startStatsReporting();
    }
  }

  // Initialize cache and load persisted data
  private initializeCache() {
    try {
      if (fs.existsSync(this.persistPath)) {
        const data = fs.readFileSync(this.persistPath, 'utf-8');
        const parsed = JSON.parse(data);
        
        // Load data with expiration check
        Object.entries(parsed).forEach(([key, item]: [string, any]) => {
          if (!item.expireAt || item.expireAt > Date.now()) {
            this.data.set(key, item);
          }
        });
      }
    } catch (error) {
      // Silently continue if cache can't be loaded
    }
    
    // Ensure cache directory exists
    const cacheDir = path.dirname(this.persistPath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  }

  // Start automatic cleanup of expired keys (every minute)
  private startCleanupTask() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000);
  }

  // Start auto-save task (every 5 minutes)
  private startAutoSave() {
    this.saveInterval = setInterval(() => {
      this.persistToDisk();
    }, 300000);
  }

  // Start stats reporting task (every minute)
  private startStatsReporting() {
    this.statsInterval = setInterval(() => {
      this.reportStats();
    }, 60000);
  }

  // Report cache statistics
  private reportStats() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? ((this.metrics.hits / total) * 100).toFixed(2) : '0.00';
    const cacheSizeValue = this.data.size;
    
    // Update Prometheus metrics
    cacheSize.set({ cache_type: 'memory' }, cacheSizeValue);
    
    // Estimate memory usage
    let memoryUsage = 0;
    for (const [key, item] of this.data.entries()) {
      memoryUsage += key.length * 2;
      memoryUsage += JSON.stringify(item).length * 2;
    }
    cacheMemoryUsage.set({ cache_type: 'memory' }, memoryUsage);
    
    if (this.debugMode) {
      console.log(`📊 [InMemory Cache Stats] Hit Rate: ${hitRate}% | Keys: ${cacheSizeValue}`);
    }
  }

  // Clean up expired keys
  private cleanupExpired() {
    const now = Date.now();
    let _cleaned = 0;
    
    for (const [key, item] of this.data.entries()) {
      if (item.expireAt && item.expireAt <= now) {
        this.data.delete(key);
        _cleaned++;
      }
    }
  }

  // Persist cache to disk
  private persistToDisk() {
    try {
      const dataObject: Record<string, any> = {};
      const now = Date.now();
      
      for (const [key, item] of this.data.entries()) {
        if (!item.expireAt || item.expireAt > now) {
          dataObject[key] = item;
        }
      }
      
      fs.writeFileSync(this.persistPath, JSON.stringify(dataObject, null, 2));
    } catch (error) {
      // Silently continue if cache can't be persisted
    }
  }

  // Check if cache size limit is reached
  private checkSizeLimit() {
    if (this.data.size >= this.maxSize) {
      const toRemove = Math.floor(this.maxSize * 0.1);
      const keys = Array.from(this.data.keys());
      for (let i = 0; i < toRemove && i < keys.length; i++) {
        const key = keys[i];
        if (key) {
          this.data.delete(key);
        }
      }
    }
  }

  // Get cache metrics
  getMetrics() {
    return { ...this.metrics, size: this.data.size };
  }

  // Redis-compatible methods
  async get(key: string): Promise<string | null> {
    const item = this.data.get(key);
    
    if (!item) {
      this.metrics.misses++;
      recordCacheOperation('miss', 'memory');
      return null;
    }
    
    if (item.expireAt && item.expireAt <= Date.now()) {
      this.data.delete(key);
      this.metrics.misses++;
      recordCacheOperation('miss', 'memory');
      return null;
    }
    
    this.metrics.hits++;
    recordCacheOperation('hit', 'memory');
    
    if (typeof item.value === 'object') {
      return JSON.stringify(item.value);
    }
    
    return String(item.value);
  }

  async set(key: string, value: any, mode?: string, duration?: number): Promise<string> {
    this.checkSizeLimit();
    
    let expireAt: number | undefined;
    
    if (mode === 'EX' && duration) {
      expireAt = Date.now() + (duration * 1000);
    } else if (mode === 'PX' && duration) {
      expireAt = Date.now() + duration;
    } else if (typeof mode === 'number') {
      expireAt = Date.now() + (mode * 1000);
    } else {
      expireAt = Date.now() + 300000; // Default 5 minutes
    }
    
    this.data.set(key, { value, expireAt });
    this.metrics.sets++;
    recordCacheOperation('set', 'memory');
    
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string | Buffer | number): Promise<string> {
    return this.set(key, value, 'EX', seconds);
  }

  async del(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      let deleted = 0;
      key.forEach(k => {
        if (this.data.delete(k)) {
          deleted++;
          recordCacheOperation('del', 'memory');
        }
      });
      this.metrics.deletes += deleted;
      return deleted;
    }
    
    const result = this.data.delete(key) ? 1 : 0;
    if (result) {
      this.metrics.deletes++;
      recordCacheOperation('del', 'memory');
    }
    return result;
  }

  async exists(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      return key.filter(k => {
        const item = this.data.get(k);
        return item && (!item.expireAt || item.expireAt > Date.now());
      }).length;
    }
    
    const item = this.data.get(key);
    if (!item) return 0;
    
    if (item.expireAt && item.expireAt <= Date.now()) {
      this.data.delete(key);
      return 0;
    }
    
    return 1;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.data.get(key);
    if (!item) return 0;
    
    item.expireAt = Date.now() + (seconds * 1000);
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const item = this.data.get(key);
    if (!item) return -2;
    if (!item.expireAt) return -1;
    
    const ttl = Math.floor((item.expireAt - Date.now()) / 1000);
    return ttl > 0 ? ttl : -2;
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    const now = Date.now();
    const allKeys = Array.from(this.data.keys());
    
    const validKeys = allKeys.filter(key => {
      const item = this.data.get(key);
      return item && (!item.expireAt || item.expireAt > now);
    });
    
    if (pattern === '*') return validKeys;
    
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return validKeys.filter(key => regex.test(key));
  }

  async flushall(): Promise<string> {
    this.data.clear();
    this.metrics = { hits: 0, misses: 0, sets: 0, deletes: 0 };
    return 'OK';
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  // Redis List methods
  async lpush(key: string, ...values: any[]): Promise<number> {
    const item = this.data.get(key);
    const list = item?.value ? [...item.value] : [];
    
    if (item && !Array.isArray(item.value)) {
      throw new Error(`Key ${key} is not a list`);
    }
    
    for (const value of values) {
      list.unshift(value);
    }
    
    this.data.set(key, { value: list, expireAt: item?.expireAt });
    return list.length;
  }

  async rpush(key: string, ...values: any[]): Promise<number> {
    const item = this.data.get(key);
    const list = item?.value ? [...item.value] : [];
    
    if (item && !Array.isArray(item.value)) {
      throw new Error(`Key ${key} is not a list`);
    }
    
    list.push(...values);
    this.data.set(key, { value: list, expireAt: item?.expireAt });
    return list.length;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const item = this.data.get(key);
    if (!item) return [];
    
    const list = item.value;
    if (!Array.isArray(list)) return [];
    
    const len = list.length;
    const actualStart = start < 0 ? Math.max(0, len + start) : start;
    const actualStop = stop < 0 ? len + stop + 1 : stop + 1;
    
    return list.slice(actualStart, actualStop).map(v => String(v));
  }

  async llen(key: string): Promise<number> {
    const item = this.data.get(key);
    if (!item) return 0;
    
    const list = item.value;
    if (!Array.isArray(list)) return 0;
    
    return list.length;
  }

  async lpop(key: string, count?: number): Promise<string | string[] | null> {
    const item = this.data.get(key);
    if (!item) return null;
    
    const list = item.value;
    if (!Array.isArray(list) || list.length === 0) return null;
    
    if (count && count > 1) {
      const popped = list.splice(0, Math.min(count, list.length));
      this.data.set(key, { value: list, expireAt: item.expireAt });
      return popped.map(v => String(v));
    }
    
    const popped = list.shift();
    this.data.set(key, { value: list, expireAt: item.expireAt });
    return popped ? String(popped) : null;
  }

  async rpop(key: string, count?: number): Promise<string | string[] | null> {
    const item = this.data.get(key);
    if (!item) return null;
    
    const list = item.value;
    if (!Array.isArray(list) || list.length === 0) return null;
    
    if (count && count > 1) {
      const popped = list.splice(-Math.min(count, list.length));
      this.data.set(key, { value: list, expireAt: item.expireAt });
      return popped.map(v => String(v));
    }
    
    const popped = list.pop();
    this.data.set(key, { value: list, expireAt: item.expireAt });
    return popped ? String(popped) : null;
  }

  async brpop(key: string | string[], _timeout: number): Promise<[string, string] | null> {
    const keys = Array.isArray(key) ? key : [key];
    
    for (const k of keys) {
      const result = await this.rpop(k);
      if (result) {
        const value = Array.isArray(result) ? result[0] || '' : result;
        return [k, value];
      }
    }
    
    return null;
  }

  async blpop(key: string | string[], _timeout: number): Promise<[string, string] | null> {
    const keys = Array.isArray(key) ? key : [key];
    
    for (const k of keys) {
      const result = await this.lpop(k);
      if (result) {
        const value = Array.isArray(result) ? result[0] || '' : result;
        return [k, value];
      }
    }
    
    return null;
  }

  // Redis Sorted Set methods
  async zadd(key: string, score: number, member: string): Promise<number> {
    const item = this.data.get(key);
    const zset = item?.value ? new Map(item.value) : new Map<string, number>();
    
    if (item && !(item.value instanceof Map || Array.isArray(item.value))) {
      throw new Error(`Key ${key} is not a sorted set`);
    }
    
    const isNew = !zset.has(member);
    zset.set(member, score);
    
    this.data.set(key, { 
      value: Array.from(zset.entries()),
      expireAt: item?.expireAt 
    });
    
    return isNew ? 1 : 0;
  }

  async zcard(key: string): Promise<number> {
    const item = this.data.get(key);
    if (!item || !Array.isArray(item.value)) return 0;
    return item.value.length;
  }

  async zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number> {
    const item = this.data.get(key);
    if (!item || !Array.isArray(item.value)) return 0;
    
    const zset = new Map<string, number>(item.value);
    let removed = 0;
    
    for (const [member, score] of zset.entries()) {
      if (score >= Number(min) && score <= Number(max)) {
        zset.delete(member);
        removed++;
      }
    }
    
    if (removed > 0) {
      this.data.set(key, {
        value: Array.from(zset.entries()),
        expireAt: item.expireAt
      });
    }
    
    return removed;
  }

  // Lua script support for in-memory (simulated)
  async eval(script: string, numKeys: number, ...args: (string | undefined)[]): Promise<any> {
    // For in-memory cache, we'll simulate the Lua script behavior
    // This is specifically for the rate limiting script
    if (script.includes('ZREMRANGEBYSCORE') && script.includes('ZCARD') && script.includes('ZADD')) {
      // This is the rate limiting script
      const key = args[0] || '';
      const now = parseInt(args[1] || '0');
      const windowMs = parseInt(args[2] || '0');
      const limit = parseInt(args[3] || '0');
      const ttlSeconds = parseInt(args[4] || '0');
      const member = args[5] || '';
      const windowStart = now - windowMs;
      
      // Remove expired entries
      await this.zremrangebyscore(key, 0, windowStart);
      
      // Count current entries
      const count = await this.zcard(key);
      
      // Check if limit exceeded
      if (count >= limit) {
        return 0;
      }
      
      // Add new entry
      await this.zadd(key, now, member);
      
      // Set expiry
      await this.expire(key, ttlSeconds);
      
      return 1;
    }
    
    // For other scripts, return a default value
    return 0;
  }

  // Additional Redis methods
  async incr(key: string): Promise<number> {
    const item = this.data.get(key);
    let value = 0;
    
    if (item) {
      value = parseInt(String(item.value)) || 0;
    }
    
    value++;
    this.data.set(key, { value, expireAt: item?.expireAt });
    return value;
  }

  async decr(key: string): Promise<number> {
    const item = this.data.get(key);
    let value = 0;
    
    if (item) {
      value = parseInt(String(item.value)) || 0;
    }
    
    value--;
    this.data.set(key, { value, expireAt: item?.expireAt });
    return value;
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map(key => this.get(key)));
  }

  async mset(...args: string[]): Promise<string> {
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i];
      const value = args[i + 1];
      if (key && value !== undefined) {
        await this.set(key, value);
      }
    }
    return 'OK';
  }

  async quit(): Promise<string> {
    this.destroy();
    return 'OK';
  }

  // Cleanup method
  destroy() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (this.saveInterval) clearInterval(this.saveInterval);
    if (this.statsInterval) clearInterval(this.statsInterval);
    this.persistToDisk();
  }
}

// Hybrid Redis Client - tries real Redis first, falls back to in-memory
class HybridRedisClient {
  private client: IORedis | EnhancedCache | null = null;
  private isUsingRedis: boolean = false;
  private connectionStatus: 'connecting' | 'connected' | 'failed' = 'connecting';
  private initPromise: Promise<void>;

  constructor() {
    // Initialize asynchronously (log is now in singleton creation block)
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    // Try to connect to real Redis first (Upstash or standard Redis)
    const redisUrl = process.env.REDIS_URL;
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');
    const redisPassword = process.env.REDIS_PASSWORD;

    console.log(`🔍 [Redis] Detecting configuration... REDIS_URL=${!!redisUrl}, Upstash=${!!(upstashUrl && upstashToken)}`);

    try {
      let redisClient: IORedis;
      let actualConnectionUrl: string;
      
      // ✅ PRIORIDADE: REDIS_URL > Upstash REST > Localhost
      // REDIS_URL tem prioridade pois contém a URL completa com senha correta
      if (redisUrl) {
        console.log('🚀 Using REDIS_URL for connection...');
        actualConnectionUrl = redisUrl.replace(/:[^:@]+@/, ':***@');
        redisClient = new IORedis(redisUrl, {
          maxRetriesPerRequest: 5,
          enableOfflineQueue: true,
          connectTimeout: 15000,
          retryStrategy: (times) => {
            if (times > 5) return null;
            return Math.min(times * 200, 2000);
          },
          lazyConnect: false,
        });
      } else if (upstashUrl && upstashToken) {
        // Upstash REST API connection (fallback)
        console.log('🚀 Upstash Redis detected! Converting REST URL to standard Redis...');
        const upstashHost = upstashUrl.replace('https://', '').replace(/\/$/, '').split(':')[0];
        const upstashRedisUrl = `rediss://default:${upstashToken}@${upstashHost}:6379`;
        actualConnectionUrl = `rediss://default:***@${upstashHost}:6379`;
        redisClient = new IORedis(upstashRedisUrl, {
          maxRetriesPerRequest: 5,
          enableOfflineQueue: true,
          connectTimeout: 15000,
          retryStrategy: (times) => {
            if (times > 5) return null;
            return Math.min(times * 200, 2000);
          },
          lazyConnect: false,
        });
      } else {
        // Localhost fallback
        actualConnectionUrl = `${redisHost}:${redisPort}`;
        redisClient = new IORedis({
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          maxRetriesPerRequest: 5,
          enableOfflineQueue: true,
          connectTimeout: 15000,
          retryStrategy: (times) => {
            if (times > 5) return null;
            return Math.min(times * 200, 2000);
          },
          lazyConnect: false,
        });
      }

      // Test connection with ping
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timeout'));
        }, 15000);

        redisClient.ping((err) => {
          clearTimeout(timeout);
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Connection successful
      this.client = redisClient;
      this.isUsingRedis = true;
      this.connectionStatus = 'connected';
      console.log('✅ Redis connected successfully - Using distributed Redis cache');
      console.log(`📡 Redis endpoint: ${actualConnectionUrl}`);

      // Set up error handler for future errors
      redisClient.on('error', (error) => {
        // Log errors but don't fall back once connected
        console.error('Redis error:', error.message);
      });

    } catch (error) {
      // Redis connection failed
      this.connectionStatus = 'failed';
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // In production, fail fast - Redis is required
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ FATAL: Redis connection required in production but failed');
        console.error('Error:', errorMessage);
        console.error('📡 Attempted connection to:', upstashUrl || redisUrl || `${redisHost}:${redisPort}`);
        console.error('💡 Ensure REDIS_URL or UPSTASH_REDIS_REST_URL/TOKEN are correctly configured');
        process.exit(1); // Fail fast - don't start server without Redis
      }
      
      // In development, fall back to in-memory cache
      console.warn('⚠️ Redis connection failed, falling back to in-memory cache (DEV ONLY):', errorMessage);
      console.warn('📝 Note: In-memory cache is for development only. Redis is required for production.');
      
      // Clean up failed Redis connection if it exists
      if (this.client instanceof IORedis) {
        this.client.disconnect();
      }
      
      this.client = new EnhancedCache();
      this.isUsingRedis = false;
    }
  }

  // Ensure initialization is complete before operations
  private async ensureInitialized(): Promise<void> {
    await this.initPromise;
    if (!this.client) {
      throw new Error('Redis client initialization failed');
    }
  }

  // Proxy all Redis methods to the underlying client
  async get(key: string): Promise<string | null> {
    await this.ensureInitialized();
    return this.client!.get(key);
  }

  async set(key: string, value: any, mode?: string, duration?: number): Promise<string> {
    await this.ensureInitialized();
    
    if (this.isUsingRedis && this.client instanceof IORedis) {
      // Use Redis SET with proper arguments
      if (mode === 'EX' && duration) {
        return this.client.set(key, value, 'EX', duration);
      } else if (mode === 'PX' && duration) {
        return this.client.set(key, value, 'PX', duration);
      } else if (typeof mode === 'number') {
        return this.client.setex(key, mode, value);
      }
      return this.client.set(key, value);
    }
    // Use EnhancedCache implementation
    return (this.client as EnhancedCache).set(key, value, mode, duration);
  }

  async setex(key: string, seconds: number, value: string | Buffer | number): Promise<string> {
    await this.ensureInitialized();
    
    if (this.isUsingRedis && this.client instanceof IORedis) {
      return this.client.setex(key, seconds, value);
    }
    return (this.client as EnhancedCache).setex(key, seconds, value);
  }

  async del(key: string | string[]): Promise<number> {
    await this.ensureInitialized();
    return this.client!.del(key as any);
  }

  async exists(key: string | string[]): Promise<number> {
    await this.ensureInitialized();
    return this.client!.exists(key as any);
  }

  async expire(key: string, seconds: number): Promise<number> {
    await this.ensureInitialized();
    return this.client!.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    await this.ensureInitialized();
    return this.client!.ttl(key);
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    await this.ensureInitialized();
    return this.client!.keys(pattern);
  }

  async flushall(): Promise<string> {
    await this.ensureInitialized();
    return this.client!.flushall();
  }

  async ping(): Promise<string> {
    await this.ensureInitialized();
    return this.client!.ping();
  }

  // List methods
  async lpush(key: string, ...values: any[]): Promise<number> {
    await this.ensureInitialized();
    return this.client!.lpush(key, ...values);
  }

  async rpush(key: string, ...values: any[]): Promise<number> {
    await this.ensureInitialized();
    return this.client!.rpush(key, ...values);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    await this.ensureInitialized();
    return this.client!.lrange(key, start, stop);
  }

  async llen(key: string): Promise<number> {
    await this.ensureInitialized();
    return this.client!.llen(key);
  }

  async lpop(key: string, count?: number): Promise<string | string[] | null> {
    await this.ensureInitialized();
    
    if (this.isUsingRedis && this.client instanceof IORedis) {
      if (count && count > 1) {
        return this.client.lpop(key, count);
      }
      return this.client.lpop(key);
    }
    return (this.client as EnhancedCache).lpop(key, count);
  }

  async rpop(key: string, count?: number): Promise<string | string[] | null> {
    await this.ensureInitialized();
    
    if (this.isUsingRedis && this.client instanceof IORedis) {
      if (count && count > 1) {
        return this.client.rpop(key, count);
      }
      return this.client.rpop(key);
    }
    return (this.client as EnhancedCache).rpop(key, count);
  }

  async brpop(key: string | string[], timeout: number): Promise<[string, string] | null> {
    await this.ensureInitialized();
    return this.client!.brpop(key as any, timeout);
  }

  async blpop(key: string | string[], timeout: number): Promise<[string, string] | null> {
    await this.ensureInitialized();
    return this.client!.blpop(key as any, timeout);
  }

  // Sorted set methods
  async zadd(key: string, score: number, member: string): Promise<number> {
    await this.ensureInitialized();
    
    if (this.isUsingRedis && this.client instanceof IORedis) {
      return this.client.zadd(key, score, member);
    }
    return (this.client as EnhancedCache).zadd(key, score, member);
  }

  async zcard(key: string): Promise<number> {
    await this.ensureInitialized();
    
    if (this.isUsingRedis && this.client instanceof IORedis) {
      return this.client.zcard(key);
    }
    return (this.client as EnhancedCache).zcard(key);
  }

  async zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number> {
    await this.ensureInitialized();
    
    if (this.isUsingRedis && this.client instanceof IORedis) {
      return this.client.zremrangebyscore(key, min, max);
    }
    return (this.client as EnhancedCache).zremrangebyscore(key, min, max);
  }

  // Lua script evaluation (critical for rate limiting)
  async eval(script: string, numKeys: number, ...args: string[]): Promise<any> {
    await this.ensureInitialized();
    return this.client!.eval(script, numKeys, ...args);
  }

  // Additional methods
  async incr(key: string): Promise<number> {
    await this.ensureInitialized();
    
    if (this.isUsingRedis && this.client instanceof IORedis) {
      return this.client.incr(key);
    }
    return (this.client as EnhancedCache).incr(key);
  }

  async decr(key: string): Promise<number> {
    await this.ensureInitialized();
    
    if (this.isUsingRedis && this.client instanceof IORedis) {
      return this.client.decr(key);
    }
    return (this.client as EnhancedCache).decr(key);
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    await this.ensureInitialized();
    
    if (this.isUsingRedis && this.client instanceof IORedis) {
      return this.client.mget(...keys);
    }
    return (this.client as EnhancedCache).mget(...keys);
  }

  async mset(...args: string[]): Promise<string> {
    await this.ensureInitialized();
    
    if (this.isUsingRedis && this.client instanceof IORedis) {
      return this.client.mset(...args);
    }
    return (this.client as EnhancedCache).mset(...args);
  }

  // Get connection status
  isRedisConnected(): boolean {
    return this.isUsingRedis;
  }

  // Get cache metrics (only for in-memory)
  getCacheMetrics() {
    if (this.client instanceof EnhancedCache) {
      return this.client.getMetrics();
    }
    return null;
  }

  // Cleanup
  async quit(): Promise<string> {
    await this.ensureInitialized();
    
    if (this.client instanceof IORedis) {
      await this.client.quit();
    } else if (this.client instanceof EnhancedCache) {
      return this.client.quit();
    }
    return 'OK';
  }
}

// Global singleton for the hybrid Redis client
declare global {
  // eslint-disable-next-line no-var
  var __hybridRedisClient: HybridRedisClient | undefined;
  // eslint-disable-next-line no-var
  var __redisShutdownHandlerRegistered: boolean | undefined;
}

// Create or reuse the singleton instance
let redis: HybridRedisClient;

if (!global.__hybridRedisClient) {
  console.log('🔧 [Redis] Creating new HybridRedisClient singleton instance');
  redis = new HybridRedisClient();
  global.__hybridRedisClient = redis;
} else {
  redis = global.__hybridRedisClient;
}

// Export cache metrics function for monitoring
export function getCacheMetrics() {
  return redis.getCacheMetrics();
}

// Graceful shutdown handlers - prevent duplicate listeners on hot-reload
if (typeof process !== 'undefined' && !global.__redisShutdownHandlerRegistered) {
  const shutdownHandler = async () => {
    await redis.quit();
    process.exit(0);
  };

  process.once('SIGINT', shutdownHandler);
  process.once('SIGTERM', shutdownHandler);
  global.__redisShutdownHandlerRegistered = true;
  console.log('🔧 [Redis] Registered shutdown handlers (SIGINT, SIGTERM)');
}

// Export as default for compatibility
export default redis;

// Also export the client instance for named imports
export { redis };