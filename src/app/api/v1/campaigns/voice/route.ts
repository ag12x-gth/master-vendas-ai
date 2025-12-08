import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { campaigns, contactLists, contactsToContactLists, voiceAgents } from '@/lib/db/schema';
import { getCompanyIdFromSession } from '@/app/actions';
import { z } from 'zod';
import redis from '@/lib/redis';
import { inArray, eq, and, sql } from 'drizzle-orm';

const VOICE_CAMPAIGN_QUEUE = 'voice_campaign_queue';

const voiceCampaignSchema = z.object({
  name: z.string().min(1, 'Nome da campanha é obrigatório'),
  voiceAgentId: z.string().uuid('Selecione um agente de voz válido'),
  schedule: z.string().datetime({ offset: true }).nullable().optional(),
  contactListIds: z.array(z.string()).min(1, 'Selecione pelo menos uma lista.'),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const companyId = await getCompanyIdFromSession();
        const body = await request.json();
        const parsed = voiceCampaignSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 400 });
        }

        const { contactListIds, voiceAgentId, schedule, name } = parsed.data;
        const isScheduled = !!schedule;

        const [agent] = await db
            .select({ id: voiceAgents.id, retellAgentId: voiceAgents.retellAgentId })
            .from(voiceAgents)
            .where(and(
                eq(voiceAgents.id, voiceAgentId),
                eq(voiceAgents.companyId, companyId)
            ));

        if (!agent) {
            return NextResponse.json({ 
                error: 'Agente inválido', 
                description: 'O agente de voz selecionado não existe ou não pertence à sua empresa.' 
            }, { status: 403 });
        }

        if (!agent.retellAgentId) {
            return NextResponse.json({ 
                error: 'Agente não configurado', 
                description: 'O agente de voz selecionado não está vinculado ao Retell. Configure o agente antes de criar campanhas.' 
            }, { status: 400 });
        }

        const ownedLists = await db
            .select({ id: contactLists.id })
            .from(contactLists)
            .where(and(
                eq(contactLists.companyId, companyId),
                inArray(contactLists.id, contactListIds)
            ));
        
        if (ownedLists.length !== contactListIds.length) {
            return NextResponse.json({ 
                error: 'Lista(s) inválida(s)', 
                description: 'Uma ou mais listas selecionadas não existem ou não pertencem à sua empresa.' 
            }, { status: 403 });
        }
        
        const listsWithContacts = await db
            .select({ 
                listId: contactsToContactLists.listId,
                contactCount: sql<number>`COUNT(DISTINCT ${contactsToContactLists.contactId})`.as('contact_count')
            })
            .from(contactsToContactLists)
            .where(inArray(contactsToContactLists.listId, contactListIds))
            .groupBy(contactsToContactLists.listId);
        
        const validListIds = listsWithContacts
            .filter(l => Number(l.contactCount) > 0)
            .map(l => l.listId);
        
        if (validListIds.length === 0) {
            return NextResponse.json({ 
                error: 'Nenhum contato disponível', 
                description: 'Todas as listas selecionadas estão vazias. Adicione contatos a pelo menos uma lista antes de criar a campanha.' 
            }, { status: 400 });
        }
        
        const finalContactListIds = validListIds;

        const [newCampaign] = await db.insert(campaigns).values({
            companyId: companyId,
            name: name,
            channel: 'VOICE',
            status: isScheduled ? 'SCHEDULED' : 'QUEUED',
            voiceAgentId: voiceAgentId,
            scheduledAt: schedule ? new Date(schedule) : null,
            contactListIds: finalContactListIds,
            batchSize: 20,
            batchDelaySeconds: 50,
        }).returning();

        if (!newCampaign) {
          throw new Error("Não foi possível criar a campanha no banco de dados.");
        }
        
        if (!isScheduled) {
            console.log(`[Voice Campaign] Adicionando campanha ${newCampaign.id} à fila para processamento imediato`);
            
            await redis.lpush(VOICE_CAMPAIGN_QUEUE, newCampaign.id);
            
            let baseUrl: string;
            if (process.env.NEXT_PUBLIC_APP_URL) {
                baseUrl = process.env.NEXT_PUBLIC_APP_URL;
            } else if (process.env.VERCEL_URL) {
                baseUrl = `https://${process.env.VERCEL_URL}`;
            } else {
                baseUrl = 'http://localhost:5000';
            }
            
            fetch(`${baseUrl}/api/v1/campaigns/trigger`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }).then(res => {
                if (!res.ok) {
                    console.warn(`[Voice Campaign] Trigger retornou status ${res.status}`);
                }
            }).catch(err => {
                console.error(`[Voice Campaign] Erro ao disparar trigger: ${err.message}`);
            });
            
            console.log(`[Voice Campaign] Trigger disparado para campanha ${newCampaign.id}`);
        }

        const ignoredListsCount = contactListIds.length - finalContactListIds.length;
        let message = isScheduled 
            ? 'Campanha de voz agendada com sucesso. Ela será processada na data programada.'
            : 'Campanha de voz criada! As ligações estão sendo iniciadas. Acompanhe o progresso na lista de campanhas.';
        
        if (ignoredListsCount > 0) {
            message += ` (${ignoredListsCount} lista${ignoredListsCount !== 1 ? 's' : ''} vazia${ignoredListsCount !== 1 ? 's' : ''} ignorada${ignoredListsCount !== 1 ? 's' : ''})`;
        }

        return NextResponse.json({ 
            success: true, 
            message: message, 
            campaignId: newCampaign.id,
            listsUsed: finalContactListIds.length,
            listsIgnored: ignoredListsCount
        }, { status: 201 });

    } catch (error) {
        console.error('Erro ao criar campanha de voz:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
    }
}
