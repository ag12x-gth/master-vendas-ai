// src/app/api/v1/contacts/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { contacts, contactsToContactLists, contactsToTags, tags, contactLists } from '@/lib/db/schema';
import { and, asc, count, desc, eq, ilike, or, sql, inArray, SQL } from 'drizzle-orm';
import { z } from 'zod';
import { getCompanyIdFromSession } from '@/app/actions';
import { getCachedOrFetch, CacheTTL, apiCache } from '@/lib/api-cache';

export const dynamic = 'force-dynamic';

const contactCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido').optional().nullable(),
  avatarUrl: z.string().url('URL de avatar inválida').optional().nullable(),
  addressStreet: z.string().optional().nullable(),
  addressNumber: z.string().optional().nullable(),
  addressComplement: z.string().optional().nullable(),
  addressDistrict: z.string().optional().nullable(),
  addressCity: z.string().optional().nullable(),
  addressState: z.string().optional().nullable(),
  addressZipCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  listIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
});


// GET /api/v1/contacts
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const companyId = await getCompanyIdFromSession();
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const search = searchParams.get('search');
        const sortBy = searchParams.get('sortBy') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';
        const tagId = searchParams.get('tagId');
        const listId = searchParams.get('listId');
        const listIds = searchParams.getAll('listIds');

        // Cache key baseado em todos os parâmetros
        const cacheKey = `contacts:${companyId}:${page}:${limit}:${search || ''}:${sortBy}:${sortOrder}:${tagId || ''}:${listId || ''}:${listIds.join(',')}`;
        
        // Buscar dados com cache (60 segundos)
        const data = await getCachedOrFetch(cacheKey, async () => {
            return await fetchContactsData({ companyId, page, limit, search, sortBy, sortOrder, tagId, listId, listIds });
        }, CacheTTL.MEDIUM);

        return NextResponse.json(data);
    } catch (error) {
        console.error("Erro ao buscar contatos:", error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
    }
}

