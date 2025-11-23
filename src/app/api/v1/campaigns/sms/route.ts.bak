// src/app/api/v1/campaigns/sms/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { campaigns } from '@/lib/db/schema';
import { getCompanyIdFromSession } from '@/app/actions';
import { z } from 'zod';
import redis from '@/lib/redis';

const SMS_CAMPAIGN_QUEUE = 'sms_campaign_queue';

const smsCampaignSchema = z.object({
  name: z.string().min(1, 'Nome da campanha é obrigatório'),
  message: z.string().min(1, 'A mensagem é obrigatória'),
  schedule: z.string().datetime({ offset: true }).nullable().optional(),
  contactListIds: z.array(z.string()).min(1, 'Selecione pelo menos uma lista.'),
  smsGatewayId: z.string().uuid('Selecione um gateway de envio.'),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const companyId = await getCompanyIdFromSession();
        const body = await request.json();
        const parsed = smsCampaignSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 400 });
        }

        const { contactListIds, smsGatewayId, schedule, ...campaignData } = parsed.data;
        const isScheduled = !!schedule;

        const [newCampaign] = await db.insert(campaigns).values({
            companyId: companyId,
            name: campaignData.name,
            channel: 'SMS',
            status: isScheduled ? 'SCHEDULED' : 'QUEUED',
            smsGatewayId: smsGatewayId,
            message: campaignData.message,
            scheduledAt: schedule ? new Date(schedule) : null,
            contactListIds: contactListIds,
        }).returning();

        if (!newCampaign) {
          throw new Error("Não foi possível criar a campanha no banco de dados.");
        }
        
        if (!isScheduled) {
            await redis.lpush(SMS_CAMPAIGN_QUEUE, newCampaign.id);
        }

        const message = isScheduled 
            ? 'Campanha agendada com sucesso. Ela será enviada na data programada pelo nosso sistema.'
            : 'Campanha adicionada à fila para o próximo ciclo de envio.';

        return NextResponse.json({ success: true, message: message, campaignId: newCampaign.id }, { status: 201 });

    } catch (error) {
        console.error('Erro ao criar campanha de SMS:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
    }
}
