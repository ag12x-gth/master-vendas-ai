import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vapiCalls } from '@/lib/db/schema';
import { sql, and, gte, lte, desc } from 'drizzle-orm';
import { getCachedOrFetch, CacheTTL } from '@/lib/api-cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Cache com base nas datas
    const cacheKey = `vapi-metrics:${startDate || 'all'}:${endDate || 'all'}`;
    const data = await getCachedOrFetch(cacheKey, async () => {
      return await fetchVapiMetrics(startDate, endDate);
    }, CacheTTL.SHORT);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching Vapi metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics', details: error.message },
      { status: 500 }
    );
  }
}

async function fetchVapiMetrics(startDate: string | null, endDate: string | null) {

    const filters = [];
    if (startDate) {
      filters.push(gte(vapiCalls.createdAt, new Date(startDate)));
    }
    if (endDate) {
      filters.push(lte(vapiCalls.createdAt, new Date(endDate)));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const summaryResults = await db
      .select({
        totalCalls: sql<number>`count(*)::int`,
        completedCalls: sql<number>`count(*) filter (where status = 'completed')::int`,
        inProgressCalls: sql<number>`count(*) filter (where status = 'in-progress')::int`,
        failedCalls: sql<number>`count(*) filter (where status = 'failed')::int`,
        resolvedCases: sql<number>`count(*) filter (where resolved = true)::int`,
        avgDuration: sql<number>`coalesce(round(avg(duration) filter (where duration is not null and duration > 0)), 0)::int`,
        totalDuration: sql<number>`coalesce(sum(duration) filter (where duration is not null and duration > 0), 0)::int`,
      })
      .from(vapiCalls)
      .where(whereClause);

    const summaryResult = summaryResults[0] || {
      totalCalls: 0,
      completedCalls: 0,
      inProgressCalls: 0,
      failedCalls: 0,
      resolvedCases: 0,
      avgDuration: 0,
      totalDuration: 0,
    };

    const successRate = summaryResult.totalCalls > 0
      ? Math.round((summaryResult.completedCalls / summaryResult.totalCalls) * 100)
      : 0;

    const callsByDayResult = await db
      .select({
        date: sql<string>`date(created_at)`,
        count: sql<number>`count(*)::int`,
      })
      .from(vapiCalls)
      .where(whereClause)
      .groupBy(sql`date(created_at)`)
      .orderBy(sql`date(created_at) desc`);

    const callsByDay: Record<string, number> = {};
    callsByDayResult.forEach(row => {
      if (row.date) {
        callsByDay[row.date] = row.count;
      }
    });

    const recentCallsResult = await db
      .select()
      .from(vapiCalls)
      .where(whereClause)
      .orderBy(desc(vapiCalls.createdAt))
      .limit(10);

    const recentCalls = recentCallsResult.map(call => ({
      id: call.id,
      vapiCallId: call.vapiCallId,
      customerName: call.customerName,
      customerNumber: call.customerNumber,
      status: call.status,
      duration: call.duration,
      summary: call.summary,
      resolved: call.resolved,
      startedAt: call.startedAt,
      endedAt: call.endedAt,
      createdAt: call.createdAt,
    }));

    return {
      summary: {
        ...summaryResult,
        successRate,
      },
      callsByDay,
      recentCalls,
    };
}
