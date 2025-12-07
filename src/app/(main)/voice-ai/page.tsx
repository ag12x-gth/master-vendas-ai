'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVoiceAgents, VoiceAgent, CreateAgentData, UpdateAgentData } from '@/hooks/useVoiceAgents';
import { useToast } from '@/hooks/use-toast';
import { Phone, Bot, Clock, Plus, Edit, Power, Loader2, PhoneCall, PhoneOff } from 'lucide-react';
import { VoiceAgentDialog } from '@/components/voice-agents';

function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function unformatPhone(value: string): string {
  return value.replace(/\D/g, '');
}

type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'error';

export default function VoiceAIPage() {
  const { agents, loading, updateAgent, createAgent, fetchAgents } = useVoiceAgents();
  const { toast } = useToast();
  
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callError, setCallError] = useState<string>('');
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<VoiceAgent | null>(null);

  const outboundAgents = agents.filter(a => a.status === 'active' && a.type === 'outbound');

  const fetchRecentCalls = useCallback(async () => {
    setLoadingCalls(true);
    try {
      const response = await fetch('/api/v1/voice/calls?limit=10');
      if (response.ok) {
        const data = await response.json();
        setRecentCalls(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching calls:', err);
    } finally {
      setLoadingCalls(false);
    }
  }, []);

  useState(() => {
    fetchRecentCalls();
  });

  const makeCall = async () => {
    if (!selectedAgentId) {
      toast({ title: 'Erro', description: 'Selecione um agente', variant: 'destructive' });
      return;
    }
    
    const cleanPhone = unformatPhone(phoneNumber);
    if (cleanPhone.length < 10) {
      toast({ title: 'Erro', description: 'Número de telefone inválido', variant: 'destructive' });
      return;
    }

    setCallStatus('calling');
    setCallError('');

    try {
      const response = await fetch('/api/v1/voice/calls/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentId,
          toNumber: `+55${cleanPhone}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao iniciar chamada');
      }

      setCallStatus('ringing');
      toast({ title: 'Sucesso', description: 'Chamada iniciada com sucesso!' });
      
      setTimeout(() => {
        setCallStatus('idle');
        fetchRecentCalls();
      }, 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setCallStatus('error');
      setCallError(message);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(formatPhoneBR(e.target.value));
  };

  const toggleAgentStatus = async (agent: VoiceAgent) => {
    const newStatus = agent.status === 'active' ? 'inactive' : 'active';
    await updateAgent(agent.id, { status: newStatus });
  };

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

  const getCallStatusBadge = () => {
    switch (callStatus) {
      case 'calling':
        return <Badge className="bg-yellow-500 text-white animate-pulse">Discando...</Badge>;
      case 'ringing':
        return <Badge className="bg-blue-500 text-white animate-pulse">Chamando...</Badge>;
      case 'connected':
        return <Badge className="bg-green-500 text-white">Conectado</Badge>;
      case 'ended':
        return <Badge className="bg-gray-500 text-white">Encerrada</Badge>;
      case 'error':
        return <Badge className="bg-red-500 text-white">Erro</Badge>;
      default:
        return null;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Ativo</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500 hover:bg-gray-600 text-white">Inativo</Badge>;
      case 'ended':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Concluída</Badge>;
      case 'ongoing':
        return <Badge className="bg-green-500 hover:bg-green-600 text-white animate-pulse">Em andamento</Badge>;
      case 'failed':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Falha</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Phone className="h-7 w-7 text-primary" />
            Voice AI
          </h2>
          <p className="text-muted-foreground">
            Faça chamadas inteligentes com IA
          </p>
        </div>
      </div>

      <Card className="shadow-lg border-2 border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <PhoneCall className="h-5 w-5 text-primary" />
            Fazer Ligação Rápida
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Agente</label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um agente" />
                </SelectTrigger>
                <SelectContent>
                  {outboundAgents.length === 0 ? (
                    <SelectItem value="none" disabled>Nenhum agente outbound ativo</SelectItem>
                  ) : (
                    outboundAgents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          {agent.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone</label>
              <Input
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="(11) 99999-9999"
                className="text-lg"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <Button 
              onClick={makeCall}
              disabled={callStatus === 'calling' || callStatus === 'ringing' || !selectedAgentId}
              size="lg"
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-lg px-8"
            >
              {callStatus === 'calling' || callStatus === 'ringing' ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Ligando...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-5 w-5" />
                  Ligar Agora
                </>
              )}
            </Button>
            
            {callStatus !== 'idle' && (
              <div className="flex items-center gap-2">
                {getCallStatusBadge()}
                {callError && <span className="text-sm text-red-500">{callError}</span>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5" />
            Meus Agentes
          </CardTitle>
          <Button onClick={handleNewAgent} size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Novo Agente
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum agente criado</p>
              <Button onClick={handleNewAgent} variant="outline" className="mt-4">
                <Plus className="mr-1 h-4 w-4" />
                Criar primeiro agente
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map(agent => (
                <Card key={agent.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        <span className="font-medium truncate">{agent.name}</span>
                      </div>
                      {getStatusBadge(agent.status)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Badge variant="outline" className="text-xs">
                        {agent.type === 'inbound' ? 'Entrada' : agent.type === 'outbound' ? 'Saída' : 'Transferência'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAgent(agent)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant={agent.status === 'active' ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => toggleAgentStatus(agent)}
                        className={agent.status === 'active' ? '' : 'bg-green-600 hover:bg-green-700'}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Chamadas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCalls ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : recentCalls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma chamada recente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Data</th>
                    <th className="pb-3 font-medium">Agente</th>
                    <th className="pb-3 font-medium">Número</th>
                    <th className="pb-3 font-medium">Duração</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCalls.map(call => (
                    <tr key={call.id} className="border-b last:border-0">
                      <td className="py-3 text-sm">{formatDate(call.createdAt)}</td>
                      <td className="py-3 text-sm">
                        {agents.find(a => a.id === call.agentId)?.name || '-'}
                      </td>
                      <td className="py-3 text-sm font-mono">{call.toNumber}</td>
                      <td className="py-3 text-sm">{formatDuration(call.duration)}</td>
                      <td className="py-3">{getStatusBadge(call.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <VoiceAgentDialog
        open={showAgentDialog}
        onOpenChange={(open) => {
          setShowAgentDialog(open);
          if (!open) setEditingAgent(null);
        }}
        agent={editingAgent}
        onSave={handleSaveAgent}
      />
    </div>
  );
}
