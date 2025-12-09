'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CallKPIDashboard } from '@/components/vapi-voice/CallKPIDashboard';
import { CallHistoryTable } from '@/components/vapi-voice/CallHistoryTable';
import { BulkCallDialog } from '@/components/vapi-voice/BulkCallDialog';
import { VoiceCallsAnalytics } from '@/components/vapi-voice/VoiceCallsAnalytics';
import { VoiceAgentsTable, VoiceAgentDialog, VoiceAgentKPIs } from '@/components/voice-agents';
import { useVapiCalls } from '@/hooks/useVapiCalls';
import { useVoiceAgents, VoiceAgent, CreateAgentData, UpdateAgentData } from '@/hooks/useVoiceAgents';
import { PhoneCall, History, BarChart3, Bot, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Contact {
  id: string;
  name: string;
  phone: string;
}

export default function VoiceCallsPage() {
  const { metrics, loading } = useVapiCalls(true);
  const { 
    agents, 
    analytics, 
    loading: agentsLoading, 
    createAgent, 
    updateAgent, 
    deleteAgent 
  } = useVoiceAgents();
  
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<VoiceAgent | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [_loadingContacts, setLoadingContacts] = useState(false);
  const { _toast } = useToast();

  useEffect(() => {
    async function fetchContacts() {
      setLoadingContacts(true);
      try {
        const response = await fetch('/api/v1/contacts?limit=100');
        if (!response.ok) {
          throw new Error('Erro ao buscar contatos');
        }
        const data = await response.json();
        const formattedContacts = data.contacts.map((contact: any) => ({
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
        }));
        setContacts(formattedContacts);
      } catch (error) {
        console.error('Erro ao buscar contatos:', error);
      } finally {
        setLoadingContacts(false);
      }
    }

    fetchContacts();
  }, []);

  const handleEditAgent = (agent: VoiceAgent) => {
    setEditingAgent(agent);
    setShowAgentDialog(true);
  };

  const handleNewAgent = () => {
    setEditingAgent(null);
    setShowAgentDialog(true);
  };

  const handleSaveAgent = async (data: CreateAgentData | UpdateAgentData) => {
    if (editingAgent) {
      return await updateAgent(editingAgent.id, data as UpdateAgentData);
    } else {
      return await createAgent(data as CreateAgentData);
    }
  };

  const handleCloseAgentDialog = (open: boolean) => {
    setShowAgentDialog(open);
    if (!open) {
      setEditingAgent(null);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 lg:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Chamadas de Voz</h2>
          <p className="text-muted-foreground">
            Gerencie suas chamadas de voz com IA
          </p>
        </div>
        <Button onClick={() => setShowBulkDialog(true)}>
          <PhoneCall className="mr-2 h-4 w-4" />
          Nova Campanha
        </Button>
      </div>

      <CallKPIDashboard metrics={metrics} loading={loading} />

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Bot className="h-4 w-4 mr-2" />
            Agentes de Voz
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Chamadas</CardTitle>
              <CardDescription>
                Todas as chamadas realizadas com filtros e paginação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CallHistoryTable limit={15} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <VoiceAgentKPIs 
            agents={agents} 
            analytics={analytics} 
            loading={agentsLoading} 
          />
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Agentes de Voz</CardTitle>
                <CardDescription>
                  Gerencie seus agentes de IA para chamadas de voz
                </CardDescription>
              </div>
              <Button onClick={handleNewAgent}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Agente
              </Button>
            </CardHeader>
            <CardContent>
              <VoiceAgentsTable
                agents={agents}
                loading={agentsLoading}
                onEdit={handleEditAgent}
                onDelete={deleteAgent}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <VoiceCallsAnalytics />
        </TabsContent>
      </Tabs>

      <BulkCallDialog 
        open={showBulkDialog} 
        onOpenChange={setShowBulkDialog}
        contacts={contacts}
      />

      <VoiceAgentDialog
        open={showAgentDialog}
        onOpenChange={handleCloseAgentDialog}
        agent={editingAgent}
        onSave={handleSaveAgent}
      />
    </div>
  );
}
