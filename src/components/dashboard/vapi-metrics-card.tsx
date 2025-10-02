'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Clock, CheckCircle, TrendingUp, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VapiMetrics {
  summary: {
    totalCalls: number;
    completedCalls: number;
    inProgressCalls: number;
    failedCalls: number;
    resolvedCases: number;
    avgDuration: number;
    totalDuration: number;
    successRate: number;
  };
  callsByDay: Record<string, number>;
  recentCalls: Array<{
    id: string;
    vapiCallId: string;
    customerName: string | null;
    customerNumber: string;
    status: string;
    duration: number | null;
    summary: string | null;
    resolved: boolean | null;
    startedAt: Date | null;
    endedAt: Date | null;
    createdAt: Date;
  }>;
}

export function VapiMetricsCard() {
  const [metrics, setMetrics] = useState<VapiMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/vapi/metrics');
        if (!response.ok) {
          throw new Error('Falha ao carregar métricas Vapi');
        }
        const data = await response.json();
        setMetrics(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching Vapi metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (loading) {
    return (
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-600" />
            Chamadas de Voz (Vapi AI)
          </CardTitle>
          <CardDescription>Métricas de chamadas de voz automatizadas</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-600" />
            Chamadas de Voz (Vapi AI)
          </CardTitle>
          <CardDescription>Métricas de chamadas de voz automatizadas</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          {error || 'Nenhuma chamada registrada ainda'}
        </CardContent>
      </Card>
    );
  }

  const { summary, recentCalls } = metrics;

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="h-5 w-5 text-green-600" />
          Chamadas de Voz (Vapi AI)
        </CardTitle>
        <CardDescription>
          Métricas de chamadas de voz automatizadas • Atualizado agora
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="flex flex-col gap-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span className="text-sm font-medium">Total de Chamadas</span>
            </div>
            <div className="text-2xl font-bold">{summary.totalCalls}</div>
            <div className="text-xs text-muted-foreground">
              {summary.completedCalls} completadas
            </div>
          </div>

          <div className="flex flex-col gap-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Duração Média</span>
            </div>
            <div className="text-2xl font-bold">{formatDuration(summary.avgDuration)}</div>
            <div className="text-xs text-muted-foreground">
              Total: {formatDuration(summary.totalDuration)}
            </div>
          </div>

          <div className="flex flex-col gap-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Taxa de Sucesso</span>
            </div>
            <div className="text-2xl font-bold">{summary.successRate}%</div>
            <div className="text-xs text-muted-foreground">
              {summary.resolvedCases} casos resolvidos
            </div>
          </div>

          <div className="flex flex-col gap-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Em Andamento</span>
            </div>
            <div className="text-2xl font-bold">{summary.inProgressCalls}</div>
            <div className="text-xs text-muted-foreground">
              {summary.failedCalls} falharam
            </div>
          </div>
        </div>

        {recentCalls.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Últimas Chamadas</h4>
            <div className="space-y-2">
              {recentCalls.slice(0, 5).map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {call.customerName || call.customerNumber}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          call.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : call.status === 'in-progress'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {call.status}
                      </span>
                    </div>
                    {call.summary && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {call.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground ml-4">
                    {call.duration && (
                      <span className="whitespace-nowrap">{formatDuration(call.duration)}</span>
                    )}
                    <span className="whitespace-nowrap">
                      {formatDistanceToNow(new Date(call.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
