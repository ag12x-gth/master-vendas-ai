'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { contacts, contactsToContactLists, contactsToTags, tags, contactLists } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { getCompanyIdFromSession } from '@/app/actions';

const contactUpdateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  phone: z.string().min(10, 'Telefone inválido').optional(),
  email: z.string().email('Email inválido').optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
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


// GET /api/v1/contacts/[contactId]
export async function GET(request: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const companyId = await getCompanyIdFromSession();
    const { contactId } = params;
    const results = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, contactId), eq(contacts.companyId, companyId)));
    
    if (results.length === 0) {
        return NextResponse.json({ error: 'Contato não encontrado.' }, { status: 404 });
    }

    const contact = results[0];
    if (!contact) {
      return NextResponse.json({ error: 'Contato não encontrado.' }, { status: 404 });
    }

    const contactTags = await db.select({
        id: tags.id,
        name: tags.name,
        color: tags.color
    }).from(tags)
    .innerJoin(contactsToTags, eq(tags.id, contactsToTags.tagId))
    .where(eq(contactsToTags.contactId, contact.id));

    const contactContactLists = await db.select({
        id: contactLists.id,
        name: contactLists.name,
    }).from(contactLists)
    .innerJoin(contactsToContactLists, eq(contactLists.id, contactsToContactLists.listId))
    .where(eq(contactsToContactLists.contactId, contact.id));

    const response = {
        ...contact,
        tags: contactTags,
        lists: contactContactLists
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao buscar contato:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
    return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
  }
}

// PUT /api/v1/contacts/[contactId]
export async function PUT(request: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const companyId = await getCompanyIdFromSession();
    const { contactId } = params;

    const body = await request.json();
    const parsed = contactUpdateSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 400 });
    }
    
    const { listIds, tagIds, ...contactData } = parsed.data;

    const updatedContact = await db.transaction(async (tx) => {
        const contactDataToUpdate = Object.fromEntries(
            Object.entries(contactData).filter(([_, v]) => v !== undefined)
        );
        
        if (Object.keys(contactDataToUpdate).length > 0) {
            await tx
            .update(contacts)
            .set(contactDataToUpdate)
            .where(and(eq(contacts.id, contactId), eq(contacts.companyId, companyId)));
        }

        if (listIds !== undefined) {
            await tx.delete(contactsToContactLists).where(eq(contactsToContactLists.contactId, contactId));
            if (listIds.length > 0) {
                await tx.insert(contactsToContactLists).values(listIds.map(listId => ({ contactId, listId })));
            }
        }
        
        if (tagIds !== undefined) {
            await tx.delete(contactsToTags).where(eq(contactsToTags.contactId, contactId));
             if (tagIds.length > 0) {
                await tx.insert(contactsToTags).values(tagIds.map(tagId => ({ contactId, tagId })));
            }
        }

        const [finalContact] = await tx.select().from(contacts).where(eq(contacts.id, contactId));
        return finalContact;
    });

    if (!updatedContact) {
        return NextResponse.json({ error: 'Contato não encontrado ou não pertence à empresa.' }, { status: 404 });
    }
    
    return NextResponse.json(updatedContact);

  } catch (error) {
    console.error('Erro ao atualizar contato:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
    return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
  }
}

// DELETE /api/v1/contacts/[contactId]
export async function DELETE(request: NextRequest, { params }: { params: { contactId: string } }) {
    try {
        const companyId = await getCompanyIdFromSession();
        const { contactId } = params;
        await db.transaction(async (tx) => {
            await tx.delete(contactsToContactLists).where(eq(contactsToContactLists.contactId, contactId));
            await tx.delete(contactsToTags).where(eq(contactsToTags.contactId, contactId));
            await tx.delete(contacts).where(and(eq(contacts.id, contactId), eq(contacts.companyId, companyId)));
        });
        
        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error('Erro ao excluir contato:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
    }
}
