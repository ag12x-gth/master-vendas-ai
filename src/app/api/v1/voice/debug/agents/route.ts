import { NextRequest, NextResponse } from 'next/server';
import { retellService } from '@/lib/retell-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    logger.info('DEBUG: Listing Retell agents directly from API');
    
    const agents = await retellService.listAgents();
    
    logger.info('DEBUG: Successfully retrieved Retell agents', {
      count: agents.length,
      agents: agents.map(a => ({ id: a.agent_id, name: a.agent_name }))
    });
    
    return NextResponse.json({
      success: true,
      count: agents.length,
      agents: agents,
      apiKeyPrefix: process.env.RETELL_API_KEY?.substring(0, 10),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('DEBUG: Error listing Retell agents', { error: errorMessage });
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      apiKeyPrefix: process.env.RETELL_API_KEY?.substring(0, 10),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
