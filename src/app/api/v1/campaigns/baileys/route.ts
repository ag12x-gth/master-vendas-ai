import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { campaigns, contactLists, contactsToContactLists, connections } from '@/lib/db/schema';
import { getCompanyIdFromSession } from '@/app/actions';
import { z } from 'zod';
import redis from '@/lib/redis';
import { inArray, eq, and, sql } from 'drizzle-orm';

const WHATSAPP_CAMPAIGN_QUEUE = 'whatsapp_campaign_queue';

const variableMappingSchema = z.object({
    type: z.enum(['fixed', 'dynamic']),
    value: z.string(),
});

const baileysCampaignSchema = z.object({
  name: z.string().min(1, 'Nome da campanha é obrigatório'),
  connectionId: z.string().uuid('Selecione uma conexão válida'),
  messageText: z.string().min(1, 'Mensagem é obrigatória').max(4096, 'Mensagem muito longa (máx 4096 caracteres)'),
  variableMappings: z.record(variableMappingSchema),
  contactListIds: z.array(z.string()).min(1, 'Selecione pelo menos uma lista.'),
  schedule: z.string().datetime({ offset: true }).nullable().optional(),
});


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const companyId = await getCompanyIdFromSession();
        const body = await request.json();
        const parsed = baileysCampaignSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 400 });
        }

        const { contactListIds, schedule, messageText, ...campaignData } = parsed.data;
        const isScheduled = !!schedule;

        // VALIDAÇÃO 1: Verificar ownership da conexão e que é Baileys
        const [connection] = await db
            .select()
            .from(connections)
            .where(and(
                eq(connections.id, campaignData.connectionId),
                eq(connections.companyId, companyId)
            ));
        
        if (!connection) {
            return NextResponse.json({ 
                error: 'Conexão inválida', 
                description: 'A conexão selecionada não existe ou não pertence à sua empresa.' 
            }, { status: 403 });
        }

        if (connection.connectionType !== 'baileys') {
            return NextResponse.json({ 
                error: 'Tipo de conexão inválido', 
                description: 'Apenas conexões Baileys são permitidas para este tipo de campanha.' 
            }, { status: 400 });
        }

        // VALIDAÇÃO 2: Verificar ownership das listas
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
        
        // VALIDAÇÃO 3: Verificar que todas as listas têm contatos
        const listsWithContacts = await db
            .select({ 
                listId: contactsToContactLists.listId,
                contactCount: sql<number>`COUNT(DISTINCT ${contactsToContactLists.contactId})`.as('contact_count')
            })
            .from(contactsToContactLists)
            .where(inArray(contactsToContactLists.listId, contactListIds))
            .groupBy(contactsToContactLists.listId);
        
        const listIdsWithContacts = new Set(listsWithContacts.map(l => l.listId));
        const emptyLists = contactListIds.filter(id => !listIdsWithContacts.has(id));
        
        if (emptyLists.length > 0) {
            return NextResponse.json({ 
                error: 'Lista(s) vazia(s)', 
                description: `${emptyLists.length} lista(s) selecionada(s) não possui(em) contatos. Adicione contatos a todas as listas antes de criar a campanha.` 
            }, { status: 400 });
        }

        // Criar campanha (sem templateId para Baileys)
        const [newCampaign] = await db.insert(campaigns).values({
            companyId: companyId,
            name: campaignData.name,
            channel: 'WHATSAPP',
            status: isScheduled ? 'SCHEDULED' : 'QUEUED',
            connectionId: campaignData.connectionId,
            templateId: null,
            variableMappings: campaignData.variableMappings,
            message: messageText,
            scheduledAt: schedule ? new Date(schedule) : null,
            contactListIds: contactListIds,
        }).returning();

        if (!newCampaign) {
          throw new Error("Não foi possível criar a campanha Baileys no banco de dados.");
        }
        
        // Se não for agendada, enfileira para processamento imediato
        if (!isScheduled) {
            await redis.lpush(WHATSAPP_CAMPAIGN_QUEUE, newCampaign.id);
        }

        const message = isScheduled 
            ? `Campanha "${newCampaign.name}" agendada com sucesso.`
            : `Campanha "${newCampaign.name}" adicionada à fila para envio.`;

        return NextResponse.json({ success: true, message: message, campaignId: newCampaign.id }, { status: 201 });

    } catch (error) {
        console.error('Erro ao criar campanha Baileys:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
    }
}
