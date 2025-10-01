

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { campaigns, connections, smsGateways, smsDeliveryReports, templates as templateSchema, whatsappDeliveryReports } from '@/lib/db/schema';
import { eq, and, desc, sql, or, type SQL, count } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';

export const dynamic = 'force-dynamic';

// GET /api/v1/campaigns
export async function GET(request: NextRequest) {
    try {
        const companyId = await getCompanyIdFromSession();
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const channel = searchParams.get('channel'); // Get channel from params
        const connectionId = searchParams.get('connectionId');
        const templateId = searchParams.get('templateId');
        const gatewayId = searchParams.get('gatewayId');
        const offset = (page - 1) * limit;

        // Subqueries for WhatsApp
        const sentWhatsappSubquery = db.select({ value: sql<number>`count(*)::int` }).from(whatsappDeliveryReports).where(eq(whatsappDeliveryReports.campaignId, campaigns.id));
        const deliveredWhatsappSubquery = db.select({ value: sql<number>`count(*)::int` }).from(whatsappDeliveryReports).where(and(eq(whatsappDeliveryReports.campaignId, campaigns.id), or(eq(whatsappDeliveryReports.status, 'delivered'), eq(whatsappDeliveryReports.status, 'read'))));
        const readWhatsappSubquery = db.select({ value: sql<number>`count(*)::int` }).from(whatsappDeliveryReports).where(and(eq(whatsappDeliveryReports.campaignId, campaigns.id), eq(whatsappDeliveryReports.status, 'read')));
        const failedWhatsappSubquery = db.select({ value: sql<number>`count(*)::int` }).from(whatsappDeliveryReports).where(and(eq(whatsappDeliveryReports.campaignId, campaigns.id), eq(whatsappDeliveryReports.status, 'failed')));
        
        // Subqueries for SMS
        const sentSmsSubquery = db.select({ value: sql<number>`count(*)::int` }).from(smsDeliveryReports).where(eq(smsDeliveryReports.campaignId, campaigns.id));
        const failedSmsSubquery = db.select({ value: sql<number>`count(*)::int` }).from(smsDeliveryReports).where(and(eq(smsDeliveryReports.campaignId, campaigns.id), eq(smsDeliveryReports.status, 'FAILED')));
            
        const whereClauses: (SQL | undefined)[] = [
            eq(campaigns.companyId, companyId),
        ];

        if (channel === 'WHATSAPP' || channel === 'SMS') {
            whereClauses.push(eq(campaigns.channel, channel));
        }

        if (connectionId) {
            whereClauses.push(eq(campaigns.connectionId, connectionId));
        }
        if (templateId) {
            whereClauses.push(eq(campaigns.templateId, templateId));
        }
        if (gatewayId) {
            whereClauses.push(eq(campaigns.smsGatewayId, gatewayId));
        }

        const finalWhereClauses = and(...whereClauses.filter((c): c is SQL => !!c));

        const companyCampaignsQuery = db
            .select({
                id: campaigns.id,
                name: campaigns.name,
                channel: campaigns.channel,
                status: campaigns.status,
                scheduledAt: campaigns.scheduledAt,
                sentAt: campaigns.sentAt,
                sent: sql<number>`COALESCE((CASE WHEN ${campaigns.channel} = 'WHATSAPP' THEN (${sentWhatsappSubquery}) ELSE (${sentSmsSubquery}) END), 0)`.as('sent'),
                delivered: sql<number>`COALESCE((${deliveredWhatsappSubquery}), 0)`.as('delivered'),
                read: sql<number>`COALESCE((${readWhatsappSubquery}), 0)`.as('read'),
                failed: sql<number>`COALESCE((CASE WHEN ${campaigns.channel} = 'WHATSAPP' THEN (${failedWhatsappSubquery}) ELSE (${failedSmsSubquery}) END), 0)`.as('failed'),
                progress: sql<number>`COALESCE(0, 0)`.as('progress'), // Placeholder
                connectionId: campaigns.connectionId,
                smsGatewayId: campaigns.smsGatewayId,
                templateId: campaigns.templateId,
                message: campaigns.message,
                connectionName: connections.config_name,
                smsGatewayName: smsGateways.name,
                templateName: templateSchema.name,
            })
            .from(campaigns)
            .leftJoin(connections, eq(campaigns.connectionId, connections.id))
            .leftJoin(smsGateways, eq(campaigns.smsGatewayId, smsGateways.id))
            .leftJoin(templateSchema, eq(campaigns.templateId, templateSchema.id))
            .where(finalWhereClauses)
            .orderBy(desc(campaigns.createdAt));

        const totalCampaignsResult = await db.select({ count: count() }).from(campaigns).where(finalWhereClauses);
        const totalCampaigns = totalCampaignsResult[0]?.count ?? 0;
        const totalPages = Math.ceil(totalCampaigns / limit);
        
        const paginatedCampaigns = await companyCampaignsQuery.limit(limit).offset(offset);

        return NextResponse.json({
            data: paginatedCampaigns,
            totalPages,
        });

    } catch (error) {
        console.error('Erro ao buscar campanhas:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
    }
}
