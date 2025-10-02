'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CallKPIDashboard } from '@/components/vapi-voice/CallKPIDashboard';
import { CallHistoryTable } from '@/components/vapi-voice/CallHistoryTable';
import { BulkCallDialog } from '@/components/vapi-voice/BulkCallDialog';
import { useVapiCalls } from '@/hooks/useVapiCalls';
import { Phone, PhoneCall, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function VoiceCallsPage() {
  const { metrics, loading } = useVapiCalls(true);
  const [showBulkDialog, setShowBulkDialog] = useState(false);

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
            Histórico Completo
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <Phone className="h-4 w-4 mr-2" />
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

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics em Desenvolvimento</CardTitle>
              <CardDescription>
                Gráficos e relatórios detalhados serão exibidos aqui
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Em breve...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BulkCallDialog open={showBulkDialog} onOpenChange={setShowBulkDialog} />
    </div>
  );
}
