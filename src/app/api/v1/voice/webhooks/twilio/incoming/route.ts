import { NextRequest, NextResponse } from 'next/server';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { voiceAgents, voiceCalls } from '@/lib/db/schema';
import { eq, and, isNotNull, desc } from 'drizzle-orm';
import { z } from 'zod';

const twilioIncomingSchema = z.object({
  CallSid: z.string(),
  AccountSid: z.string().optional(),
  From: z.string(),
  To: z.string(),
  Called: z.string().optional(),
  Caller: z.string().optional(),
  CallStatus: z.string().optional(),
  Direction: z.string().optional(),
  ForwardedFrom: z.string().optional(),
  CallerCity: z.string().optional(),
  CallerState: z.string().optional(),
  CallerCountry: z.string().optional(),
  CallerZip: z.string().optional(),
  ToCity: z.string().optional(),
  ToState: z.string().optional(),
  ToCountry: z.string().optional(),
  ToZip: z.string().optional(),
  ApiVersion: z.string().optional(),
  StirVerstat: z.string().optional(),
});

type TwilioIncomingPayload = z.infer<typeof twilioIncomingSchema>;

async function getActiveInboundVoiceAgent() {
  try {
    const agents = await db
      .select({
        id: voiceAgents.id,
        name: voiceAgents.name,
        companyId: voiceAgents.companyId,
        type: voiceAgents.type,
        status: voiceAgents.status,
        retellAgentId: voiceAgents.retellAgentId,
        systemPrompt: voiceAgents.systemPrompt,
        firstMessage: voiceAgents.firstMessage,
      })
      .from(voiceAgents)
      .where(
        and(
          eq(voiceAgents.type, 'inbound'),
          eq(voiceAgents.status, 'active'),
          isNotNull(voiceAgents.retellAgentId)
        )
      )
      .orderBy(desc(voiceAgents.createdAt))
      .limit(1);

    const agent = agents[0];
    if (!agent) {
      logger.info('[Inbound] No active inbound agent found in local database');
      return null;
    }

    logger.info('[Inbound] Found active inbound agent in local database', {
      agentId: agent.id,
      agentName: agent.name,
      retellAgentId: agent.retellAgentId,
      companyId: agent.companyId,
    });

    return agent;
  } catch (error) {
    logger.error('[Inbound] Error querying local database for inbound agent', { error });
    return null;
  }
}

