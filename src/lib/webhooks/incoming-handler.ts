import { conn } from '@/lib/db';
import crypto from 'crypto';
import { IncomingWebhookPayload, IncomingEventType } from '@/types/incoming-webhook';
import { z } from 'zod';

const logger = {
  info: (msg: string, data?: any) => console.log(`[INCOMING-WEBHOOK] ${msg}`, data || ''),
  error: (msg: string, error?: any) => console.error(`[INCOMING-WEBHOOK-ERROR] ${msg}`, error || ''),
  warn: (msg: string, data?: any) => console.warn(`[INCOMING-WEBHOOK-WARN] ${msg}`, data || ''),
  debug: (msg: string, data?: any) => console.log(`[INCOMING-WEBHOOK-DEBUG] ${msg}`, data || ''),
};

// URL Configuration Logger
const logWebhookConfig = (companyId: string, source: string) => {
  const baseUrl = process.env.DOMAIN || 'https://62863c59-d08b-44f5-a414-d7529041de1a-00-16zuyl87dp7m9.kirk.replit.dev';
  const webhookUrl = `${baseUrl}/api/v1/webhooks/incoming/${companyId}`;
  logger.info(`✅ Webhook URL for ${source}:`, webhookUrl);
};

// Validation schema for incoming webhook payload
const webhookPayloadSchema = z.object({
  event_type: z.string(),
  timestamp: z.number().optional(),
  data: z.record(z.any()),
  metadata: z.object({
    source: z.string().optional(),
    campaignId: z.string().optional(),
    userId: z.string().optional(),
    trackingId: z.string().optional(),
  }).optional(),
});

