import { PageHeader } from '@/components/page-header';
import { CampaignTable } from '@/components/campaigns/campaign-table';
import { CreateCampaignDialog } from '@/components/campaigns/create-campaign-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
       <PageHeader
          title="Campanhas de WhatsApp"
          description="Monitore e analise o desempenho de seus envios de WhatsApp."
        >
            <CreateCampaignDialog>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar Campanha
                </Button>
            </CreateCampaignDialog>
       </PageHeader>
      <CampaignTable channel="WHATSAPP" />
    </div>
  );
}
