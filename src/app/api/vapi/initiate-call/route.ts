import { NextRequest, NextResponse } from 'next/server';
import * as CircuitBreaker from '@/lib/circuit-breaker';

interface InitiateCallRequest {
  phoneNumber: string;
  customerName: string;
  context: string;
  conversationId?: string;
}


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, customerName, context, conversationId }: InitiateCallRequest = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required field: phoneNumber' },
        { status: 400 }
      );
    }

    const VAPI_API_KEY = process.env.VAPI_API_KEY;
    const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID;

    if (!VAPI_API_KEY) {
      return NextResponse.json(
        { error: 'VAPI_API_KEY not configured. Please set up Vapi integration.' },
        { status: 500 }
      );
    }

    // Create Vapi assistant for this call
    const assistant = {
      name: `Call to ${customerName || phoneNumber}`,
      firstMessage: `Olá ${customerName || 'cliente'}, aqui é o assistente da Master IA. Vi que você estava conversando conosco no WhatsApp. Como posso ajudar?`,
      model: {
        provider: "openai",
        model: "gpt-4-turbo",
        systemPrompt: `Você é um assistente de voz da Master IA Oficial.

Contexto da conversa anterior no WhatsApp:
${context}

Instruções:
- Seja natural, empático e profissional
- Fale em português brasileiro
- Resolva o problema do cliente
- Se não conseguir resolver, ofereça transferir para um atendente humano
- Ao final, pergunte se pode ajudar em mais alguma coisa
- Mantenha as respostas concisas (máximo 2-3 frases por vez)`,
        temperature: 0.7,
        tools: [
          {
            type: "function",
            function: {
              name: "escalate_to_human",
              description: "Transferir chamada para um atendente humano",
              parameters: {
                type: "object",
                properties: {
                  reason: { type: "string", description: "Motivo da transferência" }
                },
                required: ["reason"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "save_call_summary",
              description: "Salvar resumo da conversa",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Resumo da conversa" },
                  resolved: { type: "boolean", description: "Se o problema foi resolvido" },
                  nextSteps: { type: "string", description: "Próximos passos, se houver" }
                },
                required: ["summary", "resolved"]
              }
            }
          }
        ]
      },
      voice: {
        provider: "11labs",
        voiceId: "pNInz6obpgDQGcFmaJgB" // Adam voice (Portuguese compatible)
      },
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "pt-BR"
      },
      serverUrl: `${process.env.APP_BASE_URL || `https://${process.env.REPLIT_DOMAINS}`}/api/vapi/webhook`
    };

    const callPayload: any = {
      assistant: assistant,
      customer: {
        number: phoneNumber,
        name: customerName
      },
      metadata: {
        conversationId: conversationId,
        source: 'whatsapp_escalation',
        context: context
      }
    };

    if (VAPI_PHONE_NUMBER_ID && VAPI_PHONE_NUMBER_ID.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      callPayload.phoneNumberId = VAPI_PHONE_NUMBER_ID;
    }

    // Check circuit breaker before making request
    if (CircuitBreaker.isOpen('vapi')) {
      return NextResponse.json(
        { error: 'Serviço de voz temporariamente indisponível. Tente novamente em alguns minutos.' },
        { status: 503 }
      );
    }

    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(callPayload),
      signal: AbortSignal.timeout(15000) // Timeout de 15s
    });

    if (!response.ok) {
      // Record failure for circuit breaker
      await CircuitBreaker.recordFailure('vapi');
      
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 400 && errorData.message?.includes('Over Concurrency Limit')) {
        return NextResponse.json(
          { 
            error: 'Sistema temporariamente ocupado. Por favor, tente novamente em alguns segundos.',
            details: 'Limite de chamadas simultâneas atingido no provedor Vapi.',
            retryAfter: 30
          },
          { status: 429 }
        );
      }
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Erro de autenticação com provedor de voz. Entre em contato com o suporte.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Não foi possível iniciar a chamada. Tente novamente.',
          details: errorData.message || 'Erro desconhecido'
        },
        { status: 503 }
      );
    }

    // Record success for circuit breaker
    await CircuitBreaker.recordSuccess('vapi');

    const callData = await response.json();

    console.log('✅ Vapi call initiated:', callData.id);

    return NextResponse.json({
      success: true,
      callId: callData.id,
      status: callData.status,
      message: 'Chamada iniciada com sucesso'
    });

  } catch (error: any) {
    console.error('Error initiating Vapi call:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar chamada' },
      { status: 500 }
    );
  }
}
