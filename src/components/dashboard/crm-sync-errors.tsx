
'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@/components/ui/card';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
  

type SyncErrorLog = {
    id: string;
    type: string;
    error: string | null;
    createdAt: string;
}

export function CrmSyncErrors() {
    const [logs, setLogs] = useState<SyncErrorLog[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/v1/integrations/logs?status=FAILED');
                if (!res.ok) throw new Error('Falha ao buscar logs de sincronização.');
                const data = await res.json();
                setLogs(data);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Erro de Sincronização', description: (error as Error).message });
            } finally {
                setLoading(false);
            }
        }
        fetchLogs();
    }, [toast]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Últimos Erros de Sincronização com o CRM</CardTitle>
                <CardDescription>Monitorize aqui as falhas na comunicação com sistemas externos.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>🎉 Nenhum erro de sincronização encontrado!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {logs.map(log => (
                            <div key={log.id} className="flex items-start gap-4 p-3 bg-destructive/10 rounded-lg">
                                <div className="mt-1">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-destructive">{log.error}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Em {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ptBR })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
