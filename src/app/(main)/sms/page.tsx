// src/app/(main)/sms/page.tsx
'use client';

import { PageHeader } from '@/components/page-header';
import { SmsGatewaysManager } from '@/components/settings/sms-gateways-manager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, Send, PlusCircle } from 'lucide-react';
import { CampaignTable } from '@/components/campaigns/campaign-table';
import { CreateSmsCampaignDialog } from '@/components/campaigns/create-sms-campaign-dialog';
import { Button } from '@/components/ui/button';

export default function SmsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de SMS"
        description="Gerencie seus gateways de envio e suas campanhas de SMS."
      >
        <CreateSmsCampaignDialog>
             <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar Campanha SMS
            </Button>
        </CreateSmsCampaignDialog>
      </PageHeader>

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="campaigns">
            <Send className="mr-2 h-4 w-4" />
            Campanhas de SMS
          </TabsTrigger>
          <TabsTrigger value="gateways">
            <Briefcase className="mr-2 h-4 w-4" />
            Gateways de Envio
          </TabsTrigger>
        </TabsList>
        <TabsContent value="campaigns" className="mt-6">
            <CampaignTable channel="SMS" />
        </TabsContent>
        <TabsContent value="gateways" className="mt-6">
          <SmsGatewaysManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
