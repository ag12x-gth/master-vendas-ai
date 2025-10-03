import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/app/actions';
import { db } from '@/lib/db';
import { vapiCalls, contacts } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql, or, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const contactId = searchParams.get('contactId');

    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(vapiCalls.companyId, session.user.companyId)];

    if (status && status !== 'all') {
      conditions.push(eq(vapiCalls.status, status));
    }

    if (startDate) {
      conditions.push(gte(vapiCalls.startedAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(vapiCalls.startedAt, new Date(endDate)));
    }

    if (search) {
      conditions.push(
        or(
          ilike(vapiCalls.customerName, `%${search}%`),
          ilike(vapiCalls.customerNumber, `%${search}%`)
        )!
      );
    }

    if (contactId) {
      conditions.push(eq(vapiCalls.contactId, contactId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [callsData, totalCountResult] = await Promise.all([
      db
        .select({
          id: vapiCalls.id,
          callId: vapiCalls.vapiCallId,
          contactId: vapiCalls.contactId,
          customerName: vapiCalls.customerName,
          customerNumber: vapiCalls.customerNumber,
          status: vapiCalls.status,
          startedAt: vapiCalls.startedAt,
          endedAt: vapiCalls.endedAt,
          duration: vapiCalls.duration,
          summary: vapiCalls.summary,
          caseResolved: vapiCalls.resolved,
        })
        .from(vapiCalls)
        .where(whereClause)
        .orderBy(desc(vapiCalls.startedAt))
        .limit(limit)
        .offset(offset),
      
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(vapiCalls)
        .where(whereClause)
    ]);

    const totalCount = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      calls: callsData,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching call history:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar histórico de chamadas' },
      { status: 500 }
    );
  }
}
