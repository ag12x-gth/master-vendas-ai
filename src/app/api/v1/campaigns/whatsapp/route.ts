

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { campaigns } from '@/lib/db/schema';
import { getCompanyIdFromSession } from '@/app/actions';
import { z } from 'zod';
import redis from '@/lib/redis';

const WHATSAPP_CAMPAIGN_QUEUE = 'whatsapp_campaign_queue';

const variableMappingSchema = z.object({
    type: z.enum(['fixed', 'dynamic']),
    value: z.string(),
});

const whatsappCampaignSchema = z.object({
  name: z.string().min(1, 'Nome da campanha é obrigatório'),
  connectionId: z.string().uuid('Selecione uma conexão válida'),
  templateId: z.string().uuid('Selecione um modelo válido'),
  variableMappings: z.record(variableMappingSchema),
  contactListIds: z.array(z.string()).min(1, 'Selecione pelo menos uma lista.'),
  schedule: z.string().datetime({ offset: true }).nullable().optional(),
  mediaAssetId: z.string().uuid('Asset de mídia inválido').optional().nullable(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const companyId = await getCompanyIdFromSession();
        const body = await request.json();
        const parsed = whatsappCampaignSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 400 });
        }

        const { contactListIds, schedule, ...campaignData } = parsed.data;
        const isScheduled = !!schedule;

        const [newCampaign] = await db.insert(campaigns).values({
            companyId: companyId,
            name: campaignData.name,
            channel: 'WHATSAPP',
            status: isScheduled ? 'SCHEDULED' : 'QUEUED',
            connectionId: campaignData.connectionId,
            templateId: campaignData.templateId,
            variableMappings: campaignData.variableMappings,
            mediaAssetId: campaignData.mediaAssetId,
            scheduledAt: schedule ? new Date(schedule) : null,
            contactListIds: contactListIds,
        }).returning();

        if (!newCampaign) {
          throw new Error("Não foi possível criar a campanha de WhatsApp no banco de dados.");
        }
        
        // Se não for agendada, enfileira para processamento imediato pelo worker.
        if (!isScheduled) {
            await redis.lpush(WHATSAPP_CAMPAIGN_QUEUE, newCampaign.id);
        }

        const message = isScheduled 
            ? `Campanha "${newCampaign.name}" agendada com sucesso.`
            : `Campanha "${newCampaign.name}" adicionada à fila para envio.`;

        return NextResponse.json({ success: true, message: message, campaignId: newCampaign.id }, { status: 201 });

    } catch (error) {
        console.error('Erro ao criar campanha de WhatsApp:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
    }
}
