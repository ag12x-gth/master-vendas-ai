// src/app/api/v1/conversations/[conversationId]/messages/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { conversations, messages, contacts, templates } from '@/lib/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { getCompanyIdFromSession, getUserIdFromSession } from '@/app/actions';
import { sendWhatsappTemplateMessage, sendWhatsappTextMessage } from '@/lib/facebookApiService';
import { z } from 'zod';
import { subHours } from 'date-fns';
import type { MetaApiMessageResponse } from '@/lib/types';

const textMessageSchema = z.object({
    type: z.literal('text'),
    text: z.string().min(1, 'A mensagem não pode estar em branco.'),
});

const templateMessageSchema = z.object({
    type: z.literal('template'),
    templateId: z.string().uuid('ID do modelo inválido.'),
    variableMappings: z.record(z.any()).optional(),
});

const messageSchema = z.union([textMessageSchema, templateMessageSchema]);

async function canSendFreeFormMessage(conversationId: string): Promise<boolean> {
    const [lastUserMessage] = await db.select()
        .from(messages)
        .where(and(
            eq(messages.conversationId, conversationId),
            eq(messages.senderType, 'USER')
        ))
        .orderBy(desc(messages.sentAt))
        .limit(1);

    if (!lastUserMessage) {
        return false;
    }

    const twentyFourHoursAgo = subHours(new Date(), 24);
    return new Date(lastUserMessage.sentAt) > twentyFourHoursAgo;
}

export async function GET(_request: NextRequest, { params }: { params: { conversationId: string } }): Promise<NextResponse> {
    try {
        const { conversationId } = params;
        
        const conversationMessages = await db.select()
            .from(messages)
            .where(eq(messages.conversationId, conversationId))
            .orderBy(asc(messages.sentAt));
            
        return NextResponse.json(conversationMessages);
    } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}


export async function POST(request: NextRequest, { params }: { params: { conversationId: string } }): Promise<NextResponse> {
    const companyId = await getCompanyIdFromSession();
    if (!companyId) {
        return NextResponse.json({ error: 'Empresa não autenticada.' }, { status: 401 });
    }
    const agentId = await getUserIdFromSession();
    if (!agentId) {
        return NextResponse.json({ error: 'Agente não autenticado.' }, { status: 401 });
    }

    try {
        const { conversationId } = params;
        const body = await request.json();
        const parsedBody = messageSchema.safeParse(body);

        if (!parsedBody.success) {
            return NextResponse.json({ error: 'Dados da mensagem inválidos.', details: parsedBody.error.flatten() }, { status: 400 });
        }
        
        const [conversation] = await db.select({
            id: conversations.id,
            companyId: conversations.companyId,
            contactId: conversations.contactId,
            connectionId: conversations.connectionId,
            status: conversations.status,
            createdAt: conversations.createdAt,
            updatedAt: conversations.updatedAt,
            lastMessageAt: conversations.lastMessageAt,
            assignedTo: conversations.assignedTo,
            archivedAt: conversations.archivedAt,
            archivedBy: conversations.archivedBy,
        }).from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.companyId, companyId)));
        
        if (!conversation) {
            return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 });
        }
        
        const [contact] = await db.select().from(contacts).where(eq(contacts.id, conversation.contactId));
        if (!contact) {
            return NextResponse.json({ error: 'Contato não encontrado.' }, { status: 404 });
        }
        
        if (!conversation.connectionId) {
            return NextResponse.json({ error: 'A conversa não está associada a nenhuma conexão.' }, { status: 400 });
        }

        let sentMessageResponse;
        let templateName = 'Mensagem de Texto';
        
        if (parsedBody.data.type === 'text') {
            const canSend = await canSendFreeFormMessage(conversation.id);
            if (!canSend) {
                return NextResponse.json({ error: 'A janela de 24 horas para resposta livre expirou. Use um modelo.' }, { status: 403 });
            }
            sentMessageResponse = await sendWhatsappTextMessage({
                connectionId: conversation.connectionId,
                to: contact.phone,
                text: parsedBody.data.text
            });
        } else {
            const [template] = await db.select().from(templates).where(eq(templates.id, parsedBody.data.templateId));
            if (!template) {
                return NextResponse.json({ error: 'Modelo não encontrado.' }, { status: 404 });
            }
            templateName = template.name;
            const components: any[] = [];
            sentMessageResponse = await sendWhatsappTemplateMessage({
                connectionId: conversation.connectionId,
                to: contact.phone,
                templateName: template.name,
                languageCode: template.language,
                components,
            });
        }
        
        const [savedMessage] = await db.insert(messages).values({
            conversationId: conversation.id,
            providerMessageId: (sentMessageResponse as unknown as MetaApiMessageResponse).messages?.[0]?.id,
            senderType: 'AGENT',
            senderId: agentId,
            content: parsedBody.data.type === 'text' ? parsedBody.data.text : `Template: ${templateName}`,
            contentType: parsedBody.data.type.toUpperCase(),
            status: 'SENT',
        }).returning();

        if (!savedMessage) {
            return NextResponse.json({ error: 'Falha ao salvar a mensagem no banco de dados.' }, { status: 500 });
        }
        
        await db.update(conversations).set({ lastMessageAt: new Date(), updatedAt: new Date() }).where(eq(conversations.id, conversation.id));

        return NextResponse.json(savedMessage, { status: 201 });

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        return NextResponse.json({ error: (error as Error).message, details: (error as Error).stack }, { status: 500 });
    }
}
