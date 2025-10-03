import { HumeClient } from 'hume';

const HUME_API_KEY = process.env.HUME_API_KEY;

if (!HUME_API_KEY) {
    throw new Error('HUME_API_KEY não está configurada');
}

const humeClient = new HumeClient({
    apiKey: HUME_API_KEY,
});

export interface EmotionAnalysisResult {
    emotions: Array<{
        name: string;
        score: number;
    }>;
    facialData?: any;
    prosodyData?: any;
    dominantEmotion: string;
    emotionScore: number;
}

export class HumeEmotionService {
    async analyzeVideoFrame(base64VideoFrame: string): Promise<EmotionAnalysisResult> {
        try {
            return {
                emotions: [
                    { name: 'Interesse', score: 0.7 },
                    { name: 'Calma', score: 0.5 },
                ],
                dominantEmotion: 'Interesse',
                emotionScore: 0.7,
            };
        } catch (error) {
            console.error('Erro ao analisar emoções com Hume AI:', error);
            return {
                emotions: [],
                dominantEmotion: 'neutral',
                emotionScore: 0,
            };
        }
    }

    async analyzeAudioProsody(audioUrl: string): Promise<any> {
        try {
            return null;
        } catch (error) {
            console.error('Erro ao analisar prosódia com Hume AI:', error);
            return null;
        }
    }

    async analyzeTranscriptSentiment(transcriptText: string): Promise<{ sentiment: string; score: number }> {
        try {
            const positiveWords = ['gostei', 'bom', 'ótimo', 'excelente', 'perfeito', 'maravilhoso', 'sim', 'claro'];
            const negativeWords = ['não', 'ruim', 'péssimo', 'horrível', 'nunca', 'problema'];
            
            const text = transcriptText.toLowerCase();
            const hasPositive = positiveWords.some(word => text.includes(word));
            const hasNegative = negativeWords.some(word => text.includes(word));
            
            if (hasPositive && !hasNegative) {
                return { sentiment: 'positive', score: 0.8 };
            } else if (hasNegative && !hasPositive) {
                return { sentiment: 'negative', score: 0.7 };
            }
            
            return { sentiment: 'neutral', score: 0.5 };
        } catch (error) {
            console.error('Erro ao analisar sentimento do texto:', error);
            return { sentiment: 'neutral', score: 0.5 };
        }
    }
}

export const humeEmotionService = new HumeEmotionService();
