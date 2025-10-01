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

// Create Redis client or enhanced cache based on environment
let redis: any;

if (process.env.REDIS_URL) {
  // Use real Redis if URL is provided
  redis = new Redis(process.env.REDIS_URL);
  redis.on('error', (err: any) => console.error('Redis Client Error', err));
  redis.on('connect', () => console.log('✅ Connected to external Redis'));
} else {
  // Use enhanced cache for production without external Redis
  console.log('📦 Using Replit Enhanced Cache (production-ready in-memory + disk persistence)');
  redis = new EnhancedCache();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    if (redis instanceof EnhancedCache) {
      redis.destroy();
    }
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    if (redis instanceof EnhancedCache) {
      redis.destroy();
    }
    process.exit(0);
  });
}

// Export cache metrics function for monitoring
export function getCacheMetrics() {
  if (redis instanceof EnhancedCache) {
    return redis.getMetrics();
  }
  return null;
}

export default redis;