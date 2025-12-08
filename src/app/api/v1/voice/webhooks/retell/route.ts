import { NextRequest, NextResponse } from 'next/server';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { mapDisconnectionReasonToOutcome } from '@/lib/voice-utils';
import { updateVoiceDeliveryWithOutcome } from '@/lib/campaign-sender';

const retellWebhookSchema = z.object({
  event: z.enum(['call_started', 'call_ended', 'call_analyzed', 'agent_response', 'user_transcript']),
  call: z.object({
    call_id: z.string(),
    call_type: z.string().optional(),
    agent_id: z.string().optional(),
    agent_name: z.string().optional(),
    from_number: z.string().optional(),
    to_number: z.string().optional(),
    direction: z.enum(['inbound', 'outbound']).optional(),
    start_timestamp: z.number().optional(),
    end_timestamp: z.number().optional(),
    duration_ms: z.number().optional(),
    call_status: z.string().optional(),
    disconnection_reason: z.string().optional(),
    transcript: z.string().optional(),
    transcript_object: z.array(z.object({
      role: z.string().optional(),
      content: z.string().optional(),
      timestamp: z.number().optional(),
    })).optional(),
    recording_url: z.string().optional(),
    custom_sip_headers: z.record(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
  }),
  call_analysis: z.object({
    call_summary: z.string().optional(),
    user_sentiment: z.string().optional(),
    call_successful: z.boolean().optional(),
    custom_analysis_data: z.record(z.any()).optional(),
  }).optional(),
});

type RetellWebhookPayload = z.infer<typeof retellWebhookSchema>;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    logger.info('Retell webhook received', { 
      event: body.event,
      callId: body.call?.call_id,
      agentId: body.call?.agent_id,
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
        logger.debug('Retell streaming event received', { event: payload.event, callId: payload.call.call_id });
        break;
      default:
        logger.warn('Unknown Retell event', { event: payload.event });
    }

    const processingTime = Date.now() - startTime;
    
    logger.info('Retell webhook processed', { 
      event: payload.event,
      callId: payload.call.call_id,
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: true,
      event: payload.event,
      callId: payload.call.call_id,
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
  const callData = payload.call;
  logger.info('Processing call_started event', {
    callId: callData.call_id,
    agentId: callData.agent_id,
    fromNumber: callData.from_number,
    toNumber: callData.to_number,
    direction: callData.direction,
  });

  if (voiceAIPlatform.isConfigured()) {
    await voiceAIPlatform.syncCallFromWebhook({
      externalCallId: callData.call_id,
      agentId: callData.agent_id,
      status: 'initiated',
      direction: callData.direction as 'inbound' | 'outbound' | undefined,
      fromNumber: callData.from_number,
      toNumber: callData.to_number,
      metadata: {
        startedAt: callData.start_timestamp ? new Date(callData.start_timestamp).toISOString() : new Date().toISOString(),
        source: 'retell_webhook',
      },
    });
  }
}

async function handleCallEnded(payload: RetellWebhookPayload) {
  const callData = payload.call;
  const disconnectionReason = callData.disconnection_reason || null;
  const durationSeconds = callData.duration_ms ? Math.round(callData.duration_ms / 1000) : null;
  
  logger.info('Processing call_ended event', {
    callId: callData.call_id,
    durationMs: callData.duration_ms,
    disconnectionReason,
    recordingUrl: callData.recording_url,
  });

  const callOutcome = mapDisconnectionReasonToOutcome(disconnectionReason);
  
  logger.info('Call outcome determined', {
    callId: callData.call_id,
    disconnectionReason,
    callOutcome,
  });

  try {
    await updateVoiceDeliveryWithOutcome(
      callData.call_id,
      callOutcome,
      disconnectionReason,
      durationSeconds
    );
  } catch (error) {
    logger.error('Failed to update voice delivery with outcome', {
      callId: callData.call_id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  if (voiceAIPlatform.isConfigured()) {
    await voiceAIPlatform.syncCallFromWebhook({
      externalCallId: callData.call_id,
      status: 'ended',
      endedAt: callData.end_timestamp ? new Date(callData.end_timestamp).toISOString() : new Date().toISOString(),
      duration: durationSeconds || 0,
      recordingUrl: callData.recording_url,
      transcript: callData.transcript_object as Array<{ role: string; content: string; timestamp: number }>,
      metadata: { 
        source: 'retell_webhook',
        disconnectionReason,
        callOutcome,
      },
    });
  }
}

async function handleCallAnalyzed(payload: RetellWebhookPayload) {
  const callData = payload.call;
  logger.info('Processing call_analyzed event', {
    callId: callData.call_id,
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
      externalCallId: callData.call_id,
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
