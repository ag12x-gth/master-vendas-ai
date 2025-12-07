import { NextRequest, NextResponse } from 'next/server';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const retellWebhookSchema = z.object({
  event: z.enum(['call_started', 'call_ended', 'call_analyzed', 'agent_response', 'user_transcript']),
  call_id: z.string(),
  agent_id: z.string().optional(),
  from_number: z.string().optional(),
  to_number: z.string().optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
  start_timestamp: z.number().optional(),
  end_timestamp: z.number().optional(),
  duration_ms: z.number().optional(),
  transcript: z.array(z.object({
    role: z.string(),
    content: z.string(),
    timestamp: z.number().optional(),
  })).optional(),
  recording_url: z.string().optional(),
  call_analysis: z.object({
    call_summary: z.string().optional(),
    user_sentiment: z.string().optional(),
    call_successful: z.boolean().optional(),
    custom_analysis_data: z.record(z.any()).optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

type RetellWebhookPayload = z.infer<typeof retellWebhookSchema>;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    logger.info('Retell webhook received', { 
      event: body.event,
      callId: body.call_id,
      agentId: body.agent_id,
    });

    const validation = retellWebhookSchema.safeParse(body);
    
    if (!validation.success) {
      logger.warn('Retell webhook validation failed', { 
        errors: validation.error.flatten(),
        body: JSON.stringify(body).slice(0, 500),
      });
      return NextResponse.json(
        { success: false, error: 'Invalid webhook payload', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const payload: RetellWebhookPayload = validation.data;

    switch (payload.event) {
      case 'call_started':
        await handleCallStarted(payload);
        break;
      case 'call_ended':
        await handleCallEnded(payload);
        break;
      case 'call_analyzed':
        await handleCallAnalyzed(payload);
        break;
      case 'agent_response':
      case 'user_transcript':
        logger.debug('Retell streaming event received', { event: payload.event, callId: payload.call_id });
        break;
      default:
        logger.warn('Unknown Retell event', { event: payload.event });
    }

    const processingTime = Date.now() - startTime;
    
    logger.info('Retell webhook processed', { 
      event: payload.event,
      callId: payload.call_id,
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: true,
      event: payload.event,
      callId: payload.call_id,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Retell webhook processing error', { error });
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleCallStarted(payload: RetellWebhookPayload) {
  logger.info('Processing call_started event', {
    callId: payload.call_id,
    agentId: payload.agent_id,
    fromNumber: payload.from_number,
    toNumber: payload.to_number,
    direction: payload.direction,
  });

  if (voiceAIPlatform.isConfigured()) {
    await voiceAIPlatform.syncCallFromWebhook({
      externalCallId: payload.call_id,
      agentId: payload.agent_id,
      status: 'initiated',
      direction: payload.direction,
      fromNumber: payload.from_number,
      toNumber: payload.to_number,
      metadata: {
        startedAt: payload.start_timestamp ? new Date(payload.start_timestamp).toISOString() : new Date().toISOString(),
        source: 'retell_webhook',
      },
    });
  }
}

async function handleCallEnded(payload: RetellWebhookPayload) {
  logger.info('Processing call_ended event', {
    callId: payload.call_id,
    durationMs: payload.duration_ms,
    recordingUrl: payload.recording_url,
  });

  if (voiceAIPlatform.isConfigured()) {
    await voiceAIPlatform.syncCallFromWebhook({
      externalCallId: payload.call_id,
      status: 'ended',
      endedAt: payload.end_timestamp ? new Date(payload.end_timestamp).toISOString() : new Date().toISOString(),
      duration: payload.duration_ms ? Math.round(payload.duration_ms / 1000) : 0,
      recordingUrl: payload.recording_url,
      transcript: payload.transcript as Array<{ role: string; content: string; timestamp: number }>,
      metadata: { source: 'retell_webhook' },
    });
  }
}

async function handleCallAnalyzed(payload: RetellWebhookPayload) {
  logger.info('Processing call_analyzed event', {
    callId: payload.call_id,
    hasSummary: !!payload.call_analysis?.call_summary,
    sentiment: payload.call_analysis?.user_sentiment,
    successful: payload.call_analysis?.call_successful,
  });

  if (voiceAIPlatform.isConfigured() && payload.call_analysis) {
    const sentimentMap: Record<string, number> = {
      'positive': 1,
      'neutral': 0,
      'negative': -1,
    };
    const sentimentScore = payload.call_analysis.user_sentiment 
      ? sentimentMap[payload.call_analysis.user_sentiment] ?? 0 
      : undefined;

    await voiceAIPlatform.syncCallFromWebhook({
      externalCallId: payload.call_id,
      summary: payload.call_analysis.call_summary,
      sentimentScore,
      metadata: {
        successful: payload.call_analysis.call_successful,
        customData: payload.call_analysis.custom_analysis_data,
        source: 'retell_webhook',
      },
    });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');
  
  if (challenge) {
    logger.info('Retell webhook verification', { challenge });
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({
    success: true,
    webhook: 'retell',
    status: 'active',
    events: ['call_started', 'call_ended', 'call_analyzed', 'agent_response', 'user_transcript'],
    timestamp: new Date().toISOString(),
  });
}
