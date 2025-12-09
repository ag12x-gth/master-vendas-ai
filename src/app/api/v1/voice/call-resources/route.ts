import { NextRequest, NextResponse } from 'next/server';
import { getCompanyIdFromSession } from '@/app/actions';
import { retellService } from '@/lib/retell-service';
import { db } from '@/lib/db';
import { connections, smsGateways } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+553322980007';

export async function GET(_request: NextRequest) {
  try {
    const companyId = await getCompanyIdFromSession();

    const phoneNumbers = [{
      phoneNumber: TWILIO_PHONE_NUMBER,
      friendlyName: 'Número Principal',
      voiceEnabled: true,
      smsEnabled: true,
    }];

    let retellAgents: { id: string; name: string; isPublished: boolean }[] = [];
    if (retellService.isConfigured()) {
      try {
        const agents = await retellService.listAgents();
        retellAgents = agents
          .filter(a => a.is_published)
          .map(a => ({
            id: a.agent_id,
            name: a.agent_name,
            isPublished: a.is_published,
          }));
      } catch (error) {
        logger.warn('Failed to fetch Retell agents', { error });
      }
    }

    const whatsappConnections = await db
      .select({
        id: connections.id,
        name: connections.config_name,
        phoneNumber: connections.phone,
      })
      .from(connections)
      .where(and(
        eq(connections.companyId, companyId),
        eq(connections.status, 'connected')
      ));

    const smsGatewaysList = await db
      .select({
        id: smsGateways.id,
        name: smsGateways.name,
        provider: smsGateways.provider,
      })
      .from(smsGateways)
      .where(and(
        eq(smsGateways.companyId, companyId),
        eq(smsGateways.isActive, true)
      ));

    return NextResponse.json({
      phoneNumbers,
      retellAgents,
      whatsappConnections,
      smsGateways: smsGatewaysList,
    });
  } catch (error) {
    logger.error('Error fetching call resources', { error });
    return NextResponse.json(
      { error: 'Erro ao buscar recursos de comunicação' },
      { status: 500 }
    );
  }
}
