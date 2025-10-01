// src/app/api/v1/conversations/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { conversations, contacts, messages, connections } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
    try {
        const companyId = await getCompanyIdFromSession();
        
        const lastMessageSubquery = db
            .select({
                conversationId: messages.conversationId,
                lastMessageContent: messages.content,
                lastMessageSentAt: messages.sentAt,
                lastMessageStatus: messages.status,
                rowNumber: sql<number>`ROW_NUMBER() OVER(PARTITION BY ${messages.conversationId} ORDER BY ${messages.sentAt} DESC)`.as('rn')
            })
            .from(messages)
            .as('last_message_sq');

        const companyConversations = await db.select({
            id: conversations.id,
            status: conversations.status,
            aiActive: conversations.aiActive, // CORREÇÃO: Campo adicionado
            lastMessageAt: conversations.lastMessageAt,
            contactId: contacts.id,
            contactName: contacts.name,
            contactAvatar: contacts.avatarUrl,
            phone: contacts.phone,
            connectionName: connections.config_name,
            lastMessage: lastMessageSubquery.lastMessageContent,
            lastMessageStatus: lastMessageSubquery.lastMessageStatus,
        })
        .from(conversations)
        .innerJoin(contacts, eq(conversations.contactId, contacts.id))
        .leftJoin(connections, eq(conversations.connectionId, connections.id))
        .leftJoin(
            lastMessageSubquery,
            and(
                eq(conversations.id, lastMessageSubquery.conversationId),
                eq(lastMessageSubquery.rowNumber, 1)
            )
        )
        .where(eq(conversations.companyId, companyId))
        .orderBy(desc(conversations.lastMessageAt));
        
        return NextResponse.json(companyConversations);

    } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.debug('Erro ao buscar conversas:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
