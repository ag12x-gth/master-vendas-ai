import { NextRequest, NextResponse } from 'next/server';
import { db, meetingAnalysisRealtime } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const meetingId = params.id;

        const transcripts = await db
            .select()
            .from(meetingAnalysisRealtime)
            .where(eq(meetingAnalysisRealtime.meetingId, meetingId))
            .orderBy(asc(meetingAnalysisRealtime.timestamp));

        return NextResponse.json({
            success: true,
            transcripts,
        });
    } catch (error) {
        console.error('Erro ao buscar transcrições:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao buscar transcrições' },
            { status: 500 }
        );
    }
}
