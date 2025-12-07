import { NextRequest, NextResponse } from 'next/server';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const testCallSchema = z.object({
  agentId: z.string().uuid('ID do agente inválido'),
  toNumber: z.string().min(10, 'Número de telefone inválido'),
  variables: z.record(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!voiceAIPlatform.isConfigured()) {
      return NextResponse.json(
        { error: 'Voice AI Platform não configurado' },
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

    const result = await voiceAIPlatform.testCall(validation.data);

    logger.info('Test call initiated', { 
      agentId: validation.data.agentId, 
      toNumber: validation.data.toNumber,
      callId: result.callId 
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Chamada de teste iniciada com sucesso',
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
