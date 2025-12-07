import { NextRequest, NextResponse } from 'next/server';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    if (!voiceAIPlatform.isConfigured()) {
      return NextResponse.json(
        { error: 'Voice AI Platform não configurado' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const calls = await voiceAIPlatform.listCalls({ limit, offset });

    logger.info('Voice calls listed', { count: calls.length, limit, offset });

    return NextResponse.json({
      success: true,
      data: calls,
      total: calls.length,
      pagination: { limit, offset },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error listing voice calls', { error });
    return NextResponse.json(
      { error: 'Falha ao listar chamadas de voz', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
