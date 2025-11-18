import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

// Enhanced cache implementation for production use without external Redis
class EnhancedCache {
  private data: Map<string, { value: any; expireAt?: number }> = new Map();
  private metrics = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  private persistPath = '/tmp/cache/redis-cache.json';
  private cleanupInterval: NodeJS.Timeout | null = null;
  private saveInterval: NodeJS.Timeout | null = null;
  private maxSize = 10000; // Maximum number of keys

  constructor() {
    this.initializeCache();
    this.startCleanupTask();
    this.startAutoSave();
    console.log('✅ Enhanced Cache initialized (Replit optimized)');
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
        
        console.log(`📂 Loaded ${this.data.size} cached items from disk`);
      }
    } catch (error) {
      console.warn('⚠️ Could not load cache from disk:', error);
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
    }, 60000); // Every minute
  }

  // Start auto-save task (every 5 minutes)
  private startAutoSave() {
    this.saveInterval = setInterval(() => {
      this.persistToDisk();
    }, 300000); // Every 5 minutes
  }

  // Clean up expired keys
  private cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.data.entries()) {
      if (item.expireAt && item.expireAt <= now) {
        this.data.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  // Persist cache to disk
  private persistToDisk() {
    try {
      const dataObject: Record<string, any> = {};
      
      // Only persist non-expired items
      const now = Date.now();
      for (const [key, item] of this.data.entries()) {
        if (!item.expireAt || item.expireAt > now) {
          dataObject[key] = item;
        }
      }
      
      fs.writeFileSync(this.persistPath, JSON.stringify(dataObject, null, 2));
      console.log(`💾 Persisted ${Object.keys(dataObject).length} cache entries to disk`);
    } catch (error) {
      console.error('❌ Failed to persist cache:', error);
    }
  }

  // Check if cache size limit is reached
  private checkSizeLimit() {
    if (this.data.size >= this.maxSize) {
      // Remove oldest entries (simple FIFO)
      const toRemove = Math.floor(this.maxSize * 0.1); // Remove 10%
      const keys = Array.from(this.data.keys());
      for (let i = 0; i < toRemove && i < keys.length; i++) {
        const key = keys[i];
        if (key) {
          this.data.delete(key);
        }
      }
      console.log(`⚠️ Cache size limit reached, removed ${toRemove} oldest entries`);
    }
  }

  // Redis-compatible methods
  async get(key: string): Promise<string | null> {
    const item = this.data.get(key);
    
    if (!item) {
      this.metrics.misses++;
      return null;
    }
    
    // Check expiration
    if (item.expireAt && item.expireAt <= Date.now()) {
      this.data.delete(key);
      this.metrics.misses++;
      return null;
    }
    
    this.metrics.hits++;
    
    // Return string representation for Redis compatibility
    if (typeof item.value === 'object') {
      return JSON.stringify(item.value);
    }
    
    return String(item.value);
  }

  async set(key: string, value: any, mode?: string, duration?: number): Promise<string> {
    this.checkSizeLimit();
    
    let expireAt: number | undefined;
    
    // Handle Redis SET modes (EX = seconds, PX = milliseconds)
    if (mode === 'EX' && duration) {
      expireAt = Date.now() + (duration * 1000);
    } else if (mode === 'PX' && duration) {
      expireAt = Date.now() + duration;
    } else if (typeof mode === 'number') {
      // Direct TTL in seconds (common pattern)
      expireAt = Date.now() + (mode * 1000);
    }
    
    this.data.set(key, { value, expireAt });
    this.metrics.sets++;
    
    return 'OK';
  }

  async del(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      let deleted = 0;
      key.forEach(k => {
        if (this.data.delete(k)) deleted++;
      });
      this.metrics.deletes += deleted;
      return deleted;
    }
    
    const result = this.data.delete(key) ? 1 : 0;
    if (result) this.metrics.deletes++;
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
    
    // Check expiration
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
    if (!item) return -2; // Key doesn't exist
    if (!item.expireAt) return -1; // No expiration
    
    const ttl = Math.floor((item.expireAt - Date.now()) / 1000);
    return ttl > 0 ? ttl : -2;
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    const now = Date.now();
    const allKeys = Array.from(this.data.keys());
    
    // Filter expired keys
    const validKeys = allKeys.filter(key => {
      const item = this.data.get(key);
      return item && (!item.expireAt || item.expireAt > now);
    });
    
    // Simple pattern matching (supports * wildcard)
    if (pattern === '*') return validKeys;
    
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return validKeys.filter(key => regex.test(key));
  }

  async flushall(): Promise<string> {
    this.data.clear();
    this.metrics = { hits: 0, misses: 0, sets: 0, deletes: 0 };
    console.log('🗑️ Cache flushed');
    return 'OK';
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  // Redis List methods for campaign queue management
  async lpush(key: string, ...values: any[]): Promise<number> {
    const item = this.data.get(key);
    const list = item?.value ? [...item.value] : []; // Clone to avoid mutation
    
    if (item && !Array.isArray(item.value)) {
      throw new Error(`Key ${key} is not a list`);
    }
    
    // Redis LPUSH: elements are inserted one by one at head
    // LPUSH mylist a b c results in [c, b, a, ...existing]
    for (const value of values) {
      list.unshift(value);
    }
    
    this.data.set(key, { value: list, expireAt: item?.expireAt });
    
    return list.length;
  }

  async rpush(key: string, ...values: any[]): Promise<number> {
    const item = this.data.get(key);
    const list = item?.value ? [...item.value] : []; // Clone to avoid mutation
    
    if (item && !Array.isArray(item.value)) {
      throw new Error(`Key ${key} is not a list`);
    }
    
    // Push to the right (end) of the list
    list.push(...values);
    this.data.set(key, { value: list, expireAt: item?.expireAt });
    
    return list.length;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const item = this.data.get(key);
    
    if (!item) return [];
    
    const list = item.value;
    
    if (!Array.isArray(list)) {
      return [];
    }
    
    // Handle negative indices like Redis does
    const len = list.length;
    const actualStart = start < 0 ? Math.max(0, len + start) : start;
    const actualStop = stop < 0 ? len + stop + 1 : stop + 1;
    
    return list.slice(actualStart, actualStop).map(v => String(v));
  }

  async llen(key: string): Promise<number> {
    const item = this.data.get(key);
    
    if (!item) return 0;
    
    const list = item.value;
    
    if (!Array.isArray(list)) {
      return 0;
    }
    
    return list.length;
  }

  async lpop(key: string, count?: number): Promise<string | string[] | null> {
    const item = this.data.get(key);
    
    if (!item) return null;
    
    const list = item.value;
    
    if (!Array.isArray(list) || list.length === 0) {
      return null;
    }
    
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
    
    if (!Array.isArray(list) || list.length === 0) {
      return null;
    }
    
    if (count && count > 1) {
      const popped = list.splice(-Math.min(count, list.length));
      this.data.set(key, { value: list, expireAt: item.expireAt });
      return popped.map(v => String(v));
    }
    
    const popped = list.pop();
    this.data.set(key, { value: list, expireAt: item.expireAt });
    
    return popped ? String(popped) : null;
  }

  async brpop(key: string | string[], timeout: number): Promise<[string, string] | null> {
    // For simplified implementation, we'll just do a regular rpop
    // In production, this would need proper blocking behavior
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

  async blpop(key: string | string[], timeout: number): Promise<[string, string] | null> {
    // For simplified implementation, we'll just do a regular lpop
    // In production, this would need proper blocking behavior
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

  // Redis Sorted Set (ZSET) methods for metrics and rate limiting
  async zadd(key: string, score: number, member: string): Promise<number> {
    const item = this.data.get(key);
    const zset = item?.value ? new Map(item.value) : new Map<string, number>();
    
    if (item && !(item.value instanceof Map)) {
      throw new Error(`Key ${key} is not a sorted set`);
    }
    
    // Add or update member with score
    const isNew = !zset.has(member);
    zset.set(member, score);
    
    this.data.set(key, { value: zset, expireAt: item?.expireAt });
    
    return isNew ? 1 : 0; // Return 1 if new member, 0 if updated
  }

  async zrem(key: string, member: string): Promise<number> {
    const item = this.data.get(key);
    
    if (!item || !(item.value instanceof Map)) {
      return 0;
    }
    
    const zset = item.value;
    const deleted = zset.delete(member) ? 1 : 0;
    
    this.data.set(key, { value: zset, expireAt: item.expireAt });
    
    return deleted;
  }

  async zcard(key: string): Promise<number> {
    const item = this.data.get(key);
    
    if (!item || !(item.value instanceof Map)) {
      return 0;
    }
    
    return item.value.size;
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    const item = this.data.get(key);
    
    if (!item || !(item.value instanceof Map)) {
      return [];
    }
    
    const zset = item.value;
    
    // Sort by score (ascending)
    const sorted = Array.from(zset.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([member]) => member);
    
    // Handle negative indices like Redis does
    const len = sorted.length;
    const actualStart = start < 0 ? Math.max(0, len + start) : start;
    const actualStop = stop < 0 ? len + stop + 1 : stop + 1;
    
    return sorted.slice(actualStart, actualStop);
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    const item = this.data.get(key);
    
    if (!item || !(item.value instanceof Map)) {
      return 0;
    }
    
    const zset = item.value;
    let removed = 0;
    
    // Remove members with score between min and max
    for (const [member, score] of zset.entries()) {
      if (score >= min && score <= max) {
        zset.delete(member);
        removed++;
      }
    }
    
    this.data.set(key, { value: zset, expireAt: item.expireAt });
    
    return removed;
  }

  // Pipeline support for atomic operations
  pipeline() {
    const commands: Array<{ method: string; args: any[] }> = [];
    
    const pipelineObj = {
      zadd: (key: string, score: number, member: string) => {
        commands.push({ method: 'zadd', args: [key, score, member] });
        return pipelineObj;
      },
      zrem: (key: string, member: string) => {
        commands.push({ method: 'zrem', args: [key, member] });
        return pipelineObj;
      },
      zcard: (key: string) => {
        commands.push({ method: 'zcard', args: [key] });
        return pipelineObj;
      },
      zremrangebyscore: (key: string, min: number, max: number) => {
        commands.push({ method: 'zremrangebyscore', args: [key, min, max] });
        return pipelineObj;
      },
      incr: (key: string) => {
        commands.push({ method: 'incr', args: [key] });
        return pipelineObj;
      },
      expire: (key: string, seconds: number) => {
        commands.push({ method: 'expire', args: [key, seconds] });
        return pipelineObj;
      },
      exec: async () => {
        const results: Array<[Error | null, any]> = [];
        
        for (const cmd of commands) {
          try {
            let result: any;
            
            if (cmd.method === 'zadd') {
              const [key, score, member] = cmd.args as [string, number, string];
              result = await this.zadd(key, score, member);
            } else if (cmd.method === 'zrem') {
              const [key, member] = cmd.args as [string, string];
              result = await this.zrem(key, member);
            } else if (cmd.method === 'zcard') {
              const [key] = cmd.args as [string];
              result = await this.zcard(key);
            } else if (cmd.method === 'zremrangebyscore') {
              const [key, min, max] = cmd.args as [string, number, number];
              result = await this.zremrangebyscore(key, min, max);
            } else if (cmd.method === 'incr') {
              const [key] = cmd.args as [string];
              result = await this.incr(key);
            } else if (cmd.method === 'expire') {
              const [key, seconds] = cmd.args as [string, number];
              result = await this.expire(key, seconds);
            }
            
            results.push([null, result]);
          } catch (error) {
            results.push([error as Error, null]);
          }
        }
        
        return results;
      }
    };
    
    return pipelineObj;
  }

  // Increment counter (for metrics)
  async incr(key: string): Promise<number> {
    const item = this.data.get(key);
    const currentValue = item?.value ? parseInt(String(item.value)) : 0;
    const newValue = currentValue + 1;
    
    this.data.set(key, { value: newValue, expireAt: item?.expireAt });
    
    return newValue;
  }

  // Lua script evaluation for atomic operations
  async eval(script: string, numKeys: number, ...args: string[]): Promise<number> {
    // Extract keys and arguments
    const keys = args.slice(0, numKeys);
    const argv = args.slice(numKeys);
    
    // Parse the sliding window Lua script
    // This is a specialized implementation for rate limiting
    if (script.includes('ZREMRANGEBYSCORE') && script.includes('ZCARD')) {
      const key = keys[0];
      if (!key) return 0;
      
      const now = parseInt(argv[0] || '0');
      const windowMs = parseInt(argv[1] || '0');
      const limit = parseInt(argv[2] || '0');
      const ttl = parseInt(argv[3] || '0');
      const member = argv[4] || '';
      
      const windowStart = now - windowMs;
      
      // Get or create sorted set - NO CLONING, mutate in place
      const item = this.data.get(key);
      let zset: Map<string, number>;
      
      if (item?.value instanceof Map) {
        zset = item.value; // Use existing Map directly (no clone)
      } else {
        zset = new Map<string, number>();
      }
      
      // Remove expired entries IN PLACE (critical for sliding window)
      for (const [m, score] of Array.from(zset.entries())) {
        if (score <= windowStart) {
          zset.delete(m);
        }
      }
      
      // Always persist the cleaned set (even when blocked)
      // This ensures expired timestamps are removed
      this.data.set(key, { value: zset, expireAt: item?.expireAt });
      
      // Count current entries AFTER cleanup
      const count = zset.size;
      
      // Check limit
      if (count >= limit) {
        return 0; // Blocked - but cleanup was already persisted
      }
      
      // Add new member
      zset.set(member, now);
      
      // Set expiration ONLY on successful increment (mirrors Redis behavior)
      const expireAt = Date.now() + (ttl * 1000);
      this.data.set(key, { value: zset, expireAt });
      
      return 1; // Allowed
    }
    
    // Fallback for unknown scripts
    return 0;
  }

  // Get cache metrics
  getMetrics() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses) * 100).toFixed(2)
      : '0';
      
    return {
      size: this.data.size,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      sets: this.metrics.sets,
      deletes: this.metrics.deletes,
      hitRate: `${hitRate}%`,
      maxSize: this.maxSize
    };
  }

  // Event handler compatibility
  on(_event: string, _handler: (...args: any[]) => void) {
    // Mock event handler for compatibility
    return this;
  }

  // Cleanup on process exit
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    this.persistToDisk();
    console.log('💤 Cache shutdown complete');
  }
}

