import { Suspense } from 'react';
import { MeetingRoomPanel } from '@/components/meetings/MeetingRoomPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { db, meetings, meetingInsights } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

interface MeetingPageProps {
    params: {
        id: string;
    };
}

async function getMeetingData(id: string) {
    const [meeting] = await db
        .select()
        .from(meetings)
        .where(eq(meetings.id, id));

    if (!meeting) {
        return null;
    }

    const [insights] = await db
        .select()
        .from(meetingInsights)
        .where(eq(meetingInsights.meetingId, id));

    return { meeting, insights };
}

function getStatusBadge(status: string) {
    const statusConfig = {
        scheduled: { label: 'Agendada', variant: 'secondary' as const },
        in_progress: { label: 'Em Andamento', variant: 'default' as const },
        completed: { label: 'Concluída', variant: 'outline' as const },
        cancelled: { label: 'Cancelada', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default async function MeetingPage({ params }: MeetingPageProps) {
    const data = await getMeetingData(params.id);

    if (!data) {
        notFound();
    }

    const { meeting, insights } = data;

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Análise de Reunião</h1>
                    <p className="text-muted-foreground mt-1">
                        {meeting.googleMeetUrl}
                    </p>
                </div>
                {getStatusBadge(meeting.status)}
            </div>

            {meeting.status === 'in_progress' && (
                <Suspense fallback={<div>Carregando análise em tempo real...</div>}>
                    <MeetingRoomPanel meetingId={meeting.id} />
                </Suspense>
            )}

            {insights && meeting.status === 'completed' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Resumo da Reunião</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm mb-4">{insights.summaryText || 'Nenhum resumo disponível'}</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Pontos-chave</h4>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                        {Array.isArray(insights.keyPoints) && insights.keyPoints.length > 0 ? (
                                            insights.keyPoints.map((point: any, index: number) => (
                                                <li key={index}>{point}</li>
                                            ))
                                        ) : (
                                            <li className="text-muted-foreground">Nenhum ponto-chave identificado</li>
                                        )}
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2">Dores Identificadas</h4>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                        {Array.isArray(insights.painPoints) && insights.painPoints.length > 0 ? (
                                            insights.painPoints.map((point: any, index: number) => (
                                                <li key={index}>{point}</li>
                                            ))
                                        ) : (
                                            <li className="text-muted-foreground">Nenhuma dor identificada</li>
                                        )}
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2">Interesses</h4>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                        {Array.isArray(insights.interests) && insights.interests.length > 0 ? (
                                            insights.interests.map((interest: any, index: number) => (
                                                <li key={index}>{interest}</li>
                                            ))
                                        ) : (
                                            <li className="text-muted-foreground">Nenhum interesse identificado</li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Análise e Recomendações</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Score do Lead</h4>
                                    <div className="flex items-center gap-4">
                                        <div className="text-3xl font-bold">{insights.leadScore || 0}/100</div>
                                        <div className="flex-1">
                                            <div className="w-full bg-secondary rounded-full h-3">
                                                <div 
                                                    className="bg-primary h-3 rounded-full" 
                                                    style={{ width: `${insights.leadScore || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2">Sentimento Geral</h4>
                                    <Badge 
                                        variant={
                                            insights.overallSentiment === 'positive' ? 'default' :
                                            insights.overallSentiment === 'negative' ? 'destructive' : 'secondary'
                                        }
                                    >
                                        {insights.overallSentiment === 'positive' ? 'Positivo' :
                                         insights.overallSentiment === 'negative' ? 'Negativo' : 'Neutro'}
                                    </Badge>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2">Nível de Engajamento</h4>
                                    <Badge variant="outline">
                                        {insights.engagementLevel === 'high' ? 'Alto' :
                                         insights.engagementLevel === 'medium' ? 'Médio' : 'Baixo'}
                                    </Badge>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2">Proposta Recomendada</h4>
                                    <p className="text-sm bg-secondary p-4 rounded-lg">
                                        {insights.recommendedProposal || 'Nenhuma proposta gerada ainda'}
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2">Próximos Passos</h4>
                                    <ul className="list-decimal list-inside space-y-1 text-sm">
                                        {Array.isArray(insights.nextSteps) && insights.nextSteps.length > 0 ? (
                                            insights.nextSteps.map((step: any, index: number) => (
                                                <li key={index}>{step}</li>
                                            ))
                                        ) : (
                                            <li className="text-muted-foreground">Nenhum próximo passo definido</li>
                                        )}
                                    </ul>
                                </div>

                                {Array.isArray(insights.objections) && insights.objections.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-2 text-destructive">Objeções</h4>
                                        <ul className="list-disc list-inside space-y-1 text-sm">
                                            {insights.objections.map((objection: any, index: number) => (
                                                <li key={index}>{objection}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {meeting.status === 'scheduled' && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground mb-4">
                            Esta reunião está agendada e ainda não foi iniciada.
                        </p>
                        <Button>Entrar na Reunião</Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
