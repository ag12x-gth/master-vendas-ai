import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { kanbanLeads, contacts, contactsToTags, tags, kanbanBoards } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getCompanyIdFromSession } from '@/app/actions';
import { webhookDispatcher } from '@/services/webhook-dispatcher.service';
import type { KanbanStage } from '@/lib/types';
import { getCachedOrFetch, CacheTTL } from '@/lib/api-cache';

export const dynamic = 'force-dynamic';

const leadCreateSchema = z.object({
  boardId: z.string().uuid(),
  stageId: z.string(),
  contactId: z.string().uuid(),
  value: z.number().optional().default(0),
});

// GET /api/v1/leads?boardId={boardId}
export async function GET(request: NextRequest) {
    try {
        const companyId = await getCompanyIdFromSession();
        const { searchParams } = new URL(request.url);
        const boardId = searchParams.get('boardId');

        if (!boardId) {
            return NextResponse.json({ error: 'O parâmetro boardId é obrigatório.' }, { status: 400 });
        }
        
        // Cache baseado no boardId
        const cacheKey = `leads:${companyId}:${boardId}`;
        const leads = await getCachedOrFetch(cacheKey, async () => {
            return await fetchLeadsData(companyId, boardId);
        }, CacheTTL.SHORT); // 30s cache - dados atualizados frequentemente no Kanban

        return NextResponse.json(leads);
    } catch (error) {
        console.error('Erro ao buscar leads:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
    }
}

async function fetchLeadsData(companyId: string, boardId: string) {
    const [board] = await db.select().from(kanbanBoards).where(eq(kanbanBoards.id, boardId));
    if (board?.companyId !== companyId) {
        throw new Error('Funil não encontrado ou não pertence à sua empresa.');
    }

    const flatLeadsAndContacts = await db
        .select({
            lead: kanbanLeads,
            contact: {
                id: contacts.id,
                companyId: contacts.companyId,
                name: contacts.name,
                whatsappName: contacts.whatsappName,
                phone: contacts.phone,
                email: contacts.email,
                avatarUrl: contacts.avatarUrl,
                status: contacts.status,
                notes: contacts.notes,
                profileLastSyncedAt: contacts.profileLastSyncedAt,
                addressStreet: contacts.addressStreet,
                addressNumber: contacts.addressNumber,
                addressComplement: contacts.addressComplement,
                addressDistrict: contacts.addressDistrict,
                addressCity: contacts.addressCity,
                addressState: contacts.addressState,
                addressZipCode: contacts.addressZipCode,
                createdAt: contacts.createdAt,
                externalId: contacts.externalId,
                externalProvider: contacts.externalProvider
            },
        })
        .from(kanbanLeads)
        .innerJoin(contacts, eq(kanbanLeads.contactId, contacts.id))
        .where(eq(kanbanLeads.boardId, boardId))
        .orderBy(asc(kanbanLeads.createdAt));
        
    // Post-process to add tags
    const leads = await Promise.all(flatLeadsAndContacts.map(async (row) => {
        const { lead, contact } = row;
        if (!contact) return lead;

        const contactTags = await db
            .select({ id: tags.id, name: tags.name, color: tags.color })
            .from(tags)
            .innerJoin(contactsToTags, eq(tags.id, contactsToTags.tagId))
            .where(eq(contactsToTags.contactId, contact.id));

        return {
            ...lead,
            contact: {
                ...contact,
                tags: contactTags
            }
        };
    }));

    return leads;
}


// POST /api/v1/leads
export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyIdFromSession();
    const body = await request.json();
    const parsed = leadCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 400 });
    }
    
    const { boardId, stageId, contactId, value } = parsed.data;

    // Verify board belongs to company
    const [board] = await db.select().from(kanbanBoards).where(eq(kanbanBoards.id, boardId));
    if (board?.companyId !== companyId) {
        return NextResponse.json({ error: 'Funil não encontrado ou não pertence à sua empresa.' }, { status: 404 });
    }

    const [newLead] = await db
        .insert(kanbanLeads)
        .values({
            boardId,
            stageId,
            contactId,
            value: value.toString(),
        })
        .returning();

    if (!newLead) {
      return NextResponse.json({ error: 'Falha ao criar lead.' }, { status: 500 });
    }

    try {
      const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, contactId),
      });

      const stages = board.stages as KanbanStage[];
      const stage = stages.find(s => s.id === stageId);

      console.log(`[Webhook] Dispatching lead_created for lead ${newLead.id}`);
      await webhookDispatcher.dispatch(companyId, 'lead_created', {
        leadId: newLead.id,
        contactId: contact?.id,
        boardId: board.id,
        stageName: stage?.title || 'Unknown',
        value: value,
      });
    } catch (webhookError) {
      console.error('[Webhook] Error dispatching lead_created:', webhookError);
    }

    return NextResponse.json(newLead, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar lead:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
    return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
  }
}
