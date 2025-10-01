

'use client';

import { PageHeader } from '@/components/page-header';
import { TeamTable } from '@/components/settings/team-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Webhook, KeyRound, BrainCircuit } from 'lucide-react';
import { WebhooksManager } from '@/components/settings/webhooks-manager';
import { ApiKeysManager } from '@/components/settings/api-keys-manager';
import { AiSettingsManager } from '@/components/settings/ai-settings-manager';


export default function ManagementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão da Empresa"
        description="Gerencie sua equipe e as configurações de integração da plataforma."
      />

      <Tabs defaultValue="team" className="w-full">
        <TabsList className="grid w-full h-auto grid-cols-1 sm:grid-cols-4">
          <TabsTrigger value="team">
            <Users className="mr-2 h-4 w-4" />
            Equipe
          </TabsTrigger>
           <TabsTrigger value="ai">
            <BrainCircuit className="mr-2 h-4 w-4" />
            Inteligência Artificial
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="mr-2 h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="api">
            <KeyRound className="mr-2 h-4 w-4" />
            API
          </TabsTrigger>
        </TabsList>
        <TabsContent value="team" className="mt-6">
          <TeamTable />
        </TabsContent>
        <TabsContent value="ai" className="mt-6">
            <AiSettingsManager />
        </TabsContent>
        <TabsContent value="webhooks" className="mt-6">
          <WebhooksManager />
        </TabsContent>
        <TabsContent value="api" className="mt-6">
          <ApiKeysManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
