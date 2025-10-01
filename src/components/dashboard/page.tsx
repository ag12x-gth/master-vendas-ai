
// src/components/dashboard/page.tsx
'use client';

import { useState } from 'react';
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
import { CampaignPerformanceChart } from '@/components/analytics/campaign-performance-chart';
import { MessageStatusChart } from '@/components/analytics/message-status-chart';
import { QuickShortcuts } from '@/components/dashboard/quick-shortcuts';
import { OngoingCampaigns } from '@/components/dashboard/ongoing-campaigns';
import { PendingConversations } from '@/components/dashboard/pending-conversations';
import { PageHeader } from '@/components/page-header';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { AttendanceTrendChart } from '@/components/analytics/attendance-trend-chart';
import { AgentPerformanceTable } from '@/components/analytics/agent-performance-table';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Rocket, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import Link from 'next/link';
import { ConnectionAlerts } from '@/components/dashboard/connection-alerts';

export default function DashboardClient() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 29)),
    to: new Date(),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Bem-vindo de volta! Aqui está uma visão geral da sua conta."
      >
        <DateRangePicker onDateChange={setDateRange} initialDate={dateRange} />
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <QuickShortcuts />
        <OngoingCampaigns />
        <PendingConversations />
      </div>
    </div>
  );
}
