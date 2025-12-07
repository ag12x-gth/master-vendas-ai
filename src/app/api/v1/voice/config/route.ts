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

    const [config, status] = await Promise.all([
      voiceAIPlatform.getConfig().catch(() => null),
      voiceAIPlatform.getConfigStatus(),
    ]);

    logger.info('Voice config fetched');

    return NextResponse.json({
      success: true,
      data: {
        config,
        status,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching voice config', { error });
    return NextResponse.json(
      { error: 'Falha ao buscar configuração de voz', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
