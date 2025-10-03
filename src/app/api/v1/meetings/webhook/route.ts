import { NextRequest, NextResponse } from 'next/server';
import { db, meetings, meetingAnalysisRealtime } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { humeEmotionService } from '@/services/hume-emotion.service';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        console.log('Webhook recebido do Meeting BaaS:', JSON.stringify(body, null, 2));

        // Meeting BaaS envia bot_id dentro de data.bot_id
        const { event, data } = body;
        const bot_id = data?.bot_id || body.bot_id;

        if (!bot_id) {
            console.warn('Webhook sem bot_id:', body);
            return NextResponse.json({ received: true });
        }

        const [meeting] = await db
            .select()
            .from(meetings)
            .where(eq(meetings.meetingBaasId, bot_id));

        if (!meeting) {
            console.warn(`Reunião não encontrada para bot_id: ${bot_id}`);
            return NextResponse.json({ received: true });
        }

        const io = (global as any).io;

        switch (event) {
            case 'bot.joined':
                await db
                    .update(meetings)
                    .set({ 
                        status: 'in_progress',
                        botJoinedAt: new Date(),
                    })
                    .where(eq(meetings.id, meeting.id));
                break;

            case 'bot.left':
            case 'bot.stopped':
                await db
                    .update(meetings)
                    .set({ 
                        status: 'completed',
                        botLeftAt: new Date(),
                    })
                    .where(eq(meetings.id, meeting.id));
                break;

            case 'transcript.partial':
            case 'transcript.final':
                if (data?.text) {
                    const sentimentAnalysis = await humeEmotionService.analyzeTranscriptSentiment(data.text);
                    
                    await db.insert(meetingAnalysisRealtime).values({
                        meetingId: meeting.id,
                        timestamp: new Date(),
                        transcript: data.text,
                        speaker: data.speaker || 'Unknown',
                        sentiment: sentimentAnalysis.sentiment,
                        sentimentScore: String(sentimentAnalysis.score),
                        emotions: [],
                    });

                    if (io) {
                        io.to(`meeting:${meeting.id}`).emit('transcript_update', {
                            meetingId: meeting.id,
                            transcript: data.text,
                            speaker: data.speaker,
                            sentiment: sentimentAnalysis.sentiment,
                            sentimentScore: sentimentAnalysis.score,
                            timestamp: new Date().toISOString(),
                        });
                    }
                }
                break;

            case 'video.frame':
                if (data?.frame_url) {
                    const emotionAnalysis = await humeEmotionService.analyzeVideoFrame(data.frame_url);
                    
                    if (io) {
                        io.to(`meeting:${meeting.id}`).emit('emotion_update', {
                            meetingId: meeting.id,
                            emotions: emotionAnalysis.emotions,
                            dominantEmotion: emotionAnalysis.dominantEmotion,
                            timestamp: new Date().toISOString(),
                        });
                    }
                }
                break;

            default:
                console.log(`Evento não tratado: ${event}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Erro ao processar webhook:', error);
        return NextResponse.json(
            { error: 'Erro ao processar webhook' },
            { status: 500 }
        );
    }
}