async function fetchContactsData(params: {
    companyId: string;
    page: number;
    limit: number;
    search: string | null;
    sortBy: string;
    sortOrder: string;
    tagId: string | null;
    listId: string | null;
    listIds: string[];
}) {
        const { companyId, page, limit, search, sortBy, sortOrder, tagId, listId, listIds } = params;

        const offset = (page - 1) * limit;

        const whereClauses: (SQL | undefined)[] = [eq(contacts.companyId, companyId)];
        if (search) {
            const digitsOnlySearch = search.replace(/\D/g, '');
            const searchConditions = or(
                ilike(contacts.name, `%${search}%`),
                ilike(contacts.email, `%${search}%`),
                // Se o termo de busca contiver dígitos, busca também no telefone.
                digitsOnlySearch ? sql`"phone" ILIKE ${'%' + digitsOnlySearch + '%'}` : undefined
            );
            whereClauses.push(searchConditions);
        }
        
        if (tagId && tagId !== 'all') {
          const subquery = db
            .select({ contactId: contactsToTags.contactId })
            .from(contactsToTags)
            .where(eq(contactsToTags.tagId, tagId));
          
          whereClauses.push(inArray(contacts.id, subquery));
        }

        if (listId && listId !== 'all') {
            const subquery = db
            .select({ contactId: contactsToContactLists.contactId })
            .from(contactsToContactLists)
            .where(eq(contactsToContactLists.listId, listId));
            
            whereClauses.push(inArray(contacts.id, subquery));
        }

        if (listIds && listIds.length > 0) {
            const subquery = db
            .selectDistinct({ contactId: contactsToContactLists.contactId })
            .from(contactsToContactLists)
            .where(inArray(contactsToContactLists.listId, listIds));
            
            whereClauses.push(inArray(contacts.id, subquery));
        }
        
        const finalWhereClauses = and(...whereClauses.filter((c): c is SQL => !!c));

        const countQuery = db.select({ value: count() }).from(contacts).where(finalWhereClauses);
        
        const sortableColumns: { [key: string]: any } = {
            name: contacts.name,
            createdAt: contacts.createdAt,
        };
        const orderByColumn = sortableColumns[sortBy] || contacts.createdAt;

        const dataQuery = db
            .select()
            .from(contacts)
            .where(finalWhereClauses)
            .orderBy(sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn))
            .limit(limit)
            .offset(offset);
        
        const [totalContactsResult, companyContacts] = await Promise.all([
            countQuery,
            dataQuery,
        ]);
        
        const totalContacts = totalContactsResult[0]?.value ?? 0;
        
        // ✅ OTIMIZAÇÃO: Resolver N+1 query problem
        // Em vez de fazer 2 queries por contato, fazemos apenas 2 queries totais
        const contactIds = companyContacts.map(c => c.id);
        
        // Buscar todas as tags de uma vez
        const allTagsQuery = contactIds.length > 0 
            ? db.select({
                contactId: contactsToTags.contactId,
                id: tags.id,
                name: tags.name,
                color: tags.color
            })
            .from(tags)
            .innerJoin(contactsToTags, eq(tags.id, contactsToTags.tagId))
            .where(inArray(contactsToTags.contactId, contactIds))
            : Promise.resolve([]);
        
        // Buscar todas as listas de uma vez
        const allListsQuery = contactIds.length > 0
            ? db.select({
                contactId: contactsToContactLists.contactId,
                id: contactLists.id,
                name: contactLists.name,
            })
            .from(contactLists)
            .innerJoin(contactsToContactLists, eq(contactLists.id, contactsToContactLists.listId))
            .where(inArray(contactsToContactLists.contactId, contactIds))
            : Promise.resolve([]);
        
        const [allTags, allLists] = await Promise.all([allTagsQuery, allListsQuery]);
        
        // Agrupar tags e listas por contactId
        const tagsByContact: Record<string, Array<{id: string, name: string, color: string}>> = {};
        for (const tag of allTags) {
            if (!tag.contactId || !tag.id || !tag.name) continue;
            const existing = tagsByContact[tag.contactId] ?? [];
            existing.push({ id: tag.id, name: tag.name, color: tag.color || '' });
            tagsByContact[tag.contactId] = existing;
        }
        
        const listsByContact: Record<string, Array<{id: string, name: string}>> = {};
        for (const list of allLists) {
            if (!list.contactId || !list.id || !list.name) continue;
            const existing = listsByContact[list.contactId] ?? [];
            existing.push({ id: list.id, name: list.name });
            listsByContact[list.contactId] = existing;
        }
        
        // Combinar os dados
        const contactsWithRelations = companyContacts.map(contact => ({
            ...contact,
            tags: tagsByContact[contact.id] || [],
            lists: listsByContact[contact.id] || [],
        }));


        return {
            data: contactsWithRelations,
            totalPages: Math.ceil(totalContacts / limit),
        };
}


// POST /api/v1/contacts (para criação de contato único, não importação)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const companyId = await getCompanyIdFromSession();
    const body = await request.json();
    const parsed = contactCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 400 });
    }
    
    const { listIds, tagIds, ...contactData } = parsed.data;

    const newContact = await db.transaction(async (tx) => {
        const [createdContact] = await tx
            .insert(contacts)
            .values({
                ...contactData,
                companyId,
            })
            .returning();
        
        if (!createdContact) {
          throw new Error("Falha ao criar o contato no banco de dados.");
        }

        if (tagIds && tagIds.length > 0) {
            await tx.insert(contactsToTags).values(tagIds.map(tagId => ({ contactId: createdContact.id, tagId })));
        }

        if (listIds && listIds.length > 0) {
            await tx.insert(contactsToContactLists).values(listIds.map(listId => ({ contactId: createdContact.id, listId })));
        }

        return createdContact;
    });

    // Invalidar cache ao criar novo contato
    apiCache.invalidatePattern(`contacts:${companyId}`);

    return NextResponse.json(newContact, { status: 201 });
  } catch (error: any) {
    if (error.code === '23505' && error.constraint === 'contacts_phone_company_id_unique') {
        return NextResponse.json({ error: 'Já existe um contato com este telefone.' }, { status: 409 });
    }
    console.error("Erro ao criar contato:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
    return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
  }
}
