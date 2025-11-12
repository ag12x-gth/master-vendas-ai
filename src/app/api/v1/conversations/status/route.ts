// src/app/api/v1/conversations/status/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';
import { getCachedOrFetch, CacheTTL } from '@/lib/api-cache';

export const dynamic = 'force-dynamic';

// GET /api/v1/conversations/status
// Retorna o timestamp da última mensagem de uma empresa para verificação de atualizações.
export async function GET() {
    try {
        const startTime = Date.now();
        const companyId = await getCompanyIdFromSession();
        
        const cacheKey = `conversations:status:${companyId}`;
        const result = await getCachedOrFetch(cacheKey, async () => {
            const queryStart = Date.now();
            
            // OTIMIZAÇÃO: Usar ORDER BY + LIMIT 1 ao invés de MAX (muito mais rápido com índices)
            const [latest] = await db
                .select({
                    lastUpdated: conversations.lastMessageAt
                })
                .from(conversations)
                .where(eq(conversations.companyId, companyId))
                .orderBy(desc(conversations.lastMessageAt))
                .limit(1);
            
            const queryTime = Date.now() - queryStart;
            console.log(`[Conversations Status] ⚡ Query executed in ${queryTime}ms`);
            
            return { lastUpdated: latest?.lastUpdated || null };
        }, CacheTTL.REAL_TIME);
        
        const totalTime = Date.now() - startTime;
        console.log(`[Conversations Status] ⚡ Total response time: ${totalTime}ms (cached: ${totalTime < 10})`);

        return NextResponse.json(result);

    } catch (error) {
        // Não loga erros de sessão como erros críticos no servidor
        if (error instanceof Error && error.message.includes("Não autorizado")) {
             return NextResponse.json({ error: error.message }, { status: 401 });
        }
        console.error('Erro ao buscar status das conversas:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