export async function validateWebhookSignature(
  body: string,
  signature: string,
  timestamp: string,
  secret: string,
  isDev: boolean = false
): Promise<boolean> {
  // Allow unsigned requests in development mode
  if (isDev) {
    if (!signature) {
      logger.warn('Development mode: allowing unsigned webhook');
      return true;
    }
  }

  if (!signature || !timestamp) {
    logger.error('Missing signature or timestamp headers');
    return false;
  }

  // Check timestamp is within 5 minutes (anti-replay)
  const requestTime = parseInt(timestamp);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(currentTime - requestTime);

  if (timeDiff > 300) { // 5 minutes
    logger.error('Timestamp outside acceptable window', { timeDiff, requestTime, currentTime });
    return false;
  }

  // Compute expected signature: HMAC-SHA256(timestamp.body, secret)
  const payload = `${timestamp}.${body}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  ).valueOf();

  if (!isValid) {
    logger.error('Signature mismatch', {
      received: signature.substring(0, 16) + '...',
      expected: expectedSignature.substring(0, 16) + '...',
    });
    return false;
  }

  logger.info('Webhook signature validated successfully');
  return true;
}

export async function parseAndValidatePayload(body: string): Promise<IncomingWebhookPayload | null> {
  try {
    const parsed = JSON.parse(body);
    const validated = webhookPayloadSchema.safeParse(parsed);

    if (!validated.success) {
      logger.error('Payload validation failed', validated.error.flatten());
      return null;
    }

    return validated.data as IncomingWebhookPayload;
  } catch (error) {
    logger.error('Failed to parse webhook body', error);
    return null;
  }
}

export async function storeWebhookEvent(
  companyId: string,
  source: string,
  eventType: IncomingEventType,
  payload: IncomingWebhookPayload,
  headers: Record<string, any>,
  ipAddress: string | undefined,
  signatureValid: boolean
): Promise<string | null> {
  try {
    // Using postgres client directly for raw SQL
    const result = await conn`
      INSERT INTO incoming_webhook_events 
      (company_id, source, event_type, payload, headers, ip_address, signature_valid, processed_at, created_at)
      VALUES (${companyId}, ${source}, ${eventType}, ${JSON.stringify(payload)}, ${JSON.stringify(headers)}, ${ipAddress || 'unknown'}, ${signatureValid}, NOW(), NOW())
      RETURNING id
    `;

    const eventId = (result as any)?.[0]?.id;
    if (eventId) {
      logger.info(`Webhook event stored`, { eventId, companyId, source, eventType });
    }
    return eventId || null;
  } catch (error) {
    logger.error('Failed to store webhook event', error);
    return null;
  }
}

export async function handleIncomingWebhookEvent(
  companyId: string,
  source: string,
  payload: IncomingWebhookPayload,
  eventId: string
): Promise<void> {
  try {
    const eventType = payload.event_type as IncomingEventType;

    logger.info(`Processing incoming webhook event`, {
      eventId,
      companyId,
      source,
      eventType,
    });

    // Route event to specific handlers based on type
    switch (eventType) {
      case 'lead.created':
      case 'lead.updated':
      case 'lead.qualified':
        await handleLeadEvent(companyId, eventType, payload);
        break;

      case 'contact.created':
      case 'contact.updated':
      case 'contact.deleted':
        await handleContactEvent(companyId, eventType, payload);
        break;

      case 'message.received':
        await handleMessageEvent(companyId, payload);
        break;

      case 'form.submitted':
      case 'conversion.completed':
        await handleConversionEvent(companyId, eventType, payload);
        break;

      case 'pix_created':
      case 'order_approved':
        await handleGrapfyEvent(companyId, eventType, payload);
        break;

      case 'custom':
      default:
        logger.info(`Custom event received: ${eventType}`, { eventId });
        break;
    }

    logger.info(`Event processed successfully`, { eventId });
  } catch (error) {
    logger.error('Error handling webhook event', { eventId, error });
    throw error;
  }
}

// Specific event handlers
async function handleLeadEvent(
  companyId: string,
  eventType: string,
  payload: IncomingWebhookPayload
): Promise<void> {
  logger.info(`Processing lead event: ${eventType}`, payload.data);
  // Lead processing logic would go here
  // Could create/update leads based on payload data
}

async function handleContactEvent(
  companyId: string,
  eventType: string,
  payload: IncomingWebhookPayload
): Promise<void> {
  logger.info(`Processing contact event: ${eventType}`, payload.data);
  // Contact processing logic would go here
  // Could sync with contacts table
}

async function handleMessageEvent(
  companyId: string,
  payload: IncomingWebhookPayload
): Promise<void> {
  logger.info(`Processing incoming message`, payload.data);
  // Message processing logic
}

async function handleConversionEvent(
  companyId: string,
  eventType: string,
  payload: IncomingWebhookPayload
): Promise<void> {
  logger.info(`Processing conversion event: ${eventType}`, payload.data);
  // Conversion/form submission processing
}

export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function maskSecret(secret: string): string {
  if (secret.length <= 8) return '****';
  return secret.substring(0, 4) + '****' + secret.substring(secret.length - 4);
}

// Grapfy event handler
async function handleGrapfyEvent(
  companyId: string,
  eventType: IncomingEventType,
  payload: IncomingWebhookPayload
): Promise<void> {
  try {
    const data = payload.data || {};
    const customer = data.customer || {};
    const product = data.product || {};

    logger.info(`Processing Grapfy event: ${eventType}`, {
      customer: customer.name,
      email: customer.email,
      phone: customer.phoneNumber,
      product: product.name,
    });

    // Import trigger service
    const { triggerWebhookCampaign } = await import('@/services/webhook-campaign-trigger.service');

    // Dispatch campaign based on event type
    await triggerWebhookCampaign({
      companyId,
      eventType,
      customer: {
        name: customer.name || 'Unknown',
        email: customer.email || '',
        phoneNumber: customer.phoneNumber || '',
        document: customer.document || '',
      },
      product: product.name ? { name: product.name } : undefined,
      plan: data.plan?.name ? { name: data.plan.name } : undefined,
    });

    // NEW: Trigger automation rules for webhook events
    try {
      const { triggerAutomationForWebhook } = await import('@/lib/automation-engine');
      await triggerAutomationForWebhook(companyId, eventType, data);
      logger.info(`✅ Automations triggered for webhook event: ${eventType}`);
    } catch (automationError) {
      logger.warn(`Automation trigger failed (non-blocking):`, automationError);
    }

    logger.info(`✅ Grapfy campaign triggered successfully for event: ${eventType}`);
  } catch (error) {
    logger.error('Error handling Grapfy event', { error, eventType });
  }
}

