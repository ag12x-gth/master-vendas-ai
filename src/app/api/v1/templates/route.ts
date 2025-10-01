

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { templates } from '@/lib/db/schema';
import { getCompanyIdFromSession } from '@/app/actions';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET /api/v1/templates
export async function GET(_request: NextRequest) {
    try {
        const companyId = await getCompanyIdFromSession();

        const companyTemplates = await db
            .select()
            .from(templates)
            .where(eq(templates.companyId, companyId))
            .orderBy(desc(templates.updatedAt));

        return NextResponse.json(companyTemplates);

    } catch (error) {
        console.error('Erro ao buscar templates:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
    }
}
