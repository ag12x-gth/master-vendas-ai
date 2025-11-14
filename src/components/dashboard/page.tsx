
// src/components/dashboard/page.tsx
'use client';

import { useState } from 'react';
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
import { PageHeader } from '@/components/page-header';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Loader2 } from 'lucide-react';
import { ConnectionAlerts } from '@/components/dashboard/connection-alerts';

const ChartSkeleton = () => (
  <div className="h-[300px] w-full animate-pulse bg-muted rounded-md flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const CampaignPerformanceChart = dynamic(() => import('@/components/analytics/campaign-performance-chart').then(mod => ({ default: mod.CampaignPerformanceChart })), { 
  ssr: false,
  loading: ChartSkeleton
});

const AttendanceTrendChart = dynamic(() => import('@/components/analytics/attendance-trend-chart').then(mod => ({ default: mod.AttendanceTrendChart })), { 
  ssr: false,
  loading: ChartSkeleton
});

const AIPerformanceSection = dynamic(() => import('@/components/dashboard/ai-performance-section').then(mod => ({ default: mod.AIPerformanceSection })), { 
  ssr: false,
  loading: ChartSkeleton
});

export default function DashboardClient() {
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
      
      <ConnectionAlerts />
      
      <StatsCards dateRange={dateRange} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tendência de Atendimentos</CardTitle>
          <CardDescription>Atendimentos iniciados vs. resolvidos no período.</CardDescription>
        </CardHeader>
        <CardContent>
          <AttendanceTrendChart dateRange={dateRange} />
        </CardContent>
      </Card>

      <Card>
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

      <AIPerformanceSection />
    </div>
  );
}
