import { NextRequest, NextResponse } from 'next/server';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';
import { logger } from '@/lib/logger';
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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const body: Record<string, string> = {};
    formData.forEach((value, key) => {
      body[key] = value.toString();
    });
    
    logger.info('Twilio incoming call webhook received', { 
      callSid: body.CallSid,
      from: body.From,
      to: body.To,
      callerCity: body.CallerCity,
      callerCountry: body.CallerCountry,
    });

    const validation = twilioIncomingSchema.safeParse(body);
    
    if (!validation.success) {
      logger.warn('Twilio incoming webhook validation failed', { 
        errors: validation.error.flatten(),
        body: JSON.stringify(body).slice(0, 500),
      });
      return generateTwiMLResponse('Desculpe, não foi possível processar sua chamada.');
    }

    const payload: TwilioIncomingPayload = validation.data;

    const twimlResponse = await handleIncomingCall(payload);

    const processingTime = Date.now() - startTime;
    
    logger.info('Twilio incoming call webhook processed', { 
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
    logger.error('Twilio incoming call webhook processing error', { error });
    return generateTwiMLResponse('Ocorreu um erro ao processar sua chamada. Por favor, tente novamente.');
  }
}

async function handleIncomingCall(payload: TwilioIncomingPayload): Promise<string> {
  logger.info('Processing incoming call', {
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
      logger.info('Incoming call synced to Voice AI Platform', { callSid: payload.CallSid });
    } catch (error) {
      logger.warn('Failed to sync incoming call to Voice AI Platform (non-blocking)', { error, callSid: payload.CallSid });
    }
  }

  try {
    if (voiceAIPlatform.isConfigured()) {
      const agents = await voiceAIPlatform.listAgents();
      const activeInboundAgent = agents.find(a => a.type === 'inbound' && a.status === 'active');
      
      if (activeInboundAgent && activeInboundAgent.retellAgentId) {
        logger.info('Routing to Retell agent', { 
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
    logger.warn('Failed to find active inbound agent', { error });
  }

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
  return NextResponse.json({
    success: true,
    webhook: 'twilio-incoming',
    status: 'active',
    description: 'Handles incoming Twilio calls and routes to appropriate agent',
    timestamp: new Date().toISOString(),
  });
}
