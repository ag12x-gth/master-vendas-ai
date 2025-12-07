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

    const analytics = await voiceAIPlatform.getAnalytics();

    logger.info('Voice analytics fetched', { totalCalls: analytics.totalCalls });

    return NextResponse.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching voice analytics', { error });
    return NextResponse.json(
      { error: 'Falha ao buscar analytics de voz', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
