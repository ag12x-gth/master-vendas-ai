// src/app/api/v1/contacts/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { contacts, contactsToContactLists, contactsToTags } from '@/lib/db/schema';
import { and, count, eq, ilike, or, sql, inArray, SQL } from 'drizzle-orm';
import { z } from 'zod';
import { getCompanyIdFromSession } from '@/app/actions';
import { getCachedOrFetch, CacheTTL, apiCache } from '@/lib/api-cache';
import { sanitizePhone, canonicalizeBrazilPhone } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const contactCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').trim(),
  phone: z.string().min(10, 'Telefone inválido').trim(),
  email: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? undefined : val,
    z.string().email('Email inválido').optional()
  ),
  avatarUrl: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? undefined : val,
    z.string().url('URL de avatar inválida').optional()
  ),
  addressStreet: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? undefined : val,
    z.string().optional()
  ),
  addressNumber: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? undefined : val,
    z.string().optional()
  ),
  addressComplement: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? undefined : val,
    z.string().optional()
  ),
  addressDistrict: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? undefined : val,
    z.string().optional()
  ),
  addressCity: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? undefined : val,
    z.string().optional()
  ),
  addressState: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? undefined : val,
    z.string().optional()
  ),
  addressZipCode: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? undefined : val,
    z.string().optional()
  ),
  notes: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? undefined : val,
    z.string().optional()
  ),
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
        
        // Buscar dados com cache (30 segundos - CacheTTL.SHORT)
        const data = await getCachedOrFetch(cacheKey, async () => {
            return await fetchContactsData({ companyId, page, limit, search, sortBy, sortOrder, tagId, listId, listIds });
        }, CacheTTL.SHORT);

        console.log(`[Contacts API] Returning ${data?.data?.length || 0} contacts out of ${data?.totalPages || 0} pages for company ${companyId}`);
        return NextResponse.json(data);
    } catch (error) {
        console.error("Erro ao buscar contatos:", error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
    }
}

async function fetchContactsData(options: {
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
        const { companyId, page, limit, search, sortBy, sortOrder, tagId, listId, listIds } = options;

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

        // Query para contar total de contatos
        const countQuery = db.select({ value: count() }).from(contacts).where(finalWhereClauses);
        
        // ✅ CORREÇÃO 7: JOIN com json_agg para evitar N+1 queries
        // Agora fazemos 1 única query em vez de 3 queries separadas
        const sortableColumns: { [key: string]: string } = {
            name: 'name',
            createdAt: 'created_at',
        };
        const orderByField = sortableColumns[sortBy] || 'created_at';
        const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

        // Construir filtros WHERE dinâmicos
        let whereConditions = sql`c.company_id = ${companyId}`;
        
        if (search) {
            const digitsOnlySearch = search.replace(/\D/g, '');
            if (digitsOnlySearch) {
                whereConditions = sql`${whereConditions} AND (c.name ILIKE ${`%${search}%`} OR c.email ILIKE ${`%${search}%`} OR c.phone ILIKE ${`%${digitsOnlySearch}%`})`;
            } else {
                whereConditions = sql`${whereConditions} AND (c.name ILIKE ${`%${search}%`} OR c.email ILIKE ${`%${search}%`})`;
            }
        }
        
        if (tagId && tagId !== 'all') {
            whereConditions = sql`${whereConditions} AND c.id IN (SELECT contact_id FROM contacts_to_tags WHERE tag_id = ${tagId})`;
        }
        
        if (listId && listId !== 'all') {
            whereConditions = sql`${whereConditions} AND c.id IN (SELECT contact_id FROM contacts_to_contact_lists WHERE list_id = ${listId})`;
        }
        
        if (listIds && listIds.length > 0) {
            whereConditions = sql`${whereConditions} AND c.id IN (SELECT DISTINCT contact_id FROM contacts_to_contact_lists WHERE list_id = ANY(${listIds}))`;
        }

        // Query otimizada com LEFT JOIN + json_agg
        // ⚠️ IMPORTANTE: Aliases para manter camelCase e compatibilidade da API
        const dataQuery = sql`
            SELECT 
                c.id,
                c.company_id AS "companyId",
                c.name,
                c.whatsapp_name AS "whatsappName",
                c.phone,
                c.email,
                c.avatar_url AS "avatarUrl",
                c.status,
                c.notes,
                c.profile_last_synced_at AS "profileLastSyncedAt",
                c.address_street AS "addressStreet",
                c.address_number AS "addressNumber",
                c.address_complement AS "addressComplement",
                c.address_district AS "addressDistrict",
                c.address_city AS "addressCity",
                c.address_state AS "addressState",
                c.address_zip_code AS "addressZipCode",
                c.external_id AS "externalId",
                c.external_provider AS "externalProvider",
                c.created_at AS "createdAt",
                c.deleted_at AS "deletedAt",
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'id', t.id, 
                            'name', t.name, 
                            'color', t.color
                        )
                    ) FILTER (WHERE t.id IS NOT NULL), 
                    '[]'
                ) as tags,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'id', cl.id, 
                            'name', cl.name
                        )
                    ) FILTER (WHERE cl.id IS NOT NULL), 
                    '[]'
                ) as lists
            FROM contacts c
            LEFT JOIN contacts_to_tags ctt ON c.id = ctt.contact_id
            LEFT JOIN tags t ON ctt.tag_id = t.id AND t.company_id = ${companyId}
            LEFT JOIN contacts_to_contact_lists ctcl ON c.id = ctcl.contact_id
            LEFT JOIN contact_lists cl ON ctcl.list_id = cl.id AND cl.company_id = ${companyId}
            WHERE ${whereConditions}
            GROUP BY c.id
            ORDER BY ${sql.raw(`c.${orderByField}`)} ${sql.raw(orderDirection)}
            LIMIT ${limit} OFFSET ${offset}
        `;

        const [totalContactsResult, rawContactsResult] = await Promise.all([
            countQuery,
            db.execute(dataQuery),
        ]);
        
        const totalContacts = totalContactsResult[0]?.value ?? 0;
        
        // db.execute() retorna um array diretamente, não um objeto com .rows
        const contactsWithRelations = Array.isArray(rawContactsResult) ? rawContactsResult : [];


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
    
    // Normalize phone number to canonical Brazilian format
    const sanitized = sanitizePhone(contactData.phone);
    const normalizedPhone = sanitized ? canonicalizeBrazilPhone(sanitized) : contactData.phone;

    const newContact = await db.transaction(async (tx) => {
        const [createdContact] = await tx
            .insert(contacts)
            .values({
                ...contactData,
                phone: normalizedPhone,
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