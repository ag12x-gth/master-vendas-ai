/**
 * API Performance Metrics Service
 * 
 * Tracks latency (P50, P95, P99) and throughput for external API calls:
 * - Meta WhatsApp API
 * - SMS (Witi, Seven.io)
 * - Vapi Voice Calls
 * - OpenAI/Google Gemini
 * 
 * Uses Redis Sorted Sets for efficient percentile calculation
 * Metrics retention: 24 hours rolling window
 */

import redis from '@/lib/redis';

export type ApiProvider = 
  | 'meta' 
  | 'sms_witi' 
  | 'sms_seven' 
  | 'vapi' 
  | 'openai' 
  | 'google';

export interface ApiMetricsData {
  provider: ApiProvider;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number; // requests per minute
  errorRate: number; // percentage
  lastUpdated: string;
}

export class ApiMetrics {
  private static readonly METRICS_PREFIX = 'api_metrics';
  private static readonly LATENCY_TTL = 86400; // 24 hours
  private static readonly COUNTER_TTL = 3600; // 1 hour for throughput calculation

  /**
   * Record API call latency and outcome
   */
  static async recordApiCall(
    provider: ApiProvider,
    latencyMs: number,
    success: boolean
  ): Promise<void> {
    try {
      const now = Date.now();
      const latencyKey = `${this.METRICS_PREFIX}:${provider}:latency`;
      const successKey = `${this.METRICS_PREFIX}:${provider}:success`;
      const failureKey = `${this.METRICS_PREFIX}:${provider}:failure`;
      const totalKey = `${this.METRICS_PREFIX}:${provider}:total`;

      const pipeline = redis.pipeline();
      
      // Store latency with timestamp as score (for time-based cleanup)
      pipeline.zadd(latencyKey, now, `${now}-${latencyMs}`);
      pipeline.expire(latencyKey, this.LATENCY_TTL);
      
      // Increment counters
      pipeline.incr(totalKey);
      if (success) {
        pipeline.incr(successKey);
      } else {
        pipeline.incr(failureKey);
      }
      
      // Set TTL on counters
      pipeline.expire(totalKey, this.COUNTER_TTL);
      pipeline.expire(successKey, this.COUNTER_TTL);
      pipeline.expire(failureKey, this.COUNTER_TTL);
      
      await pipeline.exec();
    } catch (error) {
      console.error(`[ApiMetrics] Error recording metric for ${provider}:`, error);
    }
  }

  /**
   * Get metrics for a specific provider
   */
  static async getProviderMetrics(provider: ApiProvider): Promise<ApiMetricsData> {
    try {
      const latencyKey = `${this.METRICS_PREFIX}:${provider}:latency`;
      const successKey = `${this.METRICS_PREFIX}:${provider}:success`;
      const failureKey = `${this.METRICS_PREFIX}:${provider}:failure`;
      const totalKey = `${this.METRICS_PREFIX}:${provider}:total`;
      
      // Get counters
      const [total, successful, failed] = await Promise.all([
        redis.get(totalKey).then((val: string | null) => parseInt(val || '0')),
        redis.get(successKey).then((val: string | null) => parseInt(val || '0')),
        redis.get(failureKey).then((val: string | null) => parseInt(val || '0'))
      ]);
      
      // Get latency values from last 24h
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      
      // Remove expired entries
      await redis.zremrangebyscore(latencyKey, 0, oneDayAgo);
      
      // Get all latency values
      const latencyEntries: string[] = (await redis.zrange(latencyKey, 0, -1)) || [];
      const latencies = latencyEntries
        .map((entry: string) => {
          const parts = entry.split('-');
          return parseInt(parts[parts.length - 1] || '0');
        })
        .filter((latency: number) => !isNaN(latency))
        .sort((a: number, b: number) => a - b);
      
      // Calculate percentiles
      const p50 = latencies.length > 0 ? this.calculatePercentile(latencies, 50) : 0;
      const p95 = latencies.length > 0 ? this.calculatePercentile(latencies, 95) : 0;
      const p99 = latencies.length > 0 ? this.calculatePercentile(latencies, 99) : 0;
      const avg = latencies.length > 0 
        ? latencies.reduce((sum: number, val: number) => sum + val, 0) / latencies.length 
        : 0;
      
      // Calculate throughput (requests per minute)
      const throughput = total > 0 ? (total / 60) : 0;
      
      // Calculate error rate
      const errorRate = total > 0 ? ((failed / total) * 100) : 0;
      
      return {
        provider,
        totalRequests: total,
        successfulRequests: successful,
        failedRequests: failed,
        avgLatency: Math.round(avg),
        p50Latency: p50,
        p95Latency: p95,
        p99Latency: p99,
        throughput: Math.round(throughput * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[ApiMetrics] Error getting metrics for ${provider}:`, error);
      return this.getEmptyMetrics(provider);
    }
  }

  /**
   * Get metrics for all providers
   */
  static async getAllMetrics(): Promise<ApiMetricsData[]> {
    const providers: ApiProvider[] = [
      'meta',
      'sms_witi',
      'sms_seven',
      'vapi',
      'openai',
      'google'
    ];
    
    return Promise.all(
      providers.map(provider => this.getProviderMetrics(provider))
    );
  }

  /**
   * Calculate percentile from sorted array
   */
  private static calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)] || 0;
  }

  /**
   * Get empty metrics structure
   */
  private static getEmptyMetrics(provider: ApiProvider): ApiMetricsData {
    return {
      provider,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      throughput: 0,
      errorRate: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Clear all metrics (for testing/debugging)
   */
  static async clearMetrics(provider?: ApiProvider): Promise<void> {
    try {
      if (provider) {
        const keys = [
          `${this.METRICS_PREFIX}:${provider}:latency`,
          `${this.METRICS_PREFIX}:${provider}:success`,
          `${this.METRICS_PREFIX}:${provider}:failure`,
          `${this.METRICS_PREFIX}:${provider}:total`
        ];
        await redis.del(...keys);
      } else {
        // Clear all metrics
        const pattern = `${this.METRICS_PREFIX}:*`;
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
    } catch (error) {
      console.error('[ApiMetrics] Error clearing metrics:', error);
    }
  }
}

/**
 * Utility function to wrap API calls with metrics tracking
 */
export async function trackApiCall<T>(
  provider: ApiProvider,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let success = true;
  
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const latency = Date.now() - startTime;
    
    // Record metrics asynchronously (don't block the response)
    ApiMetrics.recordApiCall(provider, latency, success).catch(err => {
      console.error('[ApiMetrics] Failed to record metric:', err);
    });
  }
}
