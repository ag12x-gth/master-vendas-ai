import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const RETELL_API_KEY = process.env.RETELL_API_KEY || '';
const RETELL_FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+553322980007';
const RETELL_AGENT_ID = 'agent_c96d270a5cad5d4608bb72ee08';

const testCallSchema = z.object({
  agentId: z.string().optional(),
  toNumber: z.string().min(10, 'Número de telefone inválido'),
  variables: z.record(z.string()).optional(),
});

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('55')) {
    return `+${cleaned}`;
  }
  return `+55${cleaned}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!RETELL_API_KEY) {
      return NextResponse.json(
        { error: 'Retell API Key não configurado' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validation = testCallSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const toNumber = formatPhoneNumber(validation.data.toNumber);

    const response = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from_number: RETELL_FROM_NUMBER,
        to_number: toNumber,
        override_agent_id: validation.data.agentId || RETELL_AGENT_ID,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Retell call failed', { status: response.status, error: errorBody });
      return NextResponse.json(
        { error: 'Falha ao iniciar chamada', details: errorBody },
        { status: response.status }
      );
    }

    const result = await response.json();

    logger.info('Test call initiated via Retell', { 
      toNumber,
      callId: result.call_id,
      status: result.call_status
    });

    return NextResponse.json({
      success: true,
      callId: result.call_id,
      status: result.call_status,
      agentName: result.agent_name,
      fromNumber: result.from_number,
      toNumber: result.to_number,
      message: 'Chamada iniciada com sucesso!',
      timestamp: new Date().toISOString(),
    }, { status: 201 });
  } catch (error) {
    logger.error('Error initiating test call', { error });
    return NextResponse.json(
      { error: 'Falha ao iniciar chamada de teste', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
