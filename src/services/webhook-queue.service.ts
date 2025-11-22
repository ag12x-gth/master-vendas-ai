import crypto from 'crypto';
import { WebhookPayload } from './webhook-dispatcher.service';

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

interface WebhookMetrics {
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  totalRetries: number;
  totalInDeadLetter: number;
  lastProcessedAt?: Date;
  avgProcessingTime: number;
}

interface JobResult {
  status: number;
  body: string;
  timestamp: string;
}

// Simple in-memory queue implementation for Replit environment
export class WebhookQueueService {
  private queue: Map<string, WebhookJobData> = new Map();
  private deadLetterQueue: Map<string, WebhookJobData & { originalError: string }> = new Map();
  private processing: Map<string, boolean> = new Map();
  private workerInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private isPaused = false;
  
  private metrics: WebhookMetrics = {
    totalProcessed: 0,
    totalSuccess: 0,
    totalFailed: 0,
    totalRetries: 0,
    totalInDeadLetter: 0,
    avgProcessingTime: 0,
  };
  
  private processingTimes: number[] = [];
  private readonly MAX_PROCESSING_TIME_SAMPLES = 100;
  private readonly MAX_RETRIES = 3;
  private readonly CONCURRENCY = 10;
  private readonly WORKER_INTERVAL_MS = 1000; // Check queue every second

  constructor() {
    this.startWorker();
    this.startMetricsReporter();
    console.log('✅ [WebhookQueue] Service initialized with in-memory queue (Replit optimized)');
  }

  private startWorker() {
    if (this.workerInterval) {
      return;
    }

    this.workerInterval = setInterval(async () => {
      if (this.isPaused) {
        return;
      }

      await this.processQueue();
    }, this.WORKER_INTERVAL_MS);

    // Allow Node to exit if this is the only timer
    if (this.workerInterval.unref) {
      this.workerInterval.unref();
    }

    console.log(`✅ [WebhookQueue] Worker started with concurrency: ${this.CONCURRENCY}`);
  }

  private async processQueue() {
    const now = Date.now();
    const currentlyProcessing = this.processing.size;
    
    if (currentlyProcessing >= this.CONCURRENCY) {
      return; // At max concurrency
    }

    const availableSlots = this.CONCURRENCY - currentlyProcessing;
    const jobsToProcess: Array<[string, WebhookJobData]> = [];

    // Find jobs that are ready to process
    for (const [jobId, job] of this.queue.entries()) {
      if (jobsToProcess.length >= availableSlots) {
        break;
      }

      if (this.processing.has(jobId)) {
        continue; // Already processing
      }

      const processAt = job.processAt || job.createdAt || 0;
      if (processAt <= now) {
        jobsToProcess.push([jobId, job]);
        this.processing.set(jobId, true);
      }
    }

    // Process jobs in parallel
    const promises = jobsToProcess.map(([jobId, job]) =>
      this.processJob(jobId, job).finally(() => {
        this.processing.delete(jobId);
      })
    );

    await Promise.allSettled(promises);
  }

