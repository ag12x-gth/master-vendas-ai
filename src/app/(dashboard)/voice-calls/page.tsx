'use client';

import { useVapiCalls } from '@/hooks/useVapiCalls';
import { CallKPIDashboard, CallHistoryTable } from '@/components/vapi-voice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function VoiceCallsPage() {
  const { metrics, calls, loading, refetch } = useVapiCalls(true);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Voice Calls</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <CallKPIDashboard metrics={metrics} loading={loading} />

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="completed">Concluídas</TabsTrigger>
          <TabsTrigger value="failed">Falhadas</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Chamadas</CardTitle>
              <CardDescription>
                Visualize todas as chamadas realizadas pelo sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CallHistoryTable calls={calls} loading={loading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chamadas Concluídas</CardTitle>
              <CardDescription>
                Chamadas que foram completadas com sucesso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CallHistoryTable
                calls={calls.filter((c) => c.status === 'completed')}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chamadas Falhadas</CardTitle>
              <CardDescription>
                Chamadas que não foram completadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CallHistoryTable
                calls={calls.filter((c) => c.status === 'failed')}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
