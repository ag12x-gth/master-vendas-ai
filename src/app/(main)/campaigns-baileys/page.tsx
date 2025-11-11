import { PageHeader } from '@/components/page-header';
import { BaileysCampaignTable } from '@/components/campaigns/baileys-campaign-table';
import { CreateBaileysCampaignDialog } from '@/components/campaigns/create-baileys-campaign-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function BaileysCampaignsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Campanhas WhatsApp Baileys"
        description="Envie campanhas de texto simples via WhatsApp pessoal/empresarial (QR Code)."
      >
        <CreateBaileysCampaignDialog>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Campanha Baileys
          </Button>
        </CreateBaileysCampaignDialog>
      </PageHeader>
      <BaileysCampaignTable />
    </div>
  );
}
