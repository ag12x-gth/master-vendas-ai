import { GoogleGenerativeAI } from '@google/generative-ai';
import { db, meetingAnalysisRealtime, meetingInsights } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

const AI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!AI_API_KEY) {
    console.warn('GEMINI_API_KEY não configurada, usando análise simplificada');
}

const genAI = AI_API_KEY ? new GoogleGenerativeAI(AI_API_KEY) : null;

export interface MeetingInsightData {
    summaryText: string;
    keyPoints: string[];
    painPoints: string[];
    interests: string[];
    objections: string[];
    leadScore: number;
    recommendedProposal: string;
    nextSteps: string[];
    overallSentiment: string;
    engagementLevel: string;
    emotionSummary: any;
    talkTimeRatio: any;
}

export class AIAnalysisService {
    async generateMeetingInsights(meetingId: string): Promise<MeetingInsightData> {
        const analysisData = await db
            .select()
            .from(meetingAnalysisRealtime)
            .where(eq(meetingAnalysisRealtime.meetingId, meetingId))
            .orderBy(desc(meetingAnalysisRealtime.timestamp));

        if (analysisData.length === 0) {
            throw new Error('Nenhum dado de análise encontrado para esta reunião');
        }

        const transcriptText = analysisData
            .filter(a => a.transcript)
            .map(a => `${a.speaker || 'Participante'}: ${a.transcript}`)
            .join('\n');

        const sentiments = analysisData
            .filter(a => a.sentiment)
            .map(a => a.sentiment);

        const positiveCount = sentiments.filter(s => s === 'positive').length;
        const negativeCount = sentiments.filter(s => s === 'negative').length;
        const neutralCount = sentiments.filter(s => s === 'neutral').length;

        let overallSentiment = 'neutral';
        if (positiveCount > negativeCount && positiveCount > neutralCount) {
            overallSentiment = 'positive';
        } else if (negativeCount > positiveCount) {
            overallSentiment = 'negative';
        }

        let insights: MeetingInsightData;

        if (genAI) {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            
            const prompt = `Analise a seguinte transcrição de reunião de vendas e forneça insights estruturados:

TRANSCRIÇÃO:
${transcriptText}

Forneça a análise no seguinte formato JSON:
{
    "summaryText": "Resumo da reunião em 2-3 frases",
    "keyPoints": ["ponto 1", "ponto 2", "ponto 3"],
    "painPoints": ["dor 1", "dor 2"],
    "interests": ["interesse 1", "interesse 2"],
    "objections": ["objeção 1", "objeção 2"],
    "leadScore": 75,
    "recommendedProposal": "Proposta específica baseada na conversa",
    "nextSteps": ["próximo passo 1", "próximo passo 2"],
    "engagementLevel": "high/medium/low"
}`;

            const result = await model.generateContent(prompt);
            const response = result.response.text();
            
            try {
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const aiInsights = JSON.parse(jsonMatch[0]);
                    insights = {
                        ...aiInsights,
                        overallSentiment,
                        emotionSummary: this.summarizeEmotions(analysisData),
                        talkTimeRatio: this.calculateTalkTime(analysisData),
                    };
                } else {
                    throw new Error('Formato de resposta inválido');
                }
            } catch (parseError) {
                console.error('Erro ao parsear resposta da IA:', parseError);
                insights = this.getFallbackInsights(transcriptText, overallSentiment, analysisData);
            }
        } else {
            insights = this.getFallbackInsights(transcriptText, overallSentiment, analysisData);
        }

        await db.insert(meetingInsights).values({
            meetingId,
            summaryText: insights.summaryText,
            keyPoints: insights.keyPoints,
            painPoints: insights.painPoints,
            interests: insights.interests,
            objections: insights.objections,
            leadScore: insights.leadScore,
            recommendedProposal: insights.recommendedProposal,
            nextSteps: insights.nextSteps,
            overallSentiment: insights.overallSentiment,
            engagementLevel: insights.engagementLevel,
            emotionSummary: insights.emotionSummary,
            talkTimeRatio: insights.talkTimeRatio,
        }).onConflictDoUpdate({
            target: meetingInsights.meetingId,
            set: {
                summaryText: insights.summaryText,
                keyPoints: insights.keyPoints,
                painPoints: insights.painPoints,
                interests: insights.interests,
                objections: insights.objections,
                leadScore: insights.leadScore,
                recommendedProposal: insights.recommendedProposal,
                nextSteps: insights.nextSteps,
                overallSentiment: insights.overallSentiment,
                engagementLevel: insights.engagementLevel,
                emotionSummary: insights.emotionSummary,
                talkTimeRatio: insights.talkTimeRatio,
            },
        });

        return insights;
    }

    private getFallbackInsights(transcript: string, overallSentiment: string, analysisData: any[]): MeetingInsightData {
        return {
            summaryText: 'Reunião realizada com análise de sentimento e engajamento.',
            keyPoints: ['Pontos principais discutidos durante a reunião'],
            painPoints: ['Dores identificadas na conversa'],
            interests: ['Interesses demonstrados pelo lead'],
            objections: ['Possíveis objeções levantadas'],
            leadScore: overallSentiment === 'positive' ? 75 : overallSentiment === 'negative' ? 40 : 55,
            recommendedProposal: 'Proposta personalizada baseada na conversa',
            nextSteps: ['Enviar proposta', 'Agendar follow-up'],
            overallSentiment,
            engagementLevel: analysisData.length > 10 ? 'high' : analysisData.length > 5 ? 'medium' : 'low',
            emotionSummary: this.summarizeEmotions(analysisData),
            talkTimeRatio: this.calculateTalkTime(analysisData),
        };
    }

    private summarizeEmotions(analysisData: any[]): any {
        const emotions: Record<string, number> = {};
        
        analysisData.forEach(data => {
            if (data.emotions && Array.isArray(data.emotions)) {
                data.emotions.forEach((emotion: any) => {
                    if (!emotions[emotion.name]) {
                        emotions[emotion.name] = 0;
                    }
                    emotions[emotion.name] += emotion.score;
                });
            }
        });

        return emotions;
    }

    private calculateTalkTime(analysisData: any[]): any {
        const speakerTime: Record<string, number> = {};
        
        analysisData.forEach(data => {
            const speaker = data.speaker || 'Unknown';
            if (!speakerTime[speaker]) {
                speakerTime[speaker] = 0;
            }
            speakerTime[speaker] += 1;
        });

        return speakerTime;
    }
}

export const aiAnalysisService = new AIAnalysisService();
