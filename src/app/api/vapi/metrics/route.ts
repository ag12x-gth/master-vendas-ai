import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vapiCalls, vapiTranscripts } from '@/lib/db/schema';
import { sql, and, gte, lte, eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filters = [];
    if (startDate) {
      filters.push(gte(vapiCalls.createdAt, new Date(startDate)));
    }
    if (endDate) {
      filters.push(lte(vapiCalls.createdAt, new Date(endDate)));
    }

    const allCalls = await db
      .select()
      .from(vapiCalls)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(vapiCalls.createdAt))
      .limit(100);

    const totalCalls = allCalls.length;
    const completedCalls = allCalls.filter(c => c.status === 'completed').length;
    const inProgressCalls = allCalls.filter(c => c.status === 'in-progress').length;
    const failedCalls = allCalls.filter(c => c.status === 'failed').length;
    const resolvedCases = allCalls.filter(c => c.resolved === true).length;

    const durations = allCalls
      .filter(c => c.duration !== null && c.duration > 0)
      .map(c => c.duration!);
    
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    const totalDuration = durations.reduce((a, b) => a + b, 0);

    const successRate = totalCalls > 0 
      ? Math.round((completedCalls / totalCalls) * 100) 
      : 0;

    const callsByDay: Record<string, number> = {};
    allCalls.forEach(call => {
      if (call.createdAt) {
        const dateStr = call.createdAt.toISOString().split('T')[0];
        if (dateStr) {
          callsByDay[dateStr] = (callsByDay[dateStr] || 0) + 1;
        }
      }
    });

    const recentCalls = allCalls.slice(0, 10).map(call => ({
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

    return NextResponse.json({
      summary: {
        totalCalls,
        completedCalls,
        inProgressCalls,
        failedCalls,
        resolvedCases,
        avgDuration,
        totalDuration,
        successRate,
      },
      callsByDay,
      recentCalls,
    });

  } catch (error: any) {
    console.error('Error fetching Vapi metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics', details: error.message },
      { status: 500 }
    );
  }
}
