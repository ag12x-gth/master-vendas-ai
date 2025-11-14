import { db } from '@/lib/db';
import { webhookSubscriptions, webhookEvents } from '@/lib/db/schema';
import { eq, and, lte, sql } from 'drizzle-orm';
import crypto from 'crypto';

export type WebhookEventType =
  | 'conversation_created'
  | 'conversation_updated'
  | 'message_received'
  | 'message_sent'
  | 'lead_created'
  | 'lead_stage_changed'
  | 'sale_closed'
  | 'meeting_scheduled'
  | 'campaign_sent'
  | 'campaign_completed';

export interface WebhookPayload {
  eventType: WebhookEventType;
  timestamp: string;
  data: Record<string, any>;
  companyId: string;
}

export class WebhookDispatcherService {
  private maxRetries = 5;
  private retryDelays = [60, 300, 900, 3600, 7200];
  private workerInterval: NodeJS.Timeout | null = null;
  private readonly WORKER_INTERVAL_MS = 60000;

  constructor() {
    this.startWorker();
  }

  private startWorker() {
    if (this.workerInterval) {
      return;
    }

    console.log('[WebhookDispatcher] Starting background worker (60s interval)');
    
    this.workerInterval = setInterval(() => {
      this.processQueue().catch((err) => {
        console.error('[WebhookDispatcher] Worker error:', err);
      });
    }, this.WORKER_INTERVAL_MS);

    if (this.workerInterval.unref) {
      this.workerInterval.unref();
    }
  }

  async dispatch(companyId: string, eventType: WebhookEventType, data: Record<string, any>) {
    const subscriptions = await db.query.webhookSubscriptions.findMany({
      where: and(eq(webhookSubscriptions.companyId, companyId), eq(webhookSubscriptions.active, true)),
    });

    const relevantSubscriptions = subscriptions.filter((sub) => sub.events.includes(eventType));

    if (relevantSubscriptions.length === 0) {
      console.log(`[WebhookDispatcher] No active subscriptions for event ${eventType} in company ${companyId}`);
      return;
    }

    const payload: WebhookPayload = {
      eventType,
      timestamp: new Date().toISOString(),
      data,
      companyId,
    };

    for (const subscription of relevantSubscriptions) {
      try {
        await db.insert(webhookEvents).values({
          subscriptionId: subscription.id,
          eventType,
          payload: payload as any,
          status: 'pending',
          attempts: 0,
          nextRetryAt: new Date(),
        });

        console.log(
          `[WebhookDispatcher] Queued webhook event ${eventType} for subscription ${subscription.name}`
        );
      } catch (error) {
        console.error(`[WebhookDispatcher] Error queuing webhook event:`, error);
      }
    }

    this.processQueue().catch((err) => {
      console.error('[WebhookDispatcher] Error in queue processor:', err);
    });
  }

  async processQueue() {
    const pendingEvents = await db.query.webhookEvents.findMany({
      where: and(
        sql`${webhookEvents.status} IN ('pending', 'retrying')`,
        lte(webhookEvents.nextRetryAt, new Date())
      ),
      limit: 10,
      with: {
        subscription: true,
      },
    });

    if (pendingEvents.length === 0) {
      return;
    }

    console.log(`[WebhookDispatcher] Processing ${pendingEvents.length} pending webhook events`);

    for (const event of pendingEvents) {
      try {
        await this.sendWebhook(event.id, event.subscription.url, event.subscription.secret, event.payload as any);
      } catch (error) {
        console.error(`[WebhookDispatcher] Error sending webhook ${event.id}:`, error);
      }
    }
  }

  private async sendWebhook(
    eventId: string,
    url: string,
    secret: string,
    payload: WebhookPayload
  ) {
    const event = await db.query.webhookEvents.findFirst({
      where: eq(webhookEvents.id, eventId),
    });

    if (!event) {
      return;
    }

    const attempts = event.attempts + 1;
    const payloadString = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.eventType,
          'X-Webhook-Timestamp': payload.timestamp,
        },
        body: payloadString,
        signal: AbortSignal.timeout(10000),
      });

      const responseText = await response.text();
      const success = response.ok;

      await db
        .update(webhookEvents)
        .set({
          status: success ? 'delivered' : 'failed',
          attempts,
          lastAttemptAt: new Date(),
          response: {
            status: response.status,
            body: responseText.slice(0, 1000),
          },
          nextRetryAt: success ? null : this.getNextRetryTime(attempts),
        })
        .where(eq(webhookEvents.id, eventId));

      console.log(
        `[WebhookDispatcher] Webhook ${eventId} ${success ? 'delivered' : 'failed'} (attempt ${attempts})`
      );
    } catch (error) {
      const shouldRetry = attempts < this.maxRetries;
      const status = shouldRetry ? 'retrying' : 'failed';

      await db
        .update(webhookEvents)
        .set({
          status,
          attempts,
          lastAttemptAt: new Date(),
          response: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          nextRetryAt: shouldRetry ? this.getNextRetryTime(attempts) : null,
        })
        .where(eq(webhookEvents.id, eventId));

      console.error(
        `[WebhookDispatcher] Webhook ${eventId} error (attempt ${attempts}/${this.maxRetries}):`,
        error
      );
    }
  }

  private getNextRetryTime(attempts: number): Date {
    const delaySeconds = this.retryDelays[Math.min(attempts - 1, this.retryDelays.length - 1)] || 7200;
    return new Date(Date.now() + delaySeconds * 1000);
  }

  static safeDispatch(
    fn: (companyId: string, eventType: WebhookEventType, data: Record<string, any>) => Promise<void>,
    source: string,
    companyId: string,
    eventType: WebhookEventType,
    data: Record<string, any>
  ) {
    fn(companyId, eventType, data).catch((error) => {
      console.error(`[WebhookDispatcher][${source}] Error dispatching webhook:`, error);
    });
  }
}

export const webhookDispatcher = new WebhookDispatcherService();
