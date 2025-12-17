import { NextRequest, NextResponse } from 'next/server';
import { conn } from '@/lib/db';
import {
  validateWebhookSignature,
  parseAndValidatePayload,
  storeWebhookEvent,
  handleIncomingWebhookEvent,
} from '@/lib/webhooks/incoming-handler';
import { IncomingEventType } from '@/types/incoming-webhook';

export const dynamic = 'force-dynamic';

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

/**
 * GET /api/v1/webhooks/incoming/[companySlug]
 * Health check endpoint for external platforms to verify webhook URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { companySlug: string } }
) {
  try {
    const companySlug = params.companySlug;
    console.log(`[WEBHOOK-HEALTH] Health check for company: ${companySlug}`);

    // Return 200 OK for health check
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  } catch (error) {
    console.error('[WEBHOOK-HEALTH] Error:', error);
    return NextResponse.json(
      { status: 'unhealthy' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/webhooks/incoming/[companySlug]
 * Main endpoint to receive incoming webhook events from external platforms
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { companySlug: string } }
) {
  const requestId = Math.random().toString(36).substring(7);
  const companySlug = params.companySlug;
  let source = request.headers.get('x-webhook-source') || 'unknown';
  
  // Auto-detect Grapfy if no source header (Grapfy doesn't send one)
  if (source === 'unknown') {
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    const xForwarded = request.headers.get('x-forwarded-host') || '';
    // Try to detect Grapfy from various headers or default to grapfy if no source
    if (userAgent.toLowerCase().includes('grapfy') || 
        referer.toLowerCase().includes('grapfy') ||
        xForwarded.toLowerCase().includes('grapfy')) {
      source = 'grapfy';
    }
    // Fallback: if still unknown, default to grapfy (most likely external source)
    if (source === 'unknown') {
      source = 'grapfy';
    }
  }

  try {
    console.log(`[WEBHOOK:${requestId}] ===== INCOMING WEBHOOK RECEIVED =====`);
    console.log(`[WEBHOOK:${requestId}] Company: ${companySlug}`);
    console.log(`[WEBHOOK:${requestId}] Source: ${source}`);
    console.log(`[WEBHOOK:${requestId}] Headers: Content-Type=${request.headers.get('content-type')}, User-Agent=${request.headers.get('user-agent')}`);

    // Get raw body for signature validation
    const rawBody = await request.text();
    const signature = request.headers.get('x-webhook-signature');
    const timestamp = request.headers.get('x-webhook-timestamp');
    
    console.log(`[WEBHOOK:${requestId}] Payload size: ${rawBody.length} bytes`);
    console.log(`[WEBHOOK:${requestId}] Signature: ${signature ? 'present' : 'missing'}, Timestamp: ${timestamp || 'missing'}`);

    // Get the company from database using slug (companySlug is actually companyId in this case)
    const companyResult = await conn`
      SELECT id FROM companies WHERE id = ${companySlug} LIMIT 1
    `;

    if (!companyResult || (companyResult as any).length === 0) {
      console.warn(`[WEBHOOK:${requestId}] Company not found: ${companySlug}`);
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const companyId = (companyResult as any)?.[0]?.id as string;

    // Get webhook config for this company/source
    const configResult = await conn`
      SELECT secret, is_active FROM incoming_webhook_configs 
      WHERE company_id = ${companyId} AND source = ${source} LIMIT 1
    `;

    let signatureValid = false;
    let secret = '';

    if (configResult && (configResult as any).length > 0) {
      const config = (configResult as any)?.[0];
      if (!config.is_active) {
        console.warn(`[WEBHOOK:${requestId}] Webhook config is inactive`);
        return NextResponse.json(
          { error: 'Webhook config is inactive' },
          { status: 403 }
        );
      }
      secret = config.secret;

      // Validate signature
      if (signature && timestamp && secret) {
        signatureValid = await validateWebhookSignature(
          rawBody,
          signature,
          timestamp,
          secret,
          isDev
        );

        if (!signatureValid && !isDev) {
          console.error(`[WEBHOOK:${requestId}] Invalid signature`);
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 403 }
          );
        }
      } else if (!isDev) {
        console.error(`[WEBHOOK:${requestId}] Missing signature/timestamp headers`);
        return NextResponse.json(
          { error: 'Missing signature or timestamp' },
          { status: 400 }
        );
      }
    } else {
      console.warn(`[WEBHOOK:${requestId}] No webhook config found for source: ${source}`);
      if (!isDev) {
        return NextResponse.json(
          { error: 'Webhook config not found' },
          { status: 404 }
        );
      }
    }

    // Parse and validate payload
    const payload = await parseAndValidatePayload(rawBody);
    if (!payload) {
      console.error(`[WEBHOOK:${requestId}] Invalid payload format`);
      return NextResponse.json(
        { error: 'Invalid payload format' },
        { status: 400 }
      );
    }

    // Collect headers for logging
    const headers: Record<string, any> = {};
    request.headers.forEach((value, key) => {
      if (!key.includes('authorization') && !key.includes('signature')) {
        headers[key] = value;
      }
    });

    // Get client IP
    const ipAddress = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Store event in database
    const eventId = await storeWebhookEvent(
      companyId,
      source,
      payload.event_type as IncomingEventType,
      payload,
      headers,
      ipAddress,
      signatureValid
    );

    if (!eventId) {
      console.error(`[WEBHOOK:${requestId}] Failed to store webhook event`);
      return NextResponse.json(
        { error: 'Failed to store webhook event' },
        { status: 500 }
      );
    }

    console.log(`[WEBHOOK:${requestId}] ✅ Event stored with ID: ${eventId}`);

    // Process event asynchronously (non-blocking)
    handleIncomingWebhookEvent(companyId, source, payload, eventId).catch((error) => {
      console.error(`[WEBHOOK:${requestId}] Error in async processing:`, error);
    });

    console.log(`[WEBHOOK:${requestId}] ===== WEBHOOK PROCESSED =====`);

    return NextResponse.json({
      success: true,
      eventId,
      message: 'Webhook received and processed successfully',
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  } catch (error) {
    console.error(`[WEBHOOK:${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
