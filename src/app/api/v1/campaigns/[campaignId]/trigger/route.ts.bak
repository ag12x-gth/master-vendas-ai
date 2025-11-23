// src/app/api/v1/campaigns/[campaignId]/trigger/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { campaigns } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import redis from '@/lib/redis';
import { getCompanyIdFromSession } from '@/app/actions';

const WHATSAPP_CAMPAIGN_QUEUE = 'whatsapp_campaign_queue';
const SMS_CAMPAIGN_QUEUE = 'sms_campaign_queue';


/**
 * Endpoint para forçar o envio de UMA campanha específica.
 */
export async function POST(request: NextRequest, { params }: { params: { campaignId: string } }) {
    const { campaignId } = params;
    
    try {
        const companyId = await getCompanyIdFromSession();
        const [campaign] = await db.select().from(campaigns).where(and(eq(campaigns.id, campaignId), eq(campaigns.companyId, companyId)));

        if (!campaign) {
            return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
        }

        if (!['SCHEDULED', 'PENDING', 'QUEUED'].includes(campaign.status)) {
            return NextResponse.json({ error: `A campanha não está num estado que permita o reenvio. Status atual: ${campaign.status}` }, { status: 400 });
        }
        
        const queueName = campaign.channel === 'WHATSAPP' ? WHATSAPP_CAMPAIGN_QUEUE : SMS_CAMPAIGN_QUEUE;
        
        await db.update(campaigns).set({ status: 'QUEUED', scheduledAt: null }).where(eq(campaigns.id, campaign.id));
        await redis.lpush(queueName, campaign.id);

        return NextResponse.json({ success: true, message: 'Campanha adicionada à fila para envio imediato.' });
    } catch (error) {
        console.error(`Erro ao forçar envio da campanha ${campaignId}:`, error);
        // Tenta reverter o status em caso de falha ao enfileirar
        await db.update(campaigns).set({ status: 'SCHEDULED' }).where(eq(campaigns.id, campaignId));
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