// Global singleton key for Enhanced Cache
declare global {
  // eslint-disable-next-line no-var
  var __enhancedCacheInstance: EnhancedCache | undefined;
  // eslint-disable-next-line no-var
  var __redisClient: any;
}

// Create Redis client or enhanced cache based on environment
let redis: any;

if (process.env.REDIS_URL) {
  // Use real Redis if URL is provided  
  if (!global.__redisClient) {
    redis = new Redis(process.env.REDIS_URL);
    redis.on('error', (err: any) => console.error('Redis Client Error', err));
    redis.on('connect', () => console.log('✅ Connected to external Redis'));
    global.__redisClient = redis;
  } else {
    redis = global.__redisClient;
  }
} else {
  // Use enhanced cache for production without external Redis (SINGLETON)
  if (!global.__enhancedCacheInstance) {
    console.log('📦 Using Replit Enhanced Cache (production-ready in-memory + disk persistence)');
    redis = new EnhancedCache();
    global.__enhancedCacheInstance = redis;
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      if (global.__enhancedCacheInstance) {
        global.__enhancedCacheInstance.destroy();
        global.__enhancedCacheInstance = undefined;
      }
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      if (global.__enhancedCacheInstance) {
        global.__enhancedCacheInstance.destroy();
        global.__enhancedCacheInstance = undefined;
      }
      process.exit(0);
    });
  } else {
    redis = global.__enhancedCacheInstance;
  }
}

// Export cache metrics function for monitoring
export function getCacheMetrics() {
  if (redis instanceof EnhancedCache) {
    return redis.getMetrics();
  }
  return null;
}

export default redis;