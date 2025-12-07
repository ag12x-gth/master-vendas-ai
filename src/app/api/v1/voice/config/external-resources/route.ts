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

    const [organizations, retellAgents, twilioPhoneNumbers] = await Promise.all([
      voiceAIPlatform.listOrganizations().catch(() => []),
      voiceAIPlatform.listRetellAgents().catch(() => []),
      voiceAIPlatform.listTwilioPhoneNumbers().catch(() => []),
    ]);

    logger.info('External resources fetched', { 
      organizations: organizations.length,
      retellAgents: retellAgents.length,
      twilioPhoneNumbers: twilioPhoneNumbers.length 
    });

    return NextResponse.json({
      success: true,
      data: {
        organizations,
        retellAgents,
        twilioPhoneNumbers,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching external resources', { error });
    return NextResponse.json(
      { error: 'Falha ao buscar recursos externos', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
