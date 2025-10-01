import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, assistantId } = await request.json();
    
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'phoneNumber is required' },
        { status: 400 }
      );
    }

    const vapiApiKey = process.env.VAPI_API_KEY;
    const vapiPhoneNumber = process.env.VAPI_PHONE_NUMBER;

    if (!vapiApiKey) {
      return NextResponse.json(
        { error: 'VAPI_API_KEY not configured' },
        { status: 500 }
      );
    }

    if (!vapiPhoneNumber) {
      return NextResponse.json(
        { error: 'VAPI_PHONE_NUMBER not configured' },
        { status: 500 }
      );
    }

    console.log('📞 Initiating Vapi test call to:', phoneNumber);

    const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumberId: vapiPhoneNumber,
        customer: {
          number: phoneNumber,
        },
        assistantId: assistantId || undefined,
        assistant: !assistantId ? {
          firstMessage: 'Olá! Este é um teste da integração Vapi com Master IA. Como posso ajudar?',
          model: {
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'Você é um assistente de teste da Master IA. Seja educado e breve. Ao final da conversa, agradeça e encerre.'
              }
            ]
          },
          voice: {
            provider: 'eleven-labs',
            voiceId: 'paula',
          },
        } : undefined,
      }),
    });

    const responseData = await vapiResponse.json();

    if (!vapiResponse.ok) {
      console.error('❌ Vapi API error:', responseData);
      return NextResponse.json(
        { 
          error: 'Failed to initiate call',
          details: responseData 
        },
        { status: vapiResponse.status }
      );
    }

    console.log('✅ Call initiated successfully:', responseData.id);

    return NextResponse.json({
      success: true,
      callId: responseData.id,
      status: responseData.status,
      message: 'Call initiated successfully. Check logs for webhook events.',
    });

  } catch (error) {
    console.error('Error initiating test call:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Vapi Test Call Endpoint',
    usage: 'POST with { phoneNumber: "+5511999999999", assistantId?: "optional" }',
    requiredSecrets: ['VAPI_API_KEY', 'VAPI_PHONE_NUMBER'],
  });
}
