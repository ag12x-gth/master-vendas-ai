'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

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

interface MeetingRoomPanelProps {
    meetingId: string;
}

export function MeetingRoomPanel({ meetingId }: MeetingRoomPanelProps) {
    const [transcripts, setTranscripts] = useState<TranscriptUpdate[]>([]);
    const [currentEmotion, setCurrentEmotion] = useState<EmotionUpdate | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socketInstance = io({
            path: '/api/socketio',
        });

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
            setTranscripts(prev => [...prev, data]);
        });

        socketInstance.on('emotion_update', (data: EmotionUpdate) => {
            console.log('Emoção recebida:', data);
            setCurrentEmotion(data);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [meetingId]);

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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Transcrição em Tempo Real</span>
                        <Badge variant={isConnected ? 'default' : 'destructive'}>
                            {isConnected ? 'Conectado' : 'Desconectado'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[500px] w-full pr-4">
                        {transcripts.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                Aguardando transcrições...
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {transcripts.map((transcript, index) => (
                                    <div key={index} className="border-l-4 pl-4 py-2" style={{ borderColor: transcript.sentiment === 'positive' ? '#22c55e' : transcript.sentiment === 'negative' ? '#ef4444' : '#6b7280' }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-sm">{transcript.speaker}</span>
                                            <Badge className={getSentimentColor(transcript.sentiment)} variant="outline">
                                                {getSentimentLabel(transcript.sentiment)}
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
                    <CardTitle>Análise de Emoções</CardTitle>
                </CardHeader>
                <CardContent>
                    {currentEmotion ? (
                        <div className="space-y-4">
                            <div className="text-center mb-6">
                                <h3 className="text-3xl font-bold mb-2">{currentEmotion.dominantEmotion}</h3>
                                <p className="text-sm text-muted-foreground">Emoção Dominante</p>
                            </div>
                            
                            <div className="space-y-2">
                                {currentEmotion.emotions.slice(0, 5).map((emotion, index) => (
                                    <div key={index} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span>{emotion.name}</span>
                                            <span className="font-medium">{(emotion.score * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-secondary rounded-full h-2">
                                            <div 
                                                className="bg-primary h-2 rounded-full transition-all duration-300" 
                                                style={{ width: `${emotion.score * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 pt-4 border-t">
                                <p className="text-xs text-muted-foreground">
                                    Última atualização: {new Date(currentEmotion.timestamp).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            Aguardando análise de emoções...
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
