'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Phone, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

interface AnalyticsData {
  kpis: {
    totalCalls: number;
    totalMinutes: number;
    avgDuration: number;
    completionRate: number;
    resolutionRate: number;
  };
  callsByHour: Array<{ hour: number; calls: number }>;
  dailyStats: Array<{
    date: string;
    totalCalls: number;
    avgDuration: number;
    completedCalls: number;
    resolvedCalls: number;
    completionRate: number;
  }>;
  statusDistribution: Array<{ status: string; count: number }>;
  successRateTrend: Array<{
    date: string;
    totalCalls: number;
    completedCalls: number;
    successRate: number;
  }>;
  durationByStatus: Array<{ status: string; avgDuration: number; count: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981',
  'in-progress': '#3b82f6',
  failed: '#ef4444',
  initiated: '#f59e0b',
  ringing: '#8b5cf6',
};

const formatHour = (hour: number) => {
  if (hour === 0) return '00:00';
  if (hour < 12) return `${hour}:00`;
  if (hour === 12) return '12:00';
  return `${hour - 12}:00`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

export function VoiceCallsAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const response = await fetch('/api/vapi/analytics');
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const analyticsData = await response.json();
        setData(analyticsData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            {error || 'Erro ao carregar analytics'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { kpis, callsByHour, dailyStats, statusDistribution, successRateTrend } = data;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Chamadas</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.totalMinutes} minutos totais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(kpis.avgDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Por chamada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Chamadas completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Resolução</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.resolutionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Casos resolvidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Chamadas por Hora */}
        <Card>
          <CardHeader>
            <CardTitle>Chamadas por Hora do Dia</CardTitle>
            <CardDescription>Distribuição de chamadas ao longo do dia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={callsByHour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={formatHour} />
                <YAxis />
                <Tooltip 
                  labelFormatter={formatHour}
                  formatter={(value: number) => [value, 'Chamadas']}
                />
                <Bar dataKey="calls" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição de Status */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Status</CardTitle>
            <CardDescription>Status das chamadas realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => `${status}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={STATUS_COLORS[entry.status] || '#94a3b8'} 
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tendências */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Sucesso (Últimos 14 dias)</CardTitle>
          <CardDescription>Taxa de conclusão e volume de chamadas</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={[...successRateTrend].reverse()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDate} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                labelFormatter={formatDate}
                formatter={(value: number, name: string) => {
                  if (name === 'successRate') return [value + '%', 'Taxa de Sucesso'];
                  if (name === 'totalCalls') return [value, 'Total de Chamadas'];
                  return [value, name];
                }}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="successRate" 
                stroke="#10b981" 
                name="Taxa de Sucesso (%)"
                strokeWidth={2}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="totalCalls" 
                stroke="#3b82f6" 
                name="Total de Chamadas"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Estatísticas Diárias */}
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas Diárias (Últimos 30 dias)</CardTitle>
          <CardDescription>Desempenho detalhado por dia</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={[...dailyStats].reverse()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDate} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                labelFormatter={formatDate}
                formatter={(value: number, name: string) => {
                  if (name === 'avgDuration') return [formatDuration(value), 'Duração Média'];
                  if (name === 'totalCalls') return [value, 'Total de Chamadas'];
                  return [value, name];
                }}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="totalCalls" 
                stroke="#3b82f6" 
                name="Total de Chamadas"
                strokeWidth={2}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="avgDuration" 
                stroke="#f59e0b" 
                name="Duração Média (s)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
