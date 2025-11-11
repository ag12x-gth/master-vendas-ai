// src/app/api/v1/conversations/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { conversations, contacts, messages, connections } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';
import { getCachedOrFetch, CacheTTL } from '@/lib/api-cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const companyId = await getCompanyIdFromSession();
        
        const { searchParams } = new URL(request.url);
        const limitParam = searchParams.get('limit');
        
        const SAFETY_CAP = 10000;
        let limit: number;
        
        if (limitParam === null) {
            limit = 50;
        } else if (limitParam === '0') {
            limit = SAFETY_CAP;
        } else {
            const parsedLimit = parseInt(limitParam, 10);
            limit = isNaN(parsedLimit) || parsedLimit < 0 ? 50 : Math.min(parsedLimit, SAFETY_CAP);
        }
        
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        
        const cacheKey = `conversations:${companyId}:${limit}:${offset}`;
        const data = await getCachedOrFetch(cacheKey, async () => {
            return await fetchConversationsData(companyId, limit, offset);
        }, CacheTTL.SHORT);

        return NextResponse.json(data);
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.debug('Erro ao buscar conversas:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

async function fetchConversationsData(companyId: string, limit: number = 50, offset: number = 0) {
        
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

        // Subquery para contar conversas ativas por contato
        const activeConversationsCountSubquery = db
            .select({
                contactId: conversations.contactId,
                count: sql<number>`COUNT(*)`.as('active_count')
            })
            .from(conversations)
            .where(
                and(
                    eq(conversations.companyId, companyId),
                    sql`${conversations.archivedAt} IS NULL`
                )
            )
            .groupBy(conversations.contactId)
            .as('active_conv_count_sq');

        const companyConversations = await db.select({
            id: conversations.id,
            status: conversations.status,
            aiActive: conversations.aiActive,
            lastMessageAt: conversations.lastMessageAt,
            contactId: contacts.id,
            contactName: contacts.name,
            contactAvatar: contacts.avatarUrl,
            phone: contacts.phone,
            connectionName: connections.config_name,
            connectionType: connections.connectionType,
            lastMessage: lastMessageSubquery.lastMessageContent,
            lastMessageStatus: lastMessageSubquery.lastMessageStatus,
            contactActiveConversationsCount: activeConversationsCountSubquery.count,
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
        .leftJoin(
            activeConversationsCountSubquery,
            eq(contacts.id, activeConversationsCountSubquery.contactId)
        )
        .where(eq(conversations.companyId, companyId))
        .orderBy(desc(conversations.lastMessageAt))
        .limit(limit)
        .offset(offset);
        
        const [totalCountResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(conversations)
            .where(eq(conversations.companyId, companyId));
        
        const totalCount = totalCountResult?.count || 0;
        
        return {
            data: companyConversations,
            total: totalCount,
            limit,
            offset
        };
}
