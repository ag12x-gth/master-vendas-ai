// src/app/(main)/automations/page.tsx
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { AutomationList } from '@/components/automations/automation-list';
import { AutomationLogs } from '@/components/automations/automation-logs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Calendar } from 'lucide-react';

export default function AutomationsPage() {
  const [activeTab, setActiveTab] = useState('rules');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automações"
        description="Crie regras para automatizar tarefas e fluxos de trabalho."
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Regras
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="rules" className="mt-6">
          <AutomationList />
        </TabsContent>
        
        <TabsContent value="logs" className="mt-6">
          <AutomationLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