  private async processJob(jobId: string, job: WebhookJobData) {
    const startTime = Date.now();
    const attempts = (job.attempts || 0) + 1;
    
    console.log(
      `🔄 [WebhookQueue] Processing webhook ${jobId} (attempt ${attempts}/${this.MAX_RETRIES})`
    );

    try {
      const result = await this.sendWebhook(job);
      
      // Update database status to delivered
      if (job.webhookId) {
        const { webhookDispatcher } = await import('./webhook-dispatcher.service');
        await webhookDispatcher.updateWebhookStatus(
          job.webhookId,
          'delivered',
          result,
          null
        );
      }

      // Remove from queue on success
      this.queue.delete(jobId);
      
      const processingTime = Date.now() - startTime;
      this.updateProcessingTime(processingTime);
      this.metrics.totalProcessed++;
      this.metrics.totalSuccess++;
      this.metrics.lastProcessedAt = new Date();

      console.log(
        `✅ [WebhookQueue] Successfully sent webhook ${jobId} to ${job.url} (${processingTime}ms)`
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.metrics.totalProcessed++;
      
      job.attempts = attempts;
      
      if (attempts >= this.MAX_RETRIES) {
        // Move to dead letter queue
        this.moveToDeadLetter(jobId, job, error);
        this.queue.delete(jobId);
        this.metrics.totalFailed++;

        // Update database status to failed
        if (job.webhookId) {
          const { webhookDispatcher } = await import('./webhook-dispatcher.service');
          await webhookDispatcher.updateWebhookStatus(
            job.webhookId,
            'failed',
            {
              error: error instanceof Error ? error.message : String(error),
              attempt: attempts,
            },
            null
          );
        }
      } else {
        // Schedule retry with exponential backoff
        const retryDelay = this.getRetryDelay(attempts);
        job.processAt = Date.now() + retryDelay;
        this.metrics.totalRetries++;

        // Update database status to retrying
        if (job.webhookId) {
          const { webhookDispatcher } = await import('./webhook-dispatcher.service');
          await webhookDispatcher.updateWebhookStatus(
            job.webhookId,
            'retrying',
            {
              error: error instanceof Error ? error.message : String(error),
              attempt: attempts,
            },
            new Date(job.processAt)
          );
        }

        console.log(
          `⚠️ [WebhookQueue] Webhook ${jobId} failed (attempt ${attempts}), retrying in ${retryDelay}ms`
        );
      }

      console.error(
        `❌ [WebhookQueue] Failed to send webhook ${jobId} (attempt ${attempts}, ${processingTime}ms):`,
        error
      );

      throw error;
    }
  }

  async addWebhook(data: WebhookJobData): Promise<{ id: string }> {
    try {
      const jobId = this.generateJobId();
      const job: WebhookJobData = {
        ...data,
        attempts: 0,
        createdAt: Date.now(),
        processAt: Date.now(), // Process immediately
      };

      this.queue.set(jobId, job);

      console.log(
        `📋 [WebhookQueue] Queued webhook ${jobId} for ${data.subscriptionName} (${data.payload.eventType})`
      );

      return { id: jobId };
    } catch (error) {
      console.error('[WebhookQueue] Error adding webhook to queue:', error);
      throw error;
    }
  }

  private generateJobId(): string {
    return `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

  private moveToDeadLetter(jobId: string, job: WebhookJobData, error: unknown) {
    const deadLetterJob = {
      ...job,
      originalError: error instanceof Error ? error.message : String(error),
    };

    this.deadLetterQueue.set(jobId, deadLetterJob);
    this.metrics.totalInDeadLetter++;

    console.log(
      `☠️ [WebhookQueue] Moved webhook ${jobId} to dead letter queue after ${job.attempts} attempts`
    );
  }

  private getRetryDelay(attemptNumber: number): number {
    // Exponential backoff: 2s, 4s, 8s, 16s, 32s, 64s...
    const baseDelay = 2000; // 2 seconds
    const maxDelay = 64000; // 64 seconds max
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
    return delay;
  }

  private updateProcessingTime(time: number) {
    this.processingTimes.push(time);
    
    if (this.processingTimes.length > this.MAX_PROCESSING_TIME_SAMPLES) {
      this.processingTimes.shift();
    }

    const sum = this.processingTimes.reduce((acc, val) => acc + val, 0);
    this.metrics.avgProcessingTime = Math.round(sum / this.processingTimes.length);
  }

  private startMetricsReporter() {
    this.metricsInterval = setInterval(() => {
      this.reportMetrics();
    }, 60000); // Report every minute

    // Allow Node to exit if this is the only timer
    if (this.metricsInterval?.unref) {
      this.metricsInterval.unref();
    }

    // Also report immediately after 5 seconds
    setTimeout(() => this.reportMetrics(), 5000);
  }

  private reportMetrics() {
    const queueMetrics = this.getQueueMetricsSync();
    
    console.log('📊 [WebhookQueue] Metrics Report:');
    console.log(`  - Active: ${queueMetrics.active}`);
    console.log(`  - Waiting: ${queueMetrics.waiting}`);
    console.log(`  - Delayed: ${queueMetrics.delayed}`);
    console.log(`  - Failed: ${queueMetrics.failed}`);
    console.log(`  - Completed: ${queueMetrics.completed}`);
    console.log(`  - Total Processed: ${this.metrics.totalProcessed}`);
    console.log(`  - Success Rate: ${this.getSuccessRate()}%`);
    console.log(`  - Total Retries: ${this.metrics.totalRetries}`);
    console.log(`  - Dead Letter Queue: ${this.metrics.totalInDeadLetter}`);
    console.log(`  - Avg Processing Time: ${this.metrics.avgProcessingTime}ms`);
    
    if (this.metrics.lastProcessedAt) {
      console.log(`  - Last Processed: ${this.metrics.lastProcessedAt.toISOString()}`);
    }
  }

  private getQueueMetricsSync() {
    const now = Date.now();
    let waiting = 0;
    let delayed = 0;

    for (const job of this.queue.values()) {
      const processAt = job.processAt || job.createdAt || 0;
      if (processAt > now) {
        delayed++;
      } else {
        waiting++;
      }
    }

    return {
      waiting,
      active: this.processing.size,
      delayed,
      failed: this.deadLetterQueue.size,
      completed: this.metrics.totalSuccess,
    };
  }

  async getQueueMetrics() {
    return this.getQueueMetricsSync();
  }

  private getSuccessRate(): string {
    if (this.metrics.totalProcessed === 0) {
      return '0.00';
    }

    const rate = (this.metrics.totalSuccess / this.metrics.totalProcessed) * 100;
    return rate.toFixed(2);
  }

  async pauseQueue() {
    this.isPaused = true;
    console.log('⏸️ [WebhookQueue] Queue paused');
  }

  async resumeQueue() {
    this.isPaused = false;
    console.log('▶️ [WebhookQueue] Queue resumed');
  }

  async cleanup() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    this.queue.clear();
    this.deadLetterQueue.clear();
    this.processing.clear();

    console.log('🧹 [WebhookQueue] Service cleaned up');
  }

  async retryDeadLetterJobs(limit: number = 10): Promise<number> {
    try {
      const jobs = Array.from(this.deadLetterQueue.entries()).slice(0, limit);
      let retriedCount = 0;

      for (const [jobId, job] of jobs) {
        const { originalError, ...webhookData } = job;
        
        // Reset attempts and add back to queue
        await this.addWebhook({
          ...webhookData,
          retryCount: (webhookData.retryCount || 0) + 1,
          attempts: 0, // Reset attempts for retry
        });

        this.deadLetterQueue.delete(jobId);
        retriedCount++;

        console.log(
          `🔄 [WebhookQueue] Retrying dead letter job ${jobId} (original error: ${originalError})`
        );
      }

      this.metrics.totalInDeadLetter = Math.max(0, this.metrics.totalInDeadLetter - retriedCount);

      console.log(
        `✅ [WebhookQueue] Retried ${retriedCount} jobs from dead letter queue`
      );

      return retriedCount;
    } catch (error) {
      console.error('[WebhookQueue] Error retrying dead letter jobs:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const webhookQueue = new WebhookQueueService();