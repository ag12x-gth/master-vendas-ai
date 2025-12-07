import { NextRequest, NextResponse } from 'next/server';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const twilioStatusSchema = z.object({
  CallSid: z.string(),
  CallStatus: z.enum(['queued', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled']),
  Called: z.string().optional(),
  Caller: z.string().optional(),
  From: z.string().optional(),
  To: z.string().optional(),
  Direction: z.enum(['inbound', 'outbound-api', 'outbound-dial']).optional(),
  CallDuration: z.string().optional(),
  RecordingUrl: z.string().optional(),
  RecordingSid: z.string().optional(),
  RecordingDuration: z.string().optional(),
  Timestamp: z.string().optional(),
  AccountSid: z.string().optional(),
  ApiVersion: z.string().optional(),
  SequenceNumber: z.string().optional(),
  CallbackSource: z.string().optional(),
  ParentCallSid: z.string().optional(),
  ErrorCode: z.string().optional(),
  ErrorMessage: z.string().optional(),
});

type TwilioStatusPayload = z.infer<typeof twilioStatusSchema>;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const body: Record<string, string> = {};
    formData.forEach((value, key) => {
      body[key] = value.toString();
    });
    
    logger.info('Twilio status webhook received', { 
      callSid: body.CallSid,
      status: body.CallStatus,
      from: body.From,
      to: body.To,
    });

    const validation = twilioStatusSchema.safeParse(body);
    
    if (!validation.success) {
      logger.warn('Twilio status webhook validation failed', { 
        errors: validation.error.flatten(),
        body: JSON.stringify(body).slice(0, 500),
      });
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const payload: TwilioStatusPayload = validation.data;

    await handleTwilioStatus(payload);

    const processingTime = Date.now() - startTime;
    
    logger.info('Twilio status webhook processed', { 
      callSid: payload.CallSid,
      status: payload.CallStatus,
      processingTimeMs: processingTime,
    });

    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    logger.error('Twilio status webhook processing error', { error });
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

async function handleTwilioStatus(payload: TwilioStatusPayload) {
  const statusMap: Record<string, string> = {
    'queued': 'initiated',
    'ringing': 'initiated',
    'in-progress': 'ongoing',
    'completed': 'ended',
    'busy': 'failed',
    'failed': 'failed',
    'no-answer': 'failed',
    'canceled': 'failed',
  };

  const normalizedStatus = statusMap[payload.CallStatus] || 'unknown';
  const direction = payload.Direction?.includes('outbound') ? 'outbound' : 'inbound';

  logger.info('Processing Twilio status', {
    callSid: payload.CallSid,
    twilioStatus: payload.CallStatus,
    normalizedStatus,
    direction,
    duration: payload.CallDuration,
  });

  if (voiceAIPlatform.isConfigured()) {
    try {
      const syncData: Record<string, any> = {
        externalCallId: payload.CallSid,
        status: normalizedStatus,
        direction,
        fromNumber: payload.From || payload.Caller,
        toNumber: payload.To || payload.Called,
        source: 'twilio_status_webhook',
      };

      if (payload.CallDuration) {
        syncData.duration = parseInt(payload.CallDuration, 10);
      }

      if (payload.RecordingUrl) {
        syncData.recordingUrl = payload.RecordingUrl;
      }

      if (payload.ErrorCode) {
        syncData.errorCode = payload.ErrorCode;
        syncData.errorMessage = payload.ErrorMessage;
      }

      if (normalizedStatus === 'ended') {
        syncData.endedAt = payload.Timestamp || new Date().toISOString();
      }

      await voiceAIPlatform.request('/api/calls/sync', 'POST', syncData);
      logger.info('Twilio call status synced to Voice AI Platform', { callSid: payload.CallSid, status: normalizedStatus });
    } catch (error) {
      logger.warn('Failed to sync Twilio status to Voice AI Platform (non-blocking)', { error, callSid: payload.CallSid });
    }
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    webhook: 'twilio-status',
    status: 'active',
    events: ['queued', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled'],
    timestamp: new Date().toISOString(),
  });
}
