
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, Users, Send, MessageCircleWarning } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { DateRange } from 'react-day-picker';

interface KpiData {
    totalLeadValue: number;
    totalContacts: number;
    totalMessagesSent: number;
    pendingConversations: number;
}

interface StatsCardsProps {
    dateRange?: DateRange;
}

const StatCard = ({ title, value, description, icon: Icon, loading }: { title: string, value: string | number, description: string, icon: React.ElementType, loading: boolean }) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                ) : (
                    <>
                    <div className="text-2xl font-bold">
                        {typeof value === 'number' && title.toLowerCase().includes('valor')
                            ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})
                            : typeof value === 'number'
                            ? value.toLocaleString('pt-BR')
                            : value
                        }
                    </div>
                    <p className="text-xs text-muted-foreground">{description}</p>
                    </>
                )}
            </CardContent>
        </Card>
    )
}

export function StatsCards({ dateRange }: StatsCardsProps) {
    const [data, setData] = useState<KpiData | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (dateRange?.from) params.set('startDate', dateRange.from.toISOString());
                if (dateRange?.to) params.set('endDate', dateRange.to.toISOString());

                const res = await fetch(`/api/v1/dashboard/stats?${params.toString()}`);
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Falha ao carregar os KPIs.');
                }
                const kpiData = await res.json();
                setData(kpiData);
            } catch (error) {
                console.error(error);
                toast({ variant: 'destructive', title: 'Erro nos KPIs', description: (error as Error).message });
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [dateRange, toast]);

    const stats = [
        {
          title: 'Valor Total em Leads',
          value: data?.totalLeadValue ?? 0,
          description: 'Soma de oportunidades no período',
          icon: DollarSign,
        },
        {
          title: 'Novos Contatos',
          value: data?.totalContacts ?? 0,
          description: 'Contatos criados no período',
          icon: Users,
        },
        {
          title: 'Mensagens Enviadas',
          value: data?.totalMessagesSent ?? 0,
          description: 'Soma de todas as campanhas no período',
          icon: Send,
        },
        {
          title: 'Atendimentos Pendentes',
          value: data?.pendingConversations ?? 0,
          description: 'Aguardando 1ª resposta no período',
          icon: MessageCircleWarning,
        },
      ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard 
            key={stat.title}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
            loading={loading}
        />
      ))}
    </div>
  );
}
