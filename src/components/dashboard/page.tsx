
// src/components/dashboard/page.tsx
'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { DateRange } from 'react-day-picker';
import { subDays, startOfDay } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StatsCards } from '@/components/analytics/stats-cards';
import { QuickShortcuts } from '@/components/dashboard/quick-shortcuts';
import { OngoingCampaigns } from '@/components/dashboard/ongoing-campaigns';
import { PendingConversations } from '@/components/dashboard/pending-conversations';
import { PageHeader } from '@/components/page-header';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Rocket, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import Link from 'next/link';
import { ConnectionAlerts } from '@/components/dashboard/connection-alerts';
import { useVapiCalls } from '@/hooks/useVapiCalls';

const CampaignPerformanceChart = dynamic(() => import('@/components/analytics/campaign-performance-chart').then(mod => ({ default: mod.CampaignPerformanceChart })), { 
  ssr: false,
  loading: () => <ChartSkeleton />
});

const MessageStatusChart = dynamic(() => import('@/components/analytics/message-status-chart').then(mod => ({ default: mod.MessageStatusChart })), { 
  ssr: false,
  loading: () => <ChartSkeleton />
});

const AttendanceTrendChart = dynamic(() => import('@/components/analytics/attendance-trend-chart').then(mod => ({ default: mod.AttendanceTrendChart })), { 
  ssr: false,
  loading: () => <ChartSkeleton />
});

const AgentPerformanceTable = dynamic(() => import('@/components/analytics/agent-performance-table').then(mod => ({ default: mod.AgentPerformanceTable })), { 
  ssr: false,
  loading: () => <TableSkeleton />
});

const CallKPIDashboard = dynamic(() => import('@/components/vapi-voice').then(mod => ({ default: mod.CallKPIDashboard })), { 
  ssr: false,
  loading: () => <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
});

const RecentCallsTable = dynamic(() => import('@/components/vapi-voice').then(mod => ({ default: mod.RecentCallsTable })), { 
  ssr: false,
  loading: () => <TableSkeleton />
});

const AIPerformanceSection = dynamic(() => import('@/components/dashboard/ai-performance-section').then(mod => ({ default: mod.AIPerformanceSection })), { 
  ssr: false,
  loading: () => <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>
});

function ChartSkeleton() {
  return (
    <div className="h-[300px] w-full animate-pulse bg-muted rounded-md flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 w-full animate-pulse bg-muted rounded-md" />
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-4 w-24 animate-pulse bg-muted rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 animate-pulse bg-muted rounded mb-2" />
        <div className="h-3 w-32 animate-pulse bg-muted rounded" />
      </CardContent>
    </Card>
  );
}

export default function DashboardClient() {
  const { metrics: vapiMetrics, calls: vapiCalls, loading: vapiLoading } = useVapiCalls(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 29)),
    to: new Date(),
  });

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-20 md:pb-6">
      <PageHeader
        title="Dashboard"
        description="Bem-vindo de volta! Aqui está uma visão geral da sua conta."
      >
        <div className="hidden sm:block">
          <DateRangePicker onDateChange={setDateRange} initialDate={dateRange} />
        </div>
      </PageHeader>
      
      <Alert className="border-primary/50 text-primary-foreground bg-primary/10">
        <Rocket className="h-4 w-4" />
        <AlertTitle className="font-bold text-primary">Novidade na Versão 2.4.0: Agentes de IA!</AlertTitle>
        <AlertDescription className="text-primary/90">
            Agora você pode criar Agentes de IA e associá-los a cada conexão para automatizar seus atendimentos.
             <Link href="/agentes-ia/new" passHref>
                <Button variant="link" className="p-0 h-auto ml-2 text-primary-foreground font-bold">
                    Criar seu primeiro agente
                    <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
            </Link>
        </AlertDescription>
      </Alert>
      
      <ConnectionAlerts />
      
      <StatsCards dateRange={dateRange} />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle className="text-lg">Tendência de Atendimentos</CardTitle>
                <CardDescription>Atendimentos iniciados vs. resolvidos no período.</CardDescription>
            </CardHeader>
            <CardContent>
                <AttendanceTrendChart dateRange={dateRange} />
            </CardContent>
        </Card>
         <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-lg">Ranking de Atendentes</CardTitle>
                <CardDescription>Performance da equipe no período selecionado.</CardDescription>
            </CardHeader>
            <CardContent>
                <AgentPerformanceTable dateRange={dateRange} />
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Desempenho das Campanhas</CardTitle>
            <CardDescription>
              Comparativo de mensagens enviadas vs. lidas nas últimas campanhas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CampaignPerformanceChart />
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Status das Mensagens</CardTitle>
            <CardDescription>
              Distribuição geral de todas as mensagens enviadas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MessageStatusChart />
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold tracking-tight">Voice Calls (Vapi AI)</h3>
          <Link href="/voice-calls">
            <Button variant="outline" size="sm">
              Ver Tudo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <CallKPIDashboard metrics={vapiMetrics} loading={vapiLoading} />
        
        <Card>
          <CardHeader>
            <CardTitle>Últimas Chamadas</CardTitle>
            <CardDescription>Chamadas recentes realizadas pelo sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentCallsTable 
              calls={vapiCalls.slice(0, 5)} 
              loading={vapiLoading} 
            />
          </CardContent>
        </Card>
      </div>

      <AIPerformanceSection />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <QuickShortcuts />
        <OngoingCampaigns />
        <PendingConversations />
      </div>
    </div>
  );
}
