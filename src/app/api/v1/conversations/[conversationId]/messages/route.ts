// src/app/api/v1/conversations/[conversationId]/messages/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { conversations, messages, contacts, templates, connections, messageReactions } from '@/lib/db/schema';
import { eq, and, desc, inArray, lt } from 'drizzle-orm';
import { getCompanyIdFromSession, getUserIdFromSession } from '@/app/actions';
import { sendWhatsappTemplateMessage, sendWhatsappTextMessage } from '@/lib/facebookApiService';
import { sessionManager } from '@/services/baileys-session-manager';
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


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { conversationId: string } }): Promise<NextResponse> {
    try {
        const { conversationId } = params;
        const { searchParams } = new URL(request.url);
        
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
        const before = searchParams.get('before');
        
        const conditions = [eq(messages.conversationId, conversationId)];
        
        if (before) {
            const beforeDate = new Date(before);
            if (isNaN(beforeDate.getTime())) {
                return NextResponse.json({ 
                    error: 'Parâmetro "before" inválido. Deve ser um timestamp ISO válido.' 
                }, { status: 400 });
            }
            conditions.push(lt(messages.sentAt, beforeDate));
        }
        
        const conversationMessages = await db.select()
            .from(messages)
            .where(and(...conditions))
            .orderBy(desc(messages.sentAt))
            .limit(limit + 1);

        const hasMore = conversationMessages.length > limit;
        const messagesToReturn = hasMore ? conversationMessages.slice(0, limit) : conversationMessages;
        
        const sortedMessages = [...messagesToReturn].reverse();

        const messageIds = sortedMessages.map(m => m.id);
        const reactions = messageIds.length > 0
            ? await db.select().from(messageReactions).where(inArray(messageReactions.messageId, messageIds))
            : [];

        const messagesWithReactions = sortedMessages.map(msg => ({
            ...msg,
            reactions: reactions.filter(r => r.messageId === msg.id).map(r => ({
                emoji: r.emoji,
                reactorPhone: r.reactorPhone,
                reactorName: r.reactorName,
            })),
        }));
        
        const lastMessage = messagesToReturn[messagesToReturn.length - 1];
        const nextBefore = hasMore && lastMessage 
            ? lastMessage.sentAt.toISOString() 
            : null;
            
        return NextResponse.json({
            messages: messagesWithReactions,
            hasMore,
            nextBefore
        });
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

        const [connection] = await db.select().from(connections).where(eq(connections.id, conversation.connectionId));
        if (!connection) {
            return NextResponse.json({ error: 'Conexão não encontrada.' }, { status: 404 });
        }

        let sentMessageResponse: any;
        let providerMessageId: string | null | undefined;
        let templateName = 'Mensagem de Texto';
        
        if (parsedBody.data.type === 'text') {
            const canSend = await canSendFreeFormMessage(conversation.id);
            if (!canSend) {
                return NextResponse.json({ error: 'A janela de 24 horas para resposta livre expirou. Use um modelo.' }, { status: 403 });
            }
            
            if (connection.connectionType === 'baileys') {
                providerMessageId = await sessionManager.sendMessage(conversation.connectionId, contact.phone, {
                    text: parsedBody.data.text
                });
                if (!providerMessageId) {
                    return NextResponse.json({ error: 'Falha ao enviar mensagem - sessão não conectada.' }, { status: 500 });
                }
            } else if (connection.connectionType === 'meta_api') {
                sentMessageResponse = await sendWhatsappTextMessage({
                    connectionId: conversation.connectionId,
                    to: contact.phone,
                    text: parsedBody.data.text
                });
                providerMessageId = (sentMessageResponse as unknown as MetaApiMessageResponse).messages?.[0]?.id;
            } else {
                return NextResponse.json({ error: 'Tipo de conexão não suportado.' }, { status: 400 });
            }
        } else {
            if (connection.connectionType === 'baileys') {
                return NextResponse.json({ error: 'Envio de templates não suportado para conexões Baileys. Use mensagens de texto.' }, { status: 400 });
            }
            
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
            providerMessageId = (sentMessageResponse as unknown as MetaApiMessageResponse).messages?.[0]?.id;
        }
        
        const [savedMessage] = await db.insert(messages).values({
            conversationId: conversation.id,
            providerMessageId,
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
