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
const _logWebhookConfig = (companyId: string, source: string) => {
  const baseUrl = process.env.DOMAIN || 'https://62863c59-d08b-44f5-a414-d7529041de1a-00-16zuyl87dp7m9.kirk.replit.dev';
  const webhookUrl = `${baseUrl}/api/v1/webhooks/incoming/${companyId}`;
  logger.info(`✅ Webhook URL for ${source}:`, webhookUrl);
};

// Validation schema for incoming webhook payload
// Supports both generic format (event_type + data) and Grapfy format (eventType + payload)
const webhookPayloadSchema = z.record(z.any()).transform((data) => {
  // Preserve ALL original data without modification
  return {
    event_type: data.event_type || data.eventType,
    timestamp: data.timestamp || (data.createdAt ? Math.floor(new Date(data.createdAt).getTime() / 1000) : undefined),
    // Preserve complete original payload
    ...data,
  };
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
      logger.warn('✅ [DEV MODE] Development mode: allowing unsigned webhook');
      return true;
    }
  }

  if (!signature || !timestamp) {
    logger.error('❌ Missing signature or timestamp headers');
    return false;
  }

  // Check timestamp is within 5 minutes (anti-replay)
  const requestTime = parseInt(timestamp);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(currentTime - requestTime);

  if (timeDiff > 300) { // 5 minutes
    logger.error('❌ Timestamp outside acceptable window', { timeDiff, requestTime, currentTime });
    return false;
  }

  // Compute expected signature: HMAC-SHA256(timestamp.body, secret)
  const payload = `${timestamp}.${body}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    ).valueOf();

    if (!isValid) {
      logger.error('❌ Signature mismatch', {
        received: signature.substring(0, 16) + '...',
        expected: expectedSignature.substring(0, 16) + '...',
      });
      return false;
    }

    logger.info('✅ Webhook signature validated successfully');
    return true;
  } catch (error) {
    logger.error('❌ Signature validation error:', error);
    return false;
  }
}

export async function parseAndValidatePayload(body: string): Promise<IncomingWebhookPayload | null> {
  try {
    const parsed = JSON.parse(body);
    logger.debug('Raw webhook payload:', { eventType: parsed.eventType || parsed.event_type, payloadKeys: Object.keys(parsed) });
    
    const validated = webhookPayloadSchema.safeParse(parsed);

    if (!validated.success) {
      logger.error('Payload validation failed', validated.error.flatten());
      logger.debug('Failed payload keys:', Object.keys(parsed));
      return null;
    }

    logger.info('✅ Webhook payload validated successfully', { event_type: validated.data.event_type });
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
    // Dados vêm diretamente no payload (não em payload.data)
    const data = payload as any;
    
    // ✅ FIX: Suportar AMBOS formatos - aninhado (Grapfy real) e plano (curl manual)
    // Formato aninhado: { customer: { name: "Diego", phoneNumber: "64999526870" } }
    // Formato plano: { customer: "Diego", phone: "64999526870" }
    
    let customer: { name?: string; email?: string; phoneNumber?: string; phone?: string; document?: string } = {};
    let product: { name?: string } = {};
    
    // Parse customer - pode ser objeto ou string
    if (typeof data.customer === 'object' && data.customer !== null) {
      customer = data.customer;
    } else if (typeof data.customer === 'string') {
      customer = { name: data.customer };
    }
    
    // Fallback para campos planos no root
    if (!customer.name && data.customerName) customer.name = data.customerName;
    if (!customer.email && data.email) customer.email = data.email;
    if (!customer.phoneNumber && data.phone) customer.phoneNumber = data.phone;
    if (!customer.phoneNumber && data.phoneNumber) customer.phoneNumber = data.phoneNumber;
    if (!customer.document && data.document) customer.document = data.document;
    
    // Parse product - pode ser objeto ou string
    if (typeof data.product === 'object' && data.product !== null) {
      product = data.product;
    } else if (typeof data.product === 'string') {
      product = { name: data.product };
    }
    
    // Fallback para campos planos no root
    if (!product.name && data.productName) product.name = data.productName;
    
    const _address = data.address || {};
    const total = data.total || 0;
    const _qrCode = data.qrCode || '';
    const _orderId = data.orderId || '';

    // Log detalhado do parsing
    logger.info(`Processing Grapfy event: ${eventType}`, {
      eventId: data.eventId,
      customer: customer.name || 'Unknown',
      email: customer.email || '',
      phone: customer.phoneNumber || customer.phone || '',
      product: product.name || '',
      total: total,
      status: data.status,
    });

    // Extract phone number (pode vir como phoneNumber ou phone)
    const _customerPhone = customer.phoneNumber || customer.phone;

    // ✅ CHANGE v2.10.6: Notifications ONLY via automations (must have active rules)
    // Removed: sendPixNotification() and sendOrderApprovedNotification()
    // These now run ONLY if user has configured automation rules in /automations

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

