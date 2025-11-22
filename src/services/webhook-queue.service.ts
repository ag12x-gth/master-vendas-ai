import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import crypto from 'crypto';
import { WebhookPayload } from './webhook-dispatcher.service';
import { createRedisConnection } from '@/lib/redis-connection';

interface WebhookJobData {
  webhookId: string;
  url: string;
  secret: string;
  payload: WebhookPayload;
  subscriptionName: string;
  retryCount?: number;
  attempts?: number;
  createdAt?: number;
  processAt?: number;
}

interface JobResult {
  status: number;
  body: string;
  timestamp: string;
}

/**
 * REAL BullMQ implementation for webhook queue processing
 * This replaces the fake in-memory implementation with proper Redis-backed queuing
 */
export class WebhookQueueService {
  private queue: Queue<WebhookJobData>;
  private worker: Worker<WebhookJobData, JobResult> | null = null;
  private queueEvents: QueueEvents;
  private readonly queueName = 'webhook-queue';
  private readonly CONCURRENCY = 10;
  private readonly MAX_RETRIES = 3;
  private isShuttingDown = false;
  private metricsInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    // Initialize BullMQ Queue with Redis connection
    const connection = createRedisConnection();
    
    this.queue = new Queue<WebhookJobData>(this.queueName, {
      connection,
      defaultJobOptions: {
        attempts: this.MAX_RETRIES,
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 seconds
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
          count: 500, // Keep last 500 failed jobs
        },
      },
    });

    // Initialize QueueEvents for monitoring
    this.queueEvents = new QueueEvents(this.queueName, {
      connection: createRedisConnection(), // Separate connection for events
    });

    // Start the worker
    this.startWorker();
    
    // Start metrics reporting
    this.startMetricsReporter();
    
    // Setup graceful shutdown
    this.setupGracefulShutdown();

    console.log('✅ [WebhookQueue] REAL BullMQ service initialized with Redis-backed queue');
    console.log(`✅ [WebhookQueue] Queue name: ${this.queueName}, Concurrency: ${this.CONCURRENCY}`);
  }

  /**
   * Start the BullMQ Worker to process jobs
   */
  private startWorker() {
    this.worker = new Worker<WebhookJobData, JobResult>(
      this.queueName,
      async (job: Job<WebhookJobData>) => {
        return await this.processJob(job);
      },
      {
        connection: createRedisConnection(), // Separate connection for worker
        concurrency: this.CONCURRENCY,
        autorun: true,
        lockDuration: 30000, // 30 seconds lock duration
        stalledInterval: 30000, // Check for stalled jobs every 30 seconds
        maxStalledCount: 2, // Max times a job can be marked as stalled
      }
    );

    // Worker event handlers
    this.worker.on('completed', (job) => {
      console.log(
        `✅ [WebhookQueue] Job ${job.id} completed successfully for ${job.data.subscriptionName}`
      );
    });

    this.worker.on('failed', (job, err) => {
      console.error(
        `❌ [WebhookQueue] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
        err.message
      );
    });

    this.worker.on('active', (job) => {
      console.log(
        `🔄 [WebhookQueue] Processing job ${job.id} (attempt ${job.attemptsMade}/${this.MAX_RETRIES})`
      );
    });

    this.worker.on('stalled', (jobId) => {
      console.warn(`⚠️ [WebhookQueue] Job ${jobId} has stalled and will be retried`);
    });

    this.worker.on('error', (err) => {
      console.error('❌ [WebhookQueue] Worker error:', err);
    });

    console.log(`✅ [WebhookQueue] BullMQ Worker started with concurrency: ${this.CONCURRENCY}`);
  }

  /**
   * Process a webhook job
   */
  private async processJob(job: Job<WebhookJobData>): Promise<JobResult> {
    const startTime = Date.now();
    const { data } = job;

    try {
      // Update job progress
      await job.updateProgress(10);

      console.log(
        `🔄 [WebhookQueue] Processing webhook ${job.id} for ${data.subscriptionName} (${data.payload.eventType})`
      );

      // Send the webhook
      const result = await this.sendWebhook(data);
      
      // Update job progress
      await job.updateProgress(100);

      // Update database status to delivered
      if (data.webhookId) {
        const { webhookDispatcher } = await import('./webhook-dispatcher.service');
        await webhookDispatcher.updateWebhookStatus(
          data.webhookId,
          'delivered',
          result,
          null
        );
      }

      const processingTime = Date.now() - startTime;
      console.log(
        `✅ [WebhookQueue] Successfully sent webhook ${job.id} to ${data.url} (${processingTime}ms)`
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log the failure
      await job.log(`Failed to send webhook: ${errorMessage}`);

      // If this is the last attempt, update database status to failed
      if (job.attemptsMade >= this.MAX_RETRIES - 1) {
        if (data.webhookId) {
          const { webhookDispatcher } = await import('./webhook-dispatcher.service');
          await webhookDispatcher.updateWebhookStatus(
            data.webhookId,
            'failed',
            {
              error: errorMessage,
              attempt: job.attemptsMade + 1,
            },
            null
          );
        }
        
        console.error(
          `❌ [WebhookQueue] Job ${job.id} failed permanently after ${job.attemptsMade + 1} attempts (${processingTime}ms)`
        );
      } else {
        // Update status to retrying
        if (data.webhookId) {
          const { webhookDispatcher } = await import('./webhook-dispatcher.service');
          const nextRetryTime = new Date(Date.now() + this.getRetryDelay(job.attemptsMade + 1));
          await webhookDispatcher.updateWebhookStatus(
            data.webhookId,
            'retrying',
            {
              error: errorMessage,
              attempt: job.attemptsMade + 1,
            },
            nextRetryTime
          );
        }
        
        console.log(
          `⚠️ [WebhookQueue] Job ${job.id} failed (attempt ${job.attemptsMade + 1}), will retry (${processingTime}ms)`
        );
      }

      // Throw error to trigger BullMQ retry mechanism
      throw error;
    }
  }

  /**
   * Add a webhook to the queue
   */
  async addWebhook(data: WebhookJobData): Promise<{ id: string }> {
    try {
      const job = await this.queue.add(
        `webhook-${data.subscriptionName}-${data.payload.eventType}`,
        data,
        {
          priority: data.payload.eventType === 'message_received' ? 1 : 0, // Higher priority for messages
          delay: data.processAt ? data.processAt - Date.now() : 0,
        }
      );

      console.log(
        `📋 [WebhookQueue] Queued webhook job ${job.id} for ${data.subscriptionName} (${data.payload.eventType})`
      );

      return { id: job.id || `webhook-${Date.now()}` };
    } catch (error) {
      console.error('[WebhookQueue] Error adding webhook to queue:', error);
      throw error;
    }
  }

  private async sendWebhook(data: WebhookJobData): Promise<JobResult> {
    const { url, secret, payload } = data;
    const payloadString = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.eventType,
          'X-Webhook-Timestamp': payload.timestamp,
          'X-Webhook-Retry-Count': String(data.retryCount || 0),
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${responseText.slice(0, 500)}`
        );
      }

      return {
        status: response.status,
        body: responseText.slice(0, 1000),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      clearTimeout(timeout);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Webhook request timeout after 10 seconds');
        }
        throw error;
      }
      
      throw new Error('Unknown error sending webhook');
    }
  }


  private getRetryDelay(attemptNumber: number): number {
    // Exponential backoff: 2s, 4s, 8s, 16s, 32s, 64s...
    const baseDelay = 2000; // 2 seconds
    const maxDelay = 64000; // 64 seconds max
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
    return delay;
  }

  /**
   * Get queue metrics using BullMQ's built-in methods
   */
  async getQueueMetrics() {
    try {
      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
        this.queue.getPausedCount(),
      ]);

      const metrics = {
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused,
        total: waiting + active + delayed + paused,
      };

      return metrics;
    } catch (error) {
      console.error('[WebhookQueue] Error getting queue metrics:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
        total: 0,
      };
    }
  }

  /**
   * Start metrics reporting
   */
  private startMetricsReporter() {
    // Report metrics every minute
    this.metricsInterval = setInterval(async () => {
      await this.reportMetrics();
    }, 60000);

    // Also report immediately after 5 seconds
    setTimeout(() => this.reportMetrics(), 5000);

    // Allow Node to exit if this is the only timer
    if (this.metricsInterval?.unref) {
      this.metricsInterval.unref();
    }
  }

  /**
   * Report queue metrics
   */
  private async reportMetrics() {
    try {
      const metrics = await this.getQueueMetrics();
      const jobCounts = await this.queue.getJobCounts();
      
      console.log('📊 [WebhookQueue] BullMQ Metrics Report:');
      console.log(`  - Waiting: ${metrics.waiting}`);
      console.log(`  - Active: ${metrics.active}`);
      console.log(`  - Delayed: ${metrics.delayed}`);
      console.log(`  - Completed: ${metrics.completed}`);
      console.log(`  - Failed: ${metrics.failed}`);
      console.log(`  - Paused: ${metrics.paused}`);
      console.log(`  - Total in Queue: ${metrics.total}`);
      
      // Additional job counts from BullMQ
      if (jobCounts) {
        console.log('📊 [WebhookQueue] Job Counts:');
        Object.entries(jobCounts).forEach(([status, count]) => {
          console.log(`  - ${status}: ${count}`);
        });
      }
    } catch (error) {
      console.error('[WebhookQueue] Error reporting metrics:', error);
    }
  }

  /**
   * Pause the queue
   */
  async pauseQueue(): Promise<void> {
    await this.queue.pause();
    console.log('⏸️ [WebhookQueue] Queue paused');
  }

  /**
   * Resume the queue
   */
  async resumeQueue(): Promise<void> {
    await this.queue.resume();
    console.log('▶️ [WebhookQueue] Queue resumed');
  }

  /**
   * Retry failed jobs from dead letter queue
   */
  async retryDeadLetterJobs(limit: number = 10): Promise<number> {
    try {
      const failedJobs = await this.queue.getFailed(0, limit);
      let retriedCount = 0;

      for (const job of failedJobs) {
        await job.retry();
        retriedCount++;
      }

      console.log(`🔄 [WebhookQueue] Retried ${retriedCount} failed jobs`);
      return retriedCount;
    } catch (error) {
      console.error('[WebhookQueue] Error retrying failed jobs:', error);
      return 0;
    }
  }

  /**
   * Clean completed and failed jobs
   */
  async cleanOldJobs(grace: number = 3600000): Promise<void> {
    try {
      // Clean completed jobs older than grace period
      const completedRemoved = await this.queue.clean(grace, 1000, 'completed');
      console.log(`🧹 [WebhookQueue] Removed ${completedRemoved.length} old completed jobs`);

      // Clean failed jobs older than 7 days
      const failedRemoved = await this.queue.clean(7 * 24 * 3600000, 1000, 'failed');
      console.log(`🧹 [WebhookQueue] Removed ${failedRemoved.length} old failed jobs`);
    } catch (error) {
      console.error('[WebhookQueue] Error cleaning old jobs:', error);
    }
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown() {
    const shutdownHandler = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      console.log('🛑 [WebhookQueue] Initiating graceful shutdown...');

      try {
        // Stop accepting new jobs
        await this.queue.pause();

        // Clear intervals
        if (this.metricsInterval) {
          clearInterval(this.metricsInterval);
        }

        // Close worker
        if (this.worker) {
          await this.worker.close();
        }

        // Close queue events
        await this.queueEvents.close();

        // Close queue
        await this.queue.close();

        console.log('✅ [WebhookQueue] Graceful shutdown complete');
      } catch (error) {
        console.error('❌ [WebhookQueue] Error during shutdown:', error);
      }
    };

    // Handle different shutdown signals
    process.on('SIGTERM', shutdownHandler);
    process.on('SIGINT', shutdownHandler);
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<{ isPaused: boolean; isReady: boolean }> {
    try {
      const isPaused = await this.queue.isPaused();
      const isReady = await this.worker?.isRunning() || false;

      return {
        isPaused,
        isReady,
      };
    } catch (error) {
      console.error('[WebhookQueue] Error getting queue status:', error);
      return {
        isPaused: false,
        isReady: false,
      };
    }
  }
}

// Create singleton instance
export const webhookQueue = new WebhookQueueService();