import { NextRequest, NextResponse } from 'next/server';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!voiceAIPlatform.isConfigured()) {
      return NextResponse.json(
        { error: 'Voice AI Platform não configurado' },
        { status: 503 }
      );
    }

    const call = await voiceAIPlatform.getCall(params.id);

    logger.info('Voice call fetched', { callId: params.id });

    return NextResponse.json({
      success: true,
      data: call,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching voice call', { callId: params.id, error });
    
    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json(
        { error: 'Chamada não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Falha ao buscar chamada de voz', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
