// src/components/campaigns/report/campaign-report.tsx
'use client';

import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ReportStatsCards } from '@/components/analytics/report-stats-cards';
import { ReportStatusChart } from '@/components/campaigns/report/report-status-chart';
import { ReportMessagePreview } from '@/components/campaigns/report/report-message-preview';
import { ReportContactsTable } from '@/components/campaigns/report/report-contacts-table';
import type { Campaign, CampaignSend } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const ReportSkeleton = (): JSX.Element => (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-1 h-80" />
            <Skeleton className="lg:col-span-2 h-80" />
        </div>
        <Skeleton className="h-96" />
    </div>
)

interface CampaignReportProps {
  campaignId: string;
}


export function CampaignReport({ campaignId }: CampaignReportProps): JSX.Element {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [deliveryReports, setDeliveryReports] = useState<CampaignSend[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const isSmsCampaign = campaign?.channel === 'SMS';
  
  useEffect(() => {
    if (!campaignId) return;

    const fetchCampaignData = async (): Promise<void> => {
        setLoading(true);
        try {
            const [campaignRes, reportRes] = await Promise.all([
                fetch(`/api/v1/campaigns/${campaignId}`),
                fetch(`/api/v1/campaigns/${campaignId}/delivery-report`)
            ]);

            if (campaignRes.status === 404) notFound();
            if (!campaignRes.ok) throw new Error('Falha ao buscar os dados da campanha.');
            if (!reportRes.ok) throw new Error('Falha ao buscar o relatório de entrega.');
            
            const campaignData: Campaign = await campaignRes.json();
            const reportData: CampaignSend[] = await reportRes.json();
            
            setCampaign(campaignData);
            setDeliveryReports(reportData);

        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Erro ao carregar relatório',
                description: (error as Error).message,
             })
        } finally {
            setLoading(false);
        }
    }
    void fetchCampaignData();
  }, [campaignId, toast]);

  if (loading) {
    return <ReportSkeleton />;
  }

  if (!campaign) {
    return <div className="text-center py-10">Relatório não encontrado.</div>;
  }
  
  const campaignDate = campaign.sentAt || campaign.scheduledAt;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Relatório: ${campaign.name}`}
        description={campaignDate ? `Análise detalhada da campanha enviada em ${new Date(campaignDate).toLocaleString('pt-BR')}.` : 'Análise detalhada da campanha.'}
      >
        <Link href="/campaigns" passHref>
          <Button variant="outline">
            <ArrowLeft className="mr-2" />
            Voltar para Campanhas
          </Button>
        </Link>
      </PageHeader>
      
      {!isSmsCampaign && <ReportStatsCards campaign={campaign} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {!isSmsCampaign && (
            <div className="lg:col-span-1">
                <ReportStatusChart campaign={campaign} />
            </div>
        )}
        <div className={isSmsCampaign ? "lg:col-span-3" : "lg:col-span-2"}>
          <ReportMessagePreview campaign={campaign} />
        </div>
      </div>
      
      <ReportContactsTable deliveryReports={deliveryReports} />

    </div>
  );
}
