// src/app/api/v1/integrations/logs/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getCompanyIdFromSession } from '@/app/actions';
import { db } from '@/lib/db';
import { crmSyncLogs, crmIntegrations } from '@/lib/db/schema';
import { and, eq, desc, type SQL } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const companyId = await getCompanyIdFromSession();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const whereConditions: (SQL | undefined)[] = [
            eq(crmIntegrations.companyId, companyId)
        ];

        if (status) {
            whereConditions.push(eq(crmSyncLogs.status, status as any));
        }

        const logs = await db
            .select({
                id: crmSyncLogs.id,
                type: crmSyncLogs.type,
                status: crmSyncLogs.status,
                error: crmSyncLogs.error,
                createdAt: crmSyncLogs.createdAt,
            })
            .from(crmSyncLogs)
            .innerJoin(crmIntegrations, eq(crmSyncLogs.integrationId, crmIntegrations.id))
            .where(and(...whereConditions.filter((c): c is SQL => !!c)))
            .orderBy(desc(crmSyncLogs.createdAt))
            .limit(10);
        
        return NextResponse.json(logs);

    } catch (error) {
        console.error('Erro ao buscar logs de integração:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
