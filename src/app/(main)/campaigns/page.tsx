import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { CampaignTable } from '@/components/campaigns/campaign-table';
import { CreateCampaignDialog } from '@/components/campaigns/create-campaign-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileText } from 'lucide-react';

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
       <PageHeader
          title="Campanhas de WhatsApp"
        >
            <div className="flex gap-2">
              <CreateCampaignDialog>
                  <Button>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Criar Campanha
                  </Button>
              </CreateCampaignDialog>
              <Link href="/templates">
                <Button variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Templates
                </Button>
              </Link>
            </div>
       </PageHeader>
      <CampaignTable channel="WHATSAPP" />
    </div>
  );
}
