

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { templates } from '@/lib/db/schema';
import { getCompanyIdFromSession } from '@/app/actions';
import { eq, desc } from 'drizzle-orm';
import { getCachedOrFetch, CacheTTL } from '@/lib/api-cache';

export const dynamic = 'force-dynamic';

// GET /api/v1/templates
export async function GET(_request: NextRequest) {
    try {
        const companyId = await getCompanyIdFromSession();

        // Cache de templates (5 minutos - dados relativamente estáticos)
        const cacheKey = `templates:${companyId}`;
        const companyTemplates = await getCachedOrFetch(cacheKey, async () => {
            return await db
                .select()
                .from(templates)
                .where(eq(templates.companyId, companyId))
                .orderBy(desc(templates.updatedAt));
        }, CacheTTL.LONG);

        return NextResponse.json(companyTemplates);

    } catch (error) {
        console.error('Erro ao buscar templates:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
    }
}
