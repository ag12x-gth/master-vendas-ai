import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { metaWebhookHealthEvents, connections } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: { connectionId: string } }
) {
    const { connectionId } = params;

    try {
        const [connection] = await db.select({ id: connections.id })
            .from(connections)
            .where(eq(connections.id, connectionId))
            .limit(1);

        if (!connection) {
            return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
        }

        const recentEvents = await db.select({
            id: metaWebhookHealthEvents.id,
            status: metaWebhookHealthEvents.status,
            validatedAt: metaWebhookHealthEvents.validatedAt,
            errorMessage: metaWebhookHealthEvents.errorMessage,
        })
            .from(metaWebhookHealthEvents)
            .where(eq(metaWebhookHealthEvents.connectionId, connectionId))
            .orderBy(desc(metaWebhookHealthEvents.validatedAt))
            .limit(20);

        if (recentEvents.length === 0) {
            return NextResponse.json({
                status: 'no_data',
                successRate: null,
                lastValidatedAt: null,
                totalEvents: 0,
                successCount: 0,
                failureCount: 0,
            });
        }

        const successCount = recentEvents.filter(e => e.status === 'success').length;
        const failureCount = recentEvents.filter(e => e.status === 'failure').length;
        const totalEvents = recentEvents.length;
        const successRate = Math.round((successCount / totalEvents) * 100);

        let status: 'healthy' | 'warning' | 'error' | 'no_data';
        if (successRate >= 90) {
            status = 'healthy';
        } else if (successRate >= 50) {
            status = 'warning';
        } else {
            status = 'error';
        }

        const lastValidatedAt = recentEvents[0]?.validatedAt || null;
        const lastError = recentEvents.find(e => e.status === 'failure')?.errorMessage || null;

        return NextResponse.json({
            status,
            successRate,
            lastValidatedAt,
            totalEvents,
            successCount,
            failureCount,
            lastError,
        });
    } catch (error) {
        console.error('[Webhook Health] Error fetching health:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
