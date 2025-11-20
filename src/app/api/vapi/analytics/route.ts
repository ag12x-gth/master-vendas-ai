import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vapiCalls } from '@/lib/db/schema';
import { sql, and, gte, lte } from 'drizzle-orm';
import { getCachedOrFetch, CacheTTL } from '@/lib/api-cache';
import { getCompanyIdFromSession } from '@/app/actions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyIdFromSession();
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const cacheKey = `vapi-analytics:${companyId}:${startDate || 'all'}:${endDate || 'all'}`;
    const data = await getCachedOrFetch(cacheKey, async () => {
      return await fetchVapiAnalytics(companyId, startDate, endDate);
    }, CacheTTL.SHORT);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching Vapi analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error.message },
      { status: 500 }
    );
  }
}

async function fetchVapiAnalytics(
  companyId: string,
  startDate: string | null,
  endDate: string | null
) {
  const filters = [sql`${vapiCalls.companyId} = ${companyId}`];
  
  if (startDate) {
    filters.push(gte(vapiCalls.createdAt, new Date(startDate)));
  }
  if (endDate) {
    filters.push(lte(vapiCalls.createdAt, new Date(endDate)));
  }

  const whereClause = and(...filters);

  // 1. Chamadas por hora do dia (agregado)
  const callsByHour = await db
    .select({
      hour: sql<number>`extract(hour from started_at)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(vapiCalls)
    .where(whereClause)
    .groupBy(sql`extract(hour from started_at)`)
    .orderBy(sql`extract(hour from started_at)`);

  // 2. Duração média e contagem por dia (últimos 30 dias)
  const dailyStats = await db
    .select({
      date: sql<string>`date(created_at)`,
      totalCalls: sql<number>`count(*)::int`,
      avgDuration: sql<number>`coalesce(round(avg(duration) filter (where duration is not null)), 0)::int`,
      completedCalls: sql<number>`count(*) filter (where status = 'completed')::int`,
      resolvedCalls: sql<number>`count(*) filter (where resolved = true)::int`,
    })
    .from(vapiCalls)
    .where(whereClause)
    .groupBy(sql`date(created_at)`)
    .orderBy(sql`date(created_at) desc`)
    .limit(30);

  // 3. Distribuição de status
  const statusDistribution = await db
    .select({
      status: vapiCalls.status,
      count: sql<number>`count(*)::int`,
    })
    .from(vapiCalls)
    .where(whereClause)
    .groupBy(vapiCalls.status);

  // 4. Taxa de sucesso por dia (últimos 14 dias)
  const successRateTrend = await db
    .select({
      date: sql<string>`date(created_at)`,
      totalCalls: sql<number>`count(*)::int`,
      completedCalls: sql<number>`count(*) filter (where status = 'completed')::int`,
      successRate: sql<number>`round((count(*) filter (where status = 'completed')::float / nullif(count(*)::float, 0)) * 100)::int`,
    })
    .from(vapiCalls)
    .where(whereClause)
    .groupBy(sql`date(created_at)`)
    .orderBy(sql`date(created_at) desc`)
    .limit(14);

  // 5. Duração média por status
  const durationByStatus = await db
    .select({
      status: vapiCalls.status,
      avgDuration: sql<number>`coalesce(round(avg(duration) filter (where duration is not null)), 0)::int`,
      count: sql<number>`count(*) filter (where duration is not null)::int`,
    })
    .from(vapiCalls)
    .where(whereClause)
    .groupBy(vapiCalls.status);

  // 6. KPIs gerais
  const kpis = await db
    .select({
      totalCalls: sql<number>`count(*)::int`,
      totalMinutes: sql<number>`coalesce(round(sum(duration) / 60.0), 0)::int`,
      avgDuration: sql<number>`coalesce(round(avg(duration) filter (where duration is not null)), 0)::int`,
      completionRate: sql<number>`round((count(*) filter (where status = 'completed')::float / nullif(count(*)::float, 0)) * 100)::int`,
      resolutionRate: sql<number>`round((count(*) filter (where resolved = true)::float / nullif(count(*)::float, 0)) * 100)::int`,
    })
    .from(vapiCalls)
    .where(whereClause);

  return {
    kpis: kpis[0] || {
      totalCalls: 0,
      totalMinutes: 0,
      avgDuration: 0,
      completionRate: 0,
      resolutionRate: 0,
    },
    callsByHour: callsByHour.map(row => ({
      hour: row.hour || 0,
      calls: row.count,
    })),
    dailyStats: dailyStats.map(row => ({
      date: row.date,
      totalCalls: row.totalCalls,
      avgDuration: row.avgDuration,
      completedCalls: row.completedCalls,
      resolvedCalls: row.resolvedCalls,
      completionRate: row.totalCalls > 0 ? Math.round((row.completedCalls / row.totalCalls) * 100) : 0,
    })),
    statusDistribution: statusDistribution.map(row => ({
      status: row.status,
      count: row.count,
    })),
    successRateTrend: successRateTrend.map(row => ({
      date: row.date,
      totalCalls: row.totalCalls,
      completedCalls: row.completedCalls,
      successRate: row.successRate || 0,
    })),
    durationByStatus: durationByStatus.map(row => ({
      status: row.status,
      avgDuration: row.avgDuration,
      count: row.count,
    })),
  };
}
