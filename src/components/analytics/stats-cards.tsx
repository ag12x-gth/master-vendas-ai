
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, Users, Send, MessageCircleWarning, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { createToastNotifier } from '@/lib/toast-helper';
import type { DateRange } from 'react-day-picker';
import { Button } from '../ui/button';

interface KpiData {
    totalLeadValue: number;
    totalContacts: number;
    totalMessagesSent: number;
    totalWhatsappSent: number;
    totalSmsSent: number;
    pendingConversations: number;
}

interface StatsCardsProps {
    dateRange?: DateRange;
}

interface StatCardProps {
    title: string;
    value: string | number;
    description: string;
    icon: React.ElementType;
    loading: boolean;
    showToggle?: boolean;
    isHidden?: boolean;
    onToggleVisibility?: () => void;
}

const StatCard = ({ title, value, description, icon: Icon, loading, showToggle, isHidden, onToggleVisibility }: StatCardProps) => {
    const formatValue = () => {
        if (isHidden) {
            return 'R$ ••••••';
        }
        if (typeof value === 'number' && title.toLowerCase().includes('valor')) {
            return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'});
        }
        if (typeof value === 'number') {
            return value.toLocaleString('pt-BR');
        }
        return value;
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className="flex items-center gap-1">
                    {showToggle && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={onToggleVisibility}
                            title={isHidden ? 'Mostrar valor' : 'Ocultar valor'}
                        >
                            {isHidden ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                        </Button>
                    )}
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
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
                        {formatValue()}
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
    const [hideLeadValue, setHideLeadValue] = useState(false);
    const { toast } = useToast();
    const notify = useMemo(() => createToastNotifier(toast), [toast]);

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
                notify.error('Erro nos KPIs', (error as Error).message);
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [dateRange, notify]);

    const stats = [
        {
          title: 'Valor Total em Leads',
          value: data?.totalLeadValue ?? 0,
          description: 'Soma de oportunidades no período',
          icon: DollarSign,
          showToggle: true,
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
          description: `${(data?.totalWhatsappSent ?? 0).toLocaleString('pt-BR')} via WhatsApp | ${(data?.totalSmsSent ?? 0).toLocaleString('pt-BR')} via SMS`,
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
            showToggle={stat.showToggle}
            isHidden={stat.showToggle ? hideLeadValue : false}
            onToggleVisibility={stat.showToggle ? () => setHideLeadValue(!hideLeadValue) : undefined}
        />
      ))}
    </div>
  );
}
