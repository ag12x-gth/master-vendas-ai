// src/app/api/v1/campaigns/[campaignId]/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { campaigns, connections, smsGateways, smsDeliveryReports, templates as templateSchema, whatsappDeliveryReports } from '@/lib/db/schema';
import { eq, and, sql, or } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';

export const dynamic = 'force-dynamic';

// GET /api/v1/campaigns/[campaignId]
export async function GET(request: NextRequest, { params }: { params: { campaignId: string } }) {
    try {
        const companyId = await getCompanyIdFromSession();
        const { campaignId } = params;

        // Subqueries for WhatsApp
        const sentWhatsappSubquery = db.select({ value: sql<number>`count(*)::int` }).from(whatsappDeliveryReports).where(eq(whatsappDeliveryReports.campaignId, campaignId));
        const deliveredWhatsappSubquery = db.select({ value: sql<number>`count(*)::int` }).from(whatsappDeliveryReports).where(and(eq(whatsappDeliveryReports.campaignId, campaignId), or(eq(whatsappDeliveryReports.status, 'delivered'), eq(whatsappDeliveryReports.status, 'read'))));
        const readWhatsappSubquery = db.select({ value: sql<number>`count(*)::int` }).from(whatsappDeliveryReports).where(and(eq(whatsappDeliveryReports.campaignId, campaignId), eq(whatsappDeliveryReports.status, 'read')));
        const failedWhatsappSubquery = db.select({ value: sql<number>`count(*)::int` }).from(whatsappDeliveryReports).where(and(eq(whatsappDeliveryReports.campaignId, campaignId), eq(whatsappDeliveryReports.status, 'failed')));
        
        // Subqueries for SMS
        const sentSmsSubquery = db.select({ value: sql<number>`count(*)::int` }).from(smsDeliveryReports).where(eq(smsDeliveryReports.campaignId, campaignId));
        const failedSmsSubquery = db.select({ value: sql<number>`count(*)::int` }).from(smsDeliveryReports).where(and(eq(smsDeliveryReports.campaignId, campaignId), eq(smsDeliveryReports.status, 'FAILED')));
            
        const results = await db
            .select({
                id: campaigns.id,
                name: campaigns.name,
                channel: campaigns.channel,
                status: campaigns.status,
                scheduledAt: campaigns.scheduledAt,
                sentAt: campaigns.sentAt,
                sent: sql<number>`CASE WHEN ${campaigns.channel} = 'WHATSAPP' THEN (${sentWhatsappSubquery}) ELSE (${sentSmsSubquery}) END`.as('sent'),
                delivered: sql<number>`COALESCE((${deliveredWhatsappSubquery}), 0)`.as('delivered'), // SMS has no delivered status from webhook
                read: sql<number>`COALESCE((${readWhatsappSubquery}), 0)`.as('read'), // SMS has no read status
                failed: sql<number>`CASE WHEN ${campaigns.channel} = 'WHATSAPP' THEN (${failedWhatsappSubquery}) ELSE (${failedSmsSubquery}) END`.as('failed'),
                connectionId: campaigns.connectionId,
                smsGatewayId: campaigns.smsGatewayId,
                templateId: campaigns.templateId,
                message: campaigns.message,
                contactListIds: campaigns.contactListIds,
                connectionName: connections.config_name,
                smsGatewayName: smsGateways.name,
                templateName: templateSchema.name,
                templateBody: templateSchema.body,
                templateHeaderType: templateSchema.headerType,
            })
            .from(campaigns)
            .leftJoin(connections, eq(campaigns.connectionId, connections.id))
            .leftJoin(smsGateways, eq(campaigns.smsGatewayId, smsGateways.id))
            .leftJoin(templateSchema, eq(campaigns.templateId, templateSchema.id))
            .where(and(eq(campaigns.id, campaignId), eq(campaigns.companyId, companyId)))
            .limit(1);

        if (results.length === 0) {
            return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
        }

        return NextResponse.json(results[0]);

    } catch (error) {
        console.error(`Erro ao buscar campanha ${params.campaignId}:`, error);
        return NextResponse.json({ error: (error as Error).message, details: (error as Error).stack }, { status: 500 });
    }
}


// DELETE /api/v1/campaigns/[campaignId]
export async function DELETE(request: NextRequest, { params }: { params: { campaignId: string } }) {
    try {
        const companyId = await getCompanyIdFromSession();
        const { campaignId } = params;

        const result = await db.delete(campaigns)
            .where(and(eq(campaigns.id, campaignId), eq(campaigns.companyId, companyId)))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ error: 'Campanha não encontrada ou não pertence à sua empresa.' }, { status: 404 });
        }
        
        return new NextResponse(null, { status: 204 }); // No Content

    } catch (error) {
        console.error('Erro ao excluir campanha:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
    }
}
