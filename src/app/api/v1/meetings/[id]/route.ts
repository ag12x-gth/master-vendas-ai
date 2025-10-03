import { NextRequest, NextResponse } from 'next/server';
import { db, meetings, meetingInsights } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { aiAnalysisService } from '@/services/ai-analysis.service';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const meetingId = params.id;

        const [meeting] = await db
            .select()
            .from(meetings)
            .where(eq(meetings.id, meetingId));

        if (!meeting) {
            return NextResponse.json(
                { error: 'Reunião não encontrada' },
                { status: 404 }
            );
        }

        const [insights] = await db
            .select()
            .from(meetingInsights)
            .where(eq(meetingInsights.meetingId, meetingId));

        return NextResponse.json({
            success: true,
            meeting,
            insights: insights || null,
        });
    } catch (error) {
        console.error('Erro ao buscar reunião:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar reunião' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const meetingId = params.id;
        const body = await request.json();
        const { status } = body;

        if (status === 'completed') {
            await aiAnalysisService.generateMeetingInsights(meetingId);
        }

        const [updatedMeeting] = await db
            .update(meetings)
            .set({
                status,
                ...(status === 'in_progress' && { actualStartTime: new Date() }),
                ...(status === 'completed' && { actualEndTime: new Date() }),
            })
            .where(eq(meetings.id, meetingId))
            .returning();

        return NextResponse.json({
            success: true,
            meeting: updatedMeeting,
        });
    } catch (error) {
        console.error('Erro ao atualizar reunião:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar reunião' },
            { status: 500 }
        );
    }
}
