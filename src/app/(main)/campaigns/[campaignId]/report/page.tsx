
'use client';

import { CampaignReport } from "@/components/campaigns/report/campaign-report";
import type { PageProps } from "@/lib/types";

export default function CampaignReportPage({ params }: PageProps<{ campaignId: string }>) {
  // A lógica de busca de dados foi movida para o componente CampaignReport
  // para mantê-lo como um Client Component puro e facilitar a gestão de estado.
  return <CampaignReport campaignId={params.campaignId} />;
}
