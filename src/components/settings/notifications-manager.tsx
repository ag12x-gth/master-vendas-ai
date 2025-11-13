'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  MoreHorizontal,
  PlusCircle,
  Trash2,
  Edit,
  Loader2,
  Search,
  Bell,
  BellOff,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface NotificationAgent {
  id: string;
  name: string;
  connectionId: string;
  phoneNumber: string;
  eventTypes: string[];
  isActive: boolean;
  createdAt: string;
}

interface WhatsAppConnection {
  id: string;
  config_name: string;
  phoneNumberId: string;
  status?: string;
}

const EVENT_TYPE_LABELS = {
  new_meeting: 'Novo Agendamento',
  campaign_sent: 'Campanha Enviada',
  new_sale: 'Nova Venda',
};

export function NotificationsManager() {
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<NotificationAgent[]>([]);
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<NotificationAgent | null>(null);
  const [deleteAgent, setDeleteAgent] = useState<NotificationAgent | null>(null);
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [agentName, setAgentName] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/connections?limit=100');
      if (!res.ok) throw new Error('Falha ao buscar conexões.');
      const data = await res.json();
      setConnections(data.data || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao carregar conexões.',
      });
    }
  }, [toast]);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/v1/notification-agents?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao buscar agentes.');
      const data = await res.json();
      
      if (!Array.isArray(data.data)) {
        console.error('[NotificationsManager] Unexpected API response:', data);
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Formato de resposta inválido da API.',
        });
        setAgents([]);
        return;
      }
      
      setAgents(data.data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao carregar agentes.',
      });
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchAgents();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchAgents]);

  const handleOpenModal = (agent: NotificationAgent | null) => {
    setEditingAgent(agent);
    setAgentName(agent?.name || '');
    setConnectionId(agent?.connectionId || '');
    setPhoneNumber(agent?.phoneNumber || '');
    setEventTypes(agent?.eventTypes || []);
    setIsActive(agent?.isActive ?? true);
    setIsModalOpen(true);
  };

  const handleSaveAgent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!agentName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro de Validação',
        description: 'O nome do agente não pode estar vazio.',
      });
      return;
    }

    if (!connectionId) {
      toast({
        variant: 'destructive',
        title: 'Erro de Validação',
        description: 'Selecione uma conexão WhatsApp.',
      });
      return;
    }

    if (!phoneNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro de Validação',
        description: 'O número de telefone não pode estar vazio.',
      });
      return;
    }

    if (eventTypes.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erro de Validação',
        description: 'Selecione pelo menos um tipo de evento.',
      });
      return;
    }

    const agentData = {
      name: agentName,
      connectionId,
      phoneNumber,
      eventTypes,
      isActive,
    };

    const isEditing = !!editingAgent;
    const url = isEditing
      ? `/api/v1/notification-agents/${editingAgent.id}`
      : '/api/v1/notification-agents';
    const method = isEditing ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao salvar o agente.');
      }

      toast({
        title: `Agente ${isEditing ? 'Atualizado' : 'Criado'}!`,
        description: `O agente "${agentName}" foi salvo com sucesso.`,
      });
      await fetchAgents();
      setIsModalOpen(false);
      setEditingAgent(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: error instanceof Error ? error.message : 'Erro desconhecido.',
      });
    }
  };

  const handleDeleteAgent = async () => {
    if (!deleteAgent) return;

    try {
      const response = await fetch(`/api/v1/notification-agents/${deleteAgent.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Falha ao excluir o agente.');

      toast({
        title: 'Agente Excluído!',
        description: `O agente "${deleteAgent.name}" foi removido.`,
      });
      await fetchAgents();
      setDeleteAgent(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Excluir',
        description: error instanceof Error ? error.message : 'Erro desconhecido.',
      });
    }
  };

  const toggleEventType = (eventType: string) => {
    setEventTypes((prev) =>
      prev.includes(eventType)
        ? prev.filter((e) => e !== eventType)
        : [...prev, eventType]
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
          <div className="relative w-full sm:w-auto sm:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              className="pl-9 w-full sm:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button className="w-full sm:w-auto" onClick={() => handleOpenModal(null)}>
            <PlusCircle className="mr-2" />
            Criar Novo Agente
          </Button>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Eventos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : agents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Nenhum agente encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell className="font-mono text-xs">{agent.phoneNumber}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {agent.eventTypes.map((event) => (
                            <Badge key={event} variant="secondary">
                              {EVENT_TYPE_LABELS[event as keyof typeof EVENT_TYPE_LABELS] || event}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {agent.isActive ? (
                          <Badge variant="default" className="gap-1">
                            <Bell className="h-3 w-3" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <BellOff className="h-3 w-3" />
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => handleOpenModal(agent)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() => setDeleteAgent(agent)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAgent ? 'Editar Agente' : 'Criar Novo Agente'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAgent} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Nome do Agente</Label>
              <Input
                id="agent-name"
                placeholder="Ex: Equipe Comercial"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="connection">Conexão WhatsApp</Label>
              <Select value={connectionId} onValueChange={setConnectionId} required>
                <SelectTrigger id="connection">
                  <SelectValue placeholder="Selecione uma conexão" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.config_name} ({conn.phoneNumberId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone-number">Número de Telefone (Destino)</Label>
              <Input
                id="phone-number"
                placeholder="5511999999999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                Número que receberá as notificações (formato internacional sem +)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tipos de Eventos</Label>
              <div className="space-y-2">
                {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`event-${key}`}
                      checked={eventTypes.includes(key)}
                      onCheckedChange={() => toggleEventType(key)}
                    />
                    <label
                      htmlFor={`event-${key}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="is-active">Agente ativo</Label>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit">{editingAgent ? 'Salvar' : 'Criar Agente'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAgent} onOpenChange={(open) => !open && setDeleteAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agente &quot;{deleteAgent?.name}&quot; será
              excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAgent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
