// src/app/api/v1/conversations/status/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations } from '@/lib/db/schema';
import { eq, max } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';

export const dynamic = 'force-dynamic';

// GET /api/v1/conversations/status
// Retorna o timestamp da última mensagem de uma empresa para verificação de atualizações.
export async function GET() {
    try {
        const companyId = await getCompanyIdFromSession();
        
        const [result] = await db
            .select({
                lastUpdated: max(conversations.lastMessageAt)
            })
            .from(conversations)
            .where(eq(conversations.companyId, companyId));

        return NextResponse.json({ lastUpdated: result?.lastUpdated || null });

    } catch (error) {
        // Não loga erros de sessão como erros críticos no servidor
        if (error instanceof Error && error.message.includes("Não autorizado")) {
             return NextResponse.json({ error: error.message }, { status: 401 });
        }
        console.error('Erro ao buscar status das conversas:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
