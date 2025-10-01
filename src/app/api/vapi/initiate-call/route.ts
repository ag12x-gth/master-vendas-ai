import { NextRequest, NextResponse } from 'next/server';

interface InitiateCallRequest {
  phoneNumber: string;
  customerName: string;
  context: string;
  conversationId?: string;
}

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
    const VAPI_PHONE_NUMBER = process.env.VAPI_PHONE_NUMBER;

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
      serverUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/api/vapi/webhook`
    };

    // Initiate call via Vapi
    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistant: assistant,
        phoneNumber: VAPI_PHONE_NUMBER ? {
          twilioPhoneNumber: VAPI_PHONE_NUMBER
        } : undefined,
        customer: {
          number: phoneNumber,
          name: customerName
        },
        metadata: {
          conversationId: conversationId,
          source: 'whatsapp_escalation',
          context: context
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Vapi API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const callData = await response.json();

    // Save call record to database
    // TODO: Implement database save

    console.log('✅ Vapi call initiated:', callData.id);

    return NextResponse.json({
      success: true,
      callId: callData.id,
      status: callData.status,
      message: 'Call initiated successfully'
    });

  } catch (error: any) {
    console.error('Error initiating Vapi call:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate call' },
      { status: 500 }
    );
  }
}
