import { NextRequest, NextResponse } from 'next/server';
import { db, meetings } from '@/lib/db';
import { meetingBaasService } from '@/services/meeting-baas.service';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { googleMeetUrl, leadId, closerId, scheduledStartTime } = body;

        if (!googleMeetUrl) {
            return NextResponse.json(
                { error: 'Google Meet URL é obrigatório' },
                { status: 400 }
            );
        }

        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/api/v1/meetings/webhook`;

        const botInfo = await meetingBaasService.joinMeeting({
            googleMeetUrl,
            botName: 'Assistente IA Masteria',
            enableTranscription: true,
            webhookUrl,
        });

        const companyId = request.headers.get('x-company-id');
        
        if (!companyId || !closerId) {
            return NextResponse.json(
                { error: 'companyId e closerId são obrigatórios' },
                { status: 400 }
            );
        }

        const [meeting] = await db.insert(meetings).values({
            googleMeetUrl,
            leadId: leadId || null,
            closerId,
            companyId,
            meetingBaasId: botInfo.botId,
            status: 'scheduled',
            scheduledFor: scheduledStartTime ? new Date(scheduledStartTime) : null,
        }).returning();

        return NextResponse.json({
            success: true,
            meeting,
            botInfo,
        });
    } catch (error) {
        console.error('Erro ao criar reunião:', error);
        return NextResponse.json(
            { error: 'Erro ao criar reunião', details: error instanceof Error ? error.message : 'Erro desconhecido' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const closerId = searchParams.get('closerId');
        const leadId = searchParams.get('leadId');

        let query = db.select().from(meetings);

        if (closerId) {
            query = query.where(eq(meetings.closerId, closerId)) as any;
        } else if (leadId) {
            query = query.where(eq(meetings.leadId, leadId)) as any;
        }

        const allMeetings = await query;

        return NextResponse.json({
            success: true,
            meetings: allMeetings,
        });
    } catch (error) {
        console.error('Erro ao buscar reuniões:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar reuniões' },
            { status: 500 }
        );
    }
}
