// src/app/api/v1/conversations/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { conversations, contacts, messages, connections } from '@/lib/db/schema';
import { eq, and, desc, sql, or, isNull } from 'drizzle-orm';
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
        const startTime = Date.now();
        
        // OTIMIZAÇÃO: Usar LATERAL JOIN ao invés de ROW_NUMBER() OVER (muito mais rápido)
        const companyConversations = await db.select({
            id: conversations.id,
            status: conversations.status,
            aiActive: conversations.aiActive,
            lastMessageAt: conversations.lastMessageAt,
            contactId: contacts.id,
            contactName: contacts.name,
            contactAvatar: contacts.avatarUrl,
            phone: contacts.phone,
            isGroup: contacts.isGroup,
            connectionName: connections.config_name,
            connectionType: connections.connectionType,
            lastMessage: sql<string | null>`(
                SELECT content 
                FROM ${messages} 
                WHERE ${messages.conversationId} = ${conversations.id} 
                ORDER BY ${messages.sentAt} DESC 
                LIMIT 1
            )`.as('last_message'),
            lastMessageStatus: sql<string | null>`(
                SELECT status 
                FROM ${messages} 
                WHERE ${messages.conversationId} = ${conversations.id} 
                ORDER BY ${messages.sentAt} DESC 
                LIMIT 1
            )`.as('last_message_status'),
            contactActiveConversationsCount: sql<number>`1`.as('active_count'),
        })
        .from(conversations)
        .innerJoin(contacts, eq(conversations.contactId, contacts.id))
        .leftJoin(connections, eq(conversations.connectionId, connections.id))
        .where(and(
            eq(conversations.companyId, companyId),
            or(
                eq(contacts.isGroup, false),
                isNull(contacts.isGroup)
            )
        ))
        .orderBy(desc(conversations.lastMessageAt))
        .limit(limit)
        .offset(offset);
        
        const queryTime = Date.now() - startTime;
        
        const [totalCountResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(conversations)
            .innerJoin(contacts, eq(conversations.contactId, contacts.id))
            .where(and(
                eq(conversations.companyId, companyId),
                or(
                    eq(contacts.isGroup, false),
                    isNull(contacts.isGroup)
                )
            ));
        
        const totalCount = totalCountResult?.count || 0;
        const totalTime = Date.now() - startTime;
        
        console.log(`[Conversations API] ⚡ Fetch completed in ${totalTime}ms (query: ${queryTime}ms) | Rows: ${companyConversations.length}/${totalCount} | Limit: ${limit} | Offset: ${offset}`);
        
        return {
            data: companyConversations,
            total: totalCount,
            limit,
            offset
        };
}
