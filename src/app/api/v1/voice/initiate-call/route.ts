import { NextRequest, NextResponse } from 'next/server';
import { getCompanyIdFromSession } from '@/app/actions';
import { retellService } from '@/lib/retell-service';
import { db } from '@/lib/db';
import { voiceAgents, voiceDeliveryReports } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+553322980007';

function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-().]/g, '');
  
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  cleaned = cleaned.replace(/\D/g, '');
  
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  return '+' + cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyIdFromSession();
    const body = await request.json();
    const { phoneNumber, customerName, contactId, agentId } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Número de telefone é obrigatório' },
        { status: 400 }
      );
    }

    if (!retellService.isConfigured()) {
      return NextResponse.json(
        { error: 'Retell API não configurada. Configure RETELL_API_KEY.' },
        { status: 500 }
      );
    }

    let selectedAgentId = agentId;
    if (!selectedAgentId) {
      const agents = await db
        .select()
        .from(voiceAgents)
        .where(and(
          eq(voiceAgents.companyId, companyId),
          eq(voiceAgents.status, 'active')
        ))
        .limit(1);

      if (agents.length === 0) {
        const retellAgents = await retellService.listAgents();
        
        // Procurar agente específico conhecido (Assistente-2)
        let selectedAgent = retellAgents.find(a => a.agent_name === 'Assistente-2');
        
        // Se não encontrar, usar o primeiro disponível
        if (!selectedAgent) {
          selectedAgent = retellAgents[0];
        }
        
        if (selectedAgent) {
          selectedAgentId = selectedAgent.agent_id;
          logger.info('Using Retell agent from API', { 
            agentId: selectedAgentId, 
            agentName: selectedAgent.agent_name 
          });
        } else {
          return NextResponse.json(
            { error: 'Nenhum agente de voz disponível. Crie um agente primeiro.' },
            { status: 400 }
          );
        }
      } else {
        const firstAgent = agents[0];
        selectedAgentId = firstAgent?.retellAgentId || firstAgent?.externalId || '';
        if (!selectedAgentId) {
          return NextResponse.json(
            { error: 'Agente não tem ID do Retell configurado. Verifique a configuração do agente.' },
            { status: 400 }
          );
        }
      }
    }

    const formattedNumber = normalizePhoneNumber(phoneNumber);

    logger.info('Initiating Retell call', {
      phoneNumber: formattedNumber,
      customerName,
      agentId: selectedAgentId,
      fromNumber: TWILIO_PHONE_NUMBER,
    });

    const call = await retellService.createPhoneCallWithVoicemailDetection({
      from_number: TWILIO_PHONE_NUMBER,
      to_number: formattedNumber,
      override_agent_id: selectedAgentId,
      metadata: {
        contact_id: contactId || '',
        customer_name: customerName || '',
        company_id: companyId,
        source: 'contact_profile',
      },
    });

    if (contactId && call.call_id) {
      try {
        await db.insert(voiceDeliveryReports).values({
          contactId: contactId,
          voiceAgentId: selectedAgentId,
          providerCallId: call.call_id,
          status: 'INITIATED',
          callOutcome: 'pending',
          attemptNumber: 1,
          sentAt: new Date(),
        });
        logger.info('Voice delivery report created for direct call', { callId: call.call_id, contactId });
      } catch (dbError) {
        logger.warn('Failed to create voice delivery report', { error: dbError });
      }
    }

    logger.info('Retell call initiated successfully', {
      callId: call.call_id,
      status: call.call_status,
    });

    return NextResponse.json({
      success: true,
      callId: call.call_id,
      status: call.call_status,
      message: `Chamada iniciada para ${customerName || phoneNumber}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao iniciar chamada';
    logger.error('Error initiating Retell call', { error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