async function logInboundCall(
  payload: TwilioIncomingPayload,
  agent: { id: string; companyId: string } | null
) {
  try {
    if (!agent) return;

    await db.insert(voiceCalls).values({
      companyId: agent.companyId,
      agentId: agent.id,
      externalCallId: payload.CallSid,
      direction: 'inbound',
      fromNumber: payload.From,
      toNumber: payload.To,
      status: 'initiated',
      provider: 'retell',
      metadata: {
        callerCity: payload.CallerCity,
        callerState: payload.CallerState,
        callerCountry: payload.CallerCountry,
        forwardedFrom: payload.ForwardedFrom,
        stirVerstat: payload.StirVerstat,
      },
    });

    logger.info('[Inbound] Call logged to database', {
      callSid: payload.CallSid,
      agentId: agent.id,
    });
  } catch (error) {
    logger.warn('[Inbound] Failed to log call to database (non-blocking)', { error });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const body: Record<string, string> = {};
    formData.forEach((value, key) => {
      body[key] = value.toString();
    });
    
    logger.info('[Inbound] Twilio incoming call webhook received', { 
      callSid: body.CallSid,
      from: body.From,
      to: body.To,
      callerCity: body.CallerCity,
      callerCountry: body.CallerCountry,
    });

    const validation = twilioIncomingSchema.safeParse(body);
    
    if (!validation.success) {
      logger.warn('[Inbound] Twilio incoming webhook validation failed', { 
        errors: validation.error.flatten(),
        body: JSON.stringify(body).slice(0, 500),
      });
      return generateTwiMLResponse('Desculpe, não foi possível processar sua chamada.');
    }

    const payload: TwilioIncomingPayload = validation.data;

    const twimlResponse = await handleIncomingCall(payload);

    const processingTime = Date.now() - startTime;
    
    logger.info('[Inbound] Twilio incoming call webhook processed', { 
      callSid: payload.CallSid,
      from: payload.From,
      to: payload.To,
      processingTimeMs: processingTime,
    });

    return new NextResponse(twimlResponse, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    logger.error('[Inbound] Twilio incoming call webhook processing error', { error });
    return generateTwiMLResponse('Ocorreu um erro ao processar sua chamada. Por favor, tente novamente.');
  }
}

async function handleIncomingCall(payload: TwilioIncomingPayload): Promise<string> {
  logger.info('[Inbound] Processing incoming call', {
    callSid: payload.CallSid,
    from: payload.From,
    to: payload.To,
    callerLocation: `${payload.CallerCity || 'Unknown'}, ${payload.CallerState || ''}, ${payload.CallerCountry || ''}`.trim(),
  });

  if (voiceAIPlatform.isConfigured()) {
    try {
      await voiceAIPlatform.request('/api/calls/sync', 'POST', {
        externalCallId: payload.CallSid,
        status: 'initiated',
        direction: 'inbound',
        fromNumber: payload.From,
        toNumber: payload.To,
        metadata: {
          callerCity: payload.CallerCity,
          callerState: payload.CallerState,
          callerCountry: payload.CallerCountry,
          forwardedFrom: payload.ForwardedFrom,
          stirVerstat: payload.StirVerstat,
        },
        source: 'twilio_incoming_webhook',
      });
      logger.info('[Inbound] Call synced to Voice AI Platform', { callSid: payload.CallSid });
    } catch (error) {
      logger.warn('[Inbound] Failed to sync to Voice AI Platform (non-blocking)', { error, callSid: payload.CallSid });
    }
  }

  const localAgent = await getActiveInboundVoiceAgent();

  if (localAgent && localAgent.retellAgentId) {
    logger.info('[Inbound] ✅ Routing call to Retell agent from LOCAL DATABASE', { 
      agentId: localAgent.id, 
      agentName: localAgent.name,
      retellAgentId: localAgent.retellAgentId,
      callSid: payload.CallSid,
    });

    await logInboundCall(payload, localAgent);
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://api.retellai.com/audio-websocket/${localAgent.retellAgentId}">
      <Parameter name="call_sid" value="${payload.CallSid}" />
      <Parameter name="from" value="${payload.From}" />
      <Parameter name="to" value="${payload.To}" />
      <Parameter name="agent_id" value="${localAgent.id}" />
      <Parameter name="agent_name" value="${localAgent.name}" />
    </Stream>
  </Connect>
</Response>`;
  }

  try {
    if (voiceAIPlatform.isConfigured()) {
      logger.info('[Inbound] No local agent found, trying Voice AI Platform as fallback...');
      const agents = await voiceAIPlatform.listAgents();
      const activeInboundAgent = agents.find(a => a.type === 'inbound' && a.status === 'active');
      
      if (activeInboundAgent && activeInboundAgent.retellAgentId) {
        logger.info('[Inbound] Routing to Retell agent from Voice AI Platform (fallback)', { 
          agentId: activeInboundAgent.id, 
          retellAgentId: activeInboundAgent.retellAgentId,
          callSid: payload.CallSid,
        });
        
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://api.retellai.com/audio-websocket/${activeInboundAgent.retellAgentId}">
      <Parameter name="call_sid" value="${payload.CallSid}" />
      <Parameter name="from" value="${payload.From}" />
      <Parameter name="to" value="${payload.To}" />
    </Stream>
  </Connect>
</Response>`;
      }
    }
  } catch (error) {
    logger.warn('[Inbound] Voice AI Platform fallback failed', { error });
  }

  logger.warn('[Inbound] No active inbound agent found - returning voicemail response', {
    callSid: payload.CallSid,
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-BR" voice="Polly.Camila">
    Olá! Bem-vindo ao Master IA. Infelizmente, não há agentes disponíveis no momento.
    Por favor, tente novamente mais tarde ou deixe uma mensagem após o sinal.
  </Say>
  <Record maxLength="120" action="/api/v1/voice/webhooks/twilio/recording" transcribe="true" />
</Response>`;
}

function generateTwiMLResponse(message: string): NextResponse {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-BR" voice="Polly.Camila">${message}</Say>
  <Hangup />
</Response>`;
  
  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function GET() {
  const localAgent = await getActiveInboundVoiceAgent();
  
  const webhookUrl = process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/voice/webhooks/twilio/incoming`
    : 'Not configured - set NEXT_PUBLIC_APP_URL';

  return NextResponse.json({
    success: true,
    webhook: 'twilio-incoming',
    status: 'active',
    description: 'Handles incoming Twilio calls and routes to Retell AI agent',
    timestamp: new Date().toISOString(),
    configuration: {
      webhookUrl,
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || 'Not configured',
      localAgentConfigured: !!localAgent,
      localAgent: localAgent ? {
        id: localAgent.id,
        name: localAgent.name,
        retellAgentId: localAgent.retellAgentId,
        type: localAgent.type,
        status: localAgent.status,
      } : null,
      voiceAIPlatformConfigured: voiceAIPlatform.isConfigured(),
    },
    instructions: {
      step1: 'Create an inbound voice agent in the Voice AI page with type="inbound" and status="active"',
      step2: 'Ensure the agent has a valid retellAgentId configured',
      step3: `Configure Twilio webhook: Go to Twilio Console > Phone Numbers > ${process.env.TWILIO_PHONE_NUMBER || 'your number'} > Voice Configuration`,
      step4: `Set "A call comes in" webhook URL to: ${webhookUrl}`,
      step5: 'Set HTTP method to POST',
      step6: 'Test by calling the Twilio phone number',
    },
  });
}
