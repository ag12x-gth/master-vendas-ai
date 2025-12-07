import { NextRequest, NextResponse } from 'next/server';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!voiceAIPlatform.isConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Voice AI Platform not configured',
        details: 'Missing VOICE_AI_PLATFORM_URL or VOICE_AI_PLATFORM_API_KEY',
      }, { status: 500 });
    }

    const results: Record<string, unknown> = {};
    const errors: Record<string, string> = {};

    try {
      const healthData = await voiceAIPlatform.health();
      results.health = healthData;
    } catch (error) {
      errors.health = error instanceof Error ? error.message : 'Unknown error';
    }

    try {
      const configStatus = await voiceAIPlatform.getConfigStatus();
      results.configStatus = configStatus;
    } catch (error) {
      errors.configStatus = error instanceof Error ? error.message : 'Unknown error';
    }

    try {
      const agents = await voiceAIPlatform.listAgents();
      results.agentsCount = Array.isArray(agents) ? agents.length : 0;
      results.agents = Array.isArray(agents) ? agents.slice(0, 5) : [];
    } catch (error) {
      errors.agents = error instanceof Error ? error.message : 'Unknown error';
    }

    try {
      const analytics = await voiceAIPlatform.getAnalytics();
      results.analytics = analytics;
    } catch (error) {
      errors.analytics = error instanceof Error ? error.message : 'Unknown error';
    }

    const hasErrors = Object.keys(errors).length > 0;
    const allFailed = Object.keys(errors).length === 4;

    return NextResponse.json({
      success: !allFailed,
      configured: true,
      platformUrl: process.env.VOICE_AI_PLATFORM_URL,
      timestamp: new Date().toISOString(),
      results,
      errors: hasErrors ? errors : undefined,
    });

  } catch (error) {
    console.error('Voice AI Platform test connection error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test connection',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
