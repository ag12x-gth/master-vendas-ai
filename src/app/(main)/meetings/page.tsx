import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { db, meetings } from '@/lib/db';
import { desc } from 'drizzle-orm';
import Link from 'next/link';

async function getMeetings() {
    const allMeetings = await db
        .select()
        .from(meetings)
        .orderBy(desc(meetings.createdAt))
        .limit(20);

    return allMeetings;
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

export default async function MeetingsPage() {
    const allMeetings = await getMeetings();

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Reuniões</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie e analise suas reuniões
                    </p>
                </div>
                <Button>+ Nova Reunião</Button>
            </div>

            <div className="grid gap-4">
                {allMeetings.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground">
                                Nenhuma reunião encontrada
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    allMeetings.map((meeting) => (
                        <Card key={meeting.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg">
                                            Reunião {meeting.id.substring(0, 8)}
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {meeting.googleMeetUrl}
                                        </p>
                                    </div>
                                    {getStatusBadge(meeting.status)}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">
                                        {meeting.scheduledFor ? (
                                            <>Agendada para: {new Date(meeting.scheduledFor).toLocaleString('pt-BR')}</>
                                        ) : (
                                            <>Criada em: {new Date(meeting.createdAt).toLocaleString('pt-BR')}</>
                                        )}
                                    </div>
                                    <Link href={`/meetings/${meeting.id}`}>
                                        <Button variant="outline" size="sm">
                                            Ver Detalhes
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
