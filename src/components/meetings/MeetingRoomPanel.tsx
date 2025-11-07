'use client';

import { useEffect, useState, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { createAuthenticatedSocket } from '@/lib/socket-lazy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
    AlertTriangle, 
    TrendingUp, 
    TrendingDown, 
    Lightbulb, 
    MessageSquare,
    Activity,
    Target,
    Zap
} from 'lucide-react';

interface TranscriptUpdate {
    meetingId: string;
    transcript: string;
    speaker: string;
    sentiment: string;
    sentimentScore: number;
    timestamp: string;
}

interface EmotionUpdate {
    meetingId: string;
    emotions: Array<{ name: string; score: number }>;
    dominantEmotion: string;
    timestamp: string;
}

interface Alert {
    type: 'objection' | 'negative' | 'keyword' | 'engagement';
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
}

interface CoachingSuggestion {
    type: 'response' | 'strategy' | 'question';
    message: string;
    timestamp: string;
}

interface MeetingRoomPanelProps {
    meetingId: string;
}

export function MeetingRoomPanel({ meetingId }: MeetingRoomPanelProps) {
    const [transcripts, setTranscripts] = useState<TranscriptUpdate[]>([]);
    const [currentEmotion, setCurrentEmotion] = useState<EmotionUpdate | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [coachingSuggestions, setCoachingSuggestions] = useState<CoachingSuggestion[]>([]);
    const [meetingStats, setMeetingStats] = useState({
        duration: 0,
        wordCount: 0,
        positiveRatio: 0,
        engagementScore: 0,
        leadScore: 0,
    });

    const scrollRef = useRef<HTMLDivElement>(null);
    const objectionKeywords = ['não', 'caro', 'preço', 'problema', 'difícil', 'complicado', 'impossível'];
    const positiveKeywords = ['sim', 'perfeito', 'ótimo', 'interessante', 'gostei', 'concordo'];

    useEffect(() => {
        async function loadHistoricalData() {
            try {
                const response = await fetch(`/api/v1/meetings/${meetingId}/transcripts`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.transcripts && data.transcripts.length > 0) {
                        const historicalTranscripts = data.transcripts.map((t: any) => ({
                            meetingId,
                            transcript: t.transcript,
                            speaker: t.speaker,
                            sentiment: t.sentiment,
                            sentimentScore: parseFloat(t.sentimentScore || '0'),
                            timestamp: t.timestamp,
                        }));
                        setTranscripts(historicalTranscripts);
                        updateMeetingStats(historicalTranscripts);
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar dados históricos:', error);
            }
        }

        loadHistoricalData();
    }, [meetingId]);

    useEffect(() => {
        let cleanup: (() => void) | undefined;

        async function initializeSocket() {
            try {
                const response = await fetch('/api/auth/socket-token');
                
                if (!response.ok) {
                    console.error('Erro ao obter token Socket.IO');
                    return;
                }

                const { token } = await response.json();

                const socketInstance = await createAuthenticatedSocket(token);

                socketInstance.on('connect', () => {
                    console.log('Socket.IO conectado:', socketInstance.id);
                    setIsConnected(true);
                    socketInstance.emit('join_meeting', meetingId);
                });

                socketInstance.on('disconnect', () => {
                    console.log('Socket.IO desconectado');
                    setIsConnected(false);
                });

                socketInstance.on('transcript_update', (data: TranscriptUpdate) => {
                    console.log('Transcrição recebida:', data);
                    setTranscripts(prev => {
                        const newTranscripts = [...prev, data];
                        
                        analyzeTranscript(data);
                        
                        updateMeetingStats(newTranscripts);
                        
                        return newTranscripts;
                    });

                    if (scrollRef.current) {
                        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                    }
                });

                socketInstance.on('emotion_update', (data: EmotionUpdate) => {
                    console.log('Emoção recebida:', data);
                    setCurrentEmotion(data);
                    
                    const negativeEmotions = data.emotions.filter(e => 
                        ['anger', 'fear', 'sadness', 'frustration'].includes(e.name.toLowerCase())
                    );
                    
                    if (negativeEmotions.some(e => e.score > 0.5)) {
                        addAlert({
                            type: 'negative',
                            message: `Atenção: ${data.dominantEmotion} detectado. Ajuste a abordagem.`,
                            timestamp: new Date().toISOString(),
                            severity: 'high',
                        });
                    }
                });

                socketInstance.on('connect_error', (error) => {
                    console.error('Erro de conexão Socket.IO:', error);
                    setIsConnected(false);
                });

                setSocket(socketInstance);

                cleanup = () => {
                    socketInstance.disconnect();
                };
            } catch (error) {
                console.error('Erro ao inicializar Socket.IO:', error);
            }
        }

        initializeSocket();

        return () => {
            if (cleanup) cleanup();
        };
    }, [meetingId]);

    const analyzeTranscript = (data: TranscriptUpdate) => {
        const text = data.transcript.toLowerCase();

        objectionKeywords.forEach(keyword => {
            if (text.includes(keyword)) {
                addAlert({
                    type: 'objection',
                    message: `Objeção detectada: "${keyword}". Aborde com empatia.`,
                    timestamp: new Date().toISOString(),
                    severity: 'high',
                });

                addCoachingSuggestion({
                    type: 'response',
                    message: `Responda a objeção sobre "${keyword}" com foco nos benefícios`,
                    timestamp: new Date().toISOString(),
                });
            }
        });

        if (data.sentiment === 'negative' && data.sentimentScore < -0.5) {
            addCoachingSuggestion({
                type: 'strategy',
                message: 'Sentimento negativo detectado. Faça uma pausa, ouça e valide as preocupações do lead.',
                timestamp: new Date().toISOString(),
            });
        }

        positiveKeywords.forEach(keyword => {
            if (text.includes(keyword)) {
                addCoachingSuggestion({
                    type: 'strategy',
                    message: `Momento positivo! Aproveite para aprofundar o interesse.`,
                    timestamp: new Date().toISOString(),
                });
            }
        });

        if (text.includes('quando') || text.includes('como') || text.includes('quanto')) {
            addCoachingSuggestion({
                type: 'question',
                message: 'Lead fazendo perguntas. Sinal de interesse! Responda com exemplos concretos.',
                timestamp: new Date().toISOString(),
            });
        }
    };

    const addAlert = (alert: Alert) => {
        setAlerts(prev => [...prev.slice(-4), alert]);
    };

    const addCoachingSuggestion = (suggestion: CoachingSuggestion) => {
        setCoachingSuggestions(prev => [...prev.slice(-4), suggestion]);
    };

    const updateMeetingStats = (allTranscripts: TranscriptUpdate[]) => {
        const totalWords = allTranscripts.reduce((sum, t) => sum + t.transcript.split(' ').length, 0);
        const positiveCount = allTranscripts.filter(t => t.sentiment === 'positive').length;
        const totalCount = allTranscripts.length || 1;
        
        const positiveRatio = (positiveCount / totalCount) * 100;
        const engagementScore = Math.min(100, totalWords / 10);
        const leadScore = (positiveRatio * 0.6) + (engagementScore * 0.4);

        setMeetingStats({
            duration: allTranscripts.length * 5,
            wordCount: totalWords,
            positiveRatio,
            engagementScore,
            leadScore,
        });
    };

    const getSentimentColor = (sentiment: string) => {
        switch (sentiment) {
            case 'positive':
                return 'bg-green-500';
            case 'negative':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getSentimentLabel = (sentiment: string) => {
        switch (sentiment) {
            case 'positive':
                return 'Positivo';
            case 'negative':
                return 'Negativo';
            default:
                return 'Neutro';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 70) return 'text-green-600';
        if (score >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="space-y-6">
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            <span>Métricas em Tempo Real</span>
                        </div>
                        <Badge variant={isConnected ? 'default' : 'destructive'} className="animate-pulse">
                            {isConnected ? '● AO VIVO' : '○ Desconectado'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Duração</p>
                            <p className="text-2xl font-bold">{Math.floor(meetingStats.duration / 60)}min</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Palavras</p>
                            <p className="text-2xl font-bold">{meetingStats.wordCount}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Sentimento +</p>
                            <p className={`text-2xl font-bold ${getScoreColor(meetingStats.positiveRatio)}`}>
                                {meetingStats.positiveRatio.toFixed(0)}%
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Engajamento</p>
                            <p className={`text-2xl font-bold ${getScoreColor(meetingStats.engagementScore)}`}>
                                {meetingStats.engagementScore.toFixed(0)}%
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                                <Target className="h-4 w-4" />
                                Lead Score
                            </p>
                            <p className={`text-2xl font-bold ${getScoreColor(meetingStats.leadScore)}`}>
                                {meetingStats.leadScore.toFixed(0)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {alerts.length > 0 && (
                <Card className="border-orange-500/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-600">
                            <AlertTriangle className="h-5 w-5" />
                            Alertas em Tempo Real
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {alerts.slice(-3).reverse().map((alert, index) => (
                                <Alert key={index} variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle className="capitalize">{alert.type}</AlertTitle>
                                    <AlertDescription>{alert.message}</AlertDescription>
                                </Alert>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {coachingSuggestions.length > 0 && (
                <Card className="border-blue-500/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-600">
                            <Lightbulb className="h-5 w-5" />
                            Sugestões de Coaching IA
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {coachingSuggestions.slice(-3).reverse().map((suggestion, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg animate-in fade-in slide-in-from-right-2">
                                    <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium capitalize">{suggestion.type}</p>
                                        <p className="text-sm text-muted-foreground">{suggestion.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Transcrição em Tempo Real
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[500px] w-full pr-4" ref={scrollRef}>
                            {transcripts.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                                    <p>Aguardando transcrições...</p>
                                    <p className="text-xs mt-2">O bot está entrando na reunião</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {transcripts.map((transcript, index) => (
                                        <div 
                                            key={index} 
                                            className="border-l-4 pl-4 py-2 animate-in fade-in slide-in-from-bottom-2" 
                                            style={{ borderColor: transcript.sentiment === 'positive' ? '#22c55e' : transcript.sentiment === 'negative' ? '#ef4444' : '#6b7280' }}
                                        >
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="font-semibold text-sm">{transcript.speaker}</span>
                                                <Badge className={getSentimentColor(transcript.sentiment)} variant="outline">
                                                    {getSentimentLabel(transcript.sentiment)}
                                                    {transcript.sentiment === 'positive' ? ' ↑' : transcript.sentiment === 'negative' ? ' ↓' : ''}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground ml-auto">
                                                    {new Date(transcript.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <p className="text-sm">{transcript.transcript}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Análise de Emoções
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {currentEmotion ? (
                            <div className="space-y-6">
                                <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                                    <h3 className="text-4xl font-bold mb-2 capitalize animate-pulse">{currentEmotion.dominantEmotion}</h3>
                                    <p className="text-sm text-muted-foreground">Emoção Dominante</p>
                                </div>
                                
                                <div className="space-y-3">
                                    <p className="text-sm font-medium mb-2">Top 5 Emoções Detectadas:</p>
                                    {currentEmotion.emotions.slice(0, 5).map((emotion, index) => (
                                        <div key={index} className="space-y-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="capitalize">{emotion.name}</span>
                                                <span className="font-medium">{(emotion.score * 100).toFixed(1)}%</span>
                                            </div>
                                            <Progress value={emotion.score * 100} className="h-2" />
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 pt-4 border-t">
                                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                                        <Activity className="h-3 w-3" />
                                        Última atualização: {new Date(currentEmotion.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                                <p>Aguardando análise de emoções...</p>
                                <p className="text-xs mt-2">Dados serão exibidos em tempo real</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
