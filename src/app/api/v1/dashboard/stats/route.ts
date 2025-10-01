// src/app/api/v1/dashboard/stats/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getCompanyIdFromSession } from '@/app/actions';
import { and, count, eq, sql, desc, gte, inArray } from 'drizzle-orm';
import { kanbanLeads, contacts, whatsappDeliveryReports, smsDeliveryReports, conversations, users, kanbanBoards, campaigns } from '@/lib/db/schema';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const companyId = await getCompanyIdFromSession();
        const { searchParams } = new URL(request.url);
        
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        const endDate = endDateParam ? endOfDay(new Date(endDateParam)) : endOfDay(new Date());
        const startDate = startDateParam ? startOfDay(new Date(startDateParam)) : startOfDay(subDays(endDate, 30));

        // Where clause for date range to be reused
        const dateRangeFilter = gte(kanbanLeads.createdAt, startDate);

        const [totalLeadsResult] = await db
            .select({
                value: sql<string>`sum(${kanbanLeads.value})`.mapWith(Number),
            })
            .from(kanbanLeads)
            .innerJoin(kanbanBoards, eq(kanbanLeads.boardId, kanbanBoards.id))
            .where(and(
                eq(kanbanBoards.companyId, companyId),
                dateRangeFilter
            ));
            
        const [totalContactsResult] = await db
            .select({ count: count() })
            .from(contacts)
            .where(and(eq(contacts.companyId, companyId), gte(contacts.createdAt, startDate)));

        const [pendingConversationsResult] = await db
            .select({ count: count() })
            .from(conversations)
            .where(and(
                eq(conversations.companyId, companyId), 
                eq(conversations.status, 'NEW'),
                gte(conversations.createdAt, startDate)
            ));
        
        // CORREÇÃO: Utilizar subquery para garantir a passagem correta dos parâmetros
        const companyCampaignsSubquery = db
            .select({ id: campaigns.id })
            .from(campaigns)
            .where(eq(campaigns.companyId, companyId));

        const [totalWhatsappSentResult] = await db.select({ count: count() }).from(whatsappDeliveryReports).where(and(inArray(whatsappDeliveryReports.campaignId, companyCampaignsSubquery), gte(whatsappDeliveryReports.sentAt, startDate)));
        const [totalSmsSentResult] = await db.select({ count: count() }).from(smsDeliveryReports).where(and(inArray(smsDeliveryReports.campaignId, companyCampaignsSubquery), gte(smsDeliveryReports.sentAt, startDate)));

        const agentPerformance = await db.select({
            id: users.id,
            name: users.name,
            avatarUrl: users.avatarUrl,
            resolved: sql<number>`count(${conversations.id})::int`,
        })
        .from(users)
        .leftJoin(conversations, and(
            eq(conversations.assignedTo, users.id),
            eq(conversations.status, 'RESOLVED'),
            eq(conversations.companyId, companyId),
            gte(conversations.updatedAt, startDate)
        ))
        .where(and(
            eq(users.companyId, companyId),
            eq(users.role, 'atendente')
        ))
        .groupBy(users.id, users.name, users.avatarUrl)
        .orderBy(desc(sql<number>`count(${conversations.id})::int`));

            
        const stats = {
            totalLeadValue: totalLeadsResult?.value || 0,
            totalContacts: totalContactsResult?.count || 0,
            totalMessagesSent: (totalWhatsappSentResult?.count || 0) + (totalSmsSentResult?.count || 0),
            pendingConversations: pendingConversationsResult?.count || 0,
            agentPerformance,
        };

        return NextResponse.json(stats);

    } catch (error) {
        console.error("Erro ao buscar estatísticas do dashboard:", error);
        return NextResponse.json({ error: (error as Error).message, details: (error as Error).stack }, { status: 500 });
    }
}
