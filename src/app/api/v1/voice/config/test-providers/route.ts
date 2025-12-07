import { NextRequest, NextResponse } from 'next/server';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    if (!voiceAIPlatform.isConfigured()) {
      return NextResponse.json(
        { error: 'Voice AI Platform não configurado' },
        { status: 503 }
      );
    }

    const [voiceResult, telephonyResult, llmResult] = await Promise.all([
      voiceAIPlatform.testVoiceProvider().catch(e => ({ success: false, message: e.message })),
      voiceAIPlatform.testTelephonyProvider().catch(e => ({ success: false, message: e.message })),
      voiceAIPlatform.testLLMProvider().catch(e => ({ success: false, message: e.message })),
    ]);

    logger.info('Voice providers tested', { 
      voice: voiceResult.success,
      telephony: telephonyResult.success,
      llm: llmResult.success 
    });

    return NextResponse.json({
      success: true,
      data: {
        voice: voiceResult,
        telephony: telephonyResult,
        llm: llmResult,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error testing voice providers', { error });
    return NextResponse.json(
      { error: 'Falha ao testar providers de voz', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
