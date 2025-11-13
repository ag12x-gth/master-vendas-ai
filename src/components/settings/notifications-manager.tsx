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
  X,
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

interface EnabledNotifications {
  dailyReport: boolean;
  weeklyReport: boolean;
  biweeklyReport: boolean;
  monthlyReport: boolean;
  biannualReport: boolean;
  newMeeting: boolean;
  newSale: boolean;
  campaignSent: boolean;
}

interface NotificationAgent {
  id: string;
  name: string;
  connectionId: string;
  description: string | null;
  enabledNotifications: EnabledNotifications;
  scheduleTime: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  groups: Array<{
    id: string;
    agentId: string;
    groupJid: string;
    isActive: boolean;
  }>;
  connection: {
    id: string;
    config_name: string;
    connectionType: string;
    status: string;
  };
}

interface WhatsAppConnection {
  id: string;
  config_name: string;
  phoneNumberId: string;
  status?: string;
  connectionType?: string;
}

const NOTIFICATION_LABELS = {
  dailyReport: 'Relatório Diário',
  weeklyReport: 'Relatório Semanal',
  biweeklyReport: 'Relatório Quinzenal',
  monthlyReport: 'Relatório Mensal',
  biannualReport: 'Relatório Semestral',
  newMeeting: 'Novo Agendamento',
  newSale: 'Nova Venda',
  campaignSent: 'Campanha Enviada',
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
  const [description, setDescription] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [groupJids, setGroupJids] = useState<string[]>([]);
  const [newGroupJid, setNewGroupJid] = useState('');
  const [enabledNotifications, setEnabledNotifications] = useState<EnabledNotifications>({
    dailyReport: false,
    weeklyReport: false,
    biweeklyReport: false,
    monthlyReport: false,
    biannualReport: false,
    newMeeting: false,
    newSale: false,
    campaignSent: false,
  });
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
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
    setDescription(agent?.description || '');
    setConnectionId(agent?.connectionId || '');
    setGroupJids(agent?.groups?.map(g => g.groupJid) || []);
    setNewGroupJid('');
    setEnabledNotifications(agent?.enabledNotifications || {
      dailyReport: false,
      weeklyReport: false,
      biweeklyReport: false,
      monthlyReport: false,
      biannualReport: false,
      newMeeting: false,
      newSale: false,
      campaignSent: false,
    });
    setScheduleTime(agent?.scheduleTime || '09:00');
    setTimezone(agent?.timezone || 'America/Sao_Paulo');
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

    if (groupJids.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erro de Validação',
        description: 'Adicione pelo menos um grupo WhatsApp.',
      });
      return;
    }

    const hasAtLeastOneNotification = Object.values(enabledNotifications).some(value => value === true);
    if (!hasAtLeastOneNotification) {
      toast({
        variant: 'destructive',
        title: 'Erro de Validação',
        description: 'Selecione pelo menos um tipo de notificação.',
      });
      return;
    }

    const agentData = {
      name: agentName,
      connectionId,
      description: description || undefined,
      groupJids,
      enabledNotifications,
      scheduleTime,
      timezone,
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

  const toggleNotification = (key: keyof EnabledNotifications) => {
    setEnabledNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const addGroupJid = () => {
    const trimmedJid = newGroupJid.trim();
    if (!trimmedJid) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'O JID do grupo não pode estar vazio.',
      });
      return;
    }

    if (groupJids.includes(trimmedJid)) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Este grupo já foi adicionado.',
      });
      return;
    }

    setGroupJids((prev) => [...prev, trimmedJid]);
    setNewGroupJid('');
  };

  const removeGroupJid = (jid: string) => {
    setGroupJids((prev) => prev.filter((g) => g !== jid));
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
                  <TableHead>Conexão</TableHead>
                  <TableHead>Grupos</TableHead>
                  <TableHead>Notificações</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : agents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Nenhum agente encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  agents.map((agent) => {
                    const enabledCount = Object.values(agent.enabledNotifications || {}).filter(Boolean).length;
                    return (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">{agent.name}</TableCell>
                        <TableCell className="text-sm">
                          {agent.connection?.config_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {agent.groups?.length || 0} {agent.groups?.length === 1 ? 'grupo' : 'grupos'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {enabledCount} {enabledCount === 1 ? 'notificação' : 'notificações'}
                          </Badge>
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
                    );
                  })
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
              <Label htmlFor="agent-name">Nome do Agente *</Label>
              <Input
                id="agent-name"
                placeholder="Ex: Equipe Comercial"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Input
                id="description"
                placeholder="Descreva o propósito deste agente"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="connection">Conexão WhatsApp (Baileys) *</Label>
              <Select value={connectionId} onValueChange={setConnectionId} required>
                <SelectTrigger id="connection">
                  <SelectValue placeholder="Selecione uma conexão" />
                </SelectTrigger>
                <SelectContent>
                  {connections
                    .filter((conn) => conn.connectionType === 'baileys')
                    .map((conn) => (
                      <SelectItem key={conn.id} value={conn.id}>
                        {conn.config_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Apenas conexões Baileys são suportadas
              </p>
            </div>

            <div className="space-y-2">
              <Label>Grupos WhatsApp *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="JID do grupo (ex: 123456789-1234567890@g.us)"
                  value={newGroupJid}
                  onChange={(e) => setNewGroupJid(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addGroupJid();
                    }
                  }}
                />
                <Button type="button" onClick={addGroupJid} size="icon">
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
              {groupJids.length > 0 && (
                <div className="space-y-2 mt-2">
                  {groupJids.map((jid) => (
                    <div
                      key={jid}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <span className="text-sm font-mono truncate flex-1">{jid}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-2"
                        onClick={() => removeGroupJid(jid)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Adicione os JIDs dos grupos que receberão as notificações
              </p>
            </div>

            <div className="space-y-3">
              <Label>Tipos de Notificações *</Label>
              <div className="space-y-2 border rounded-md p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Relatórios</p>
                {(['dailyReport', 'weeklyReport', 'biweeklyReport', 'monthlyReport', 'biannualReport'] as const).map((key) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`notification-${key}`}
                      checked={enabledNotifications[key]}
                      onCheckedChange={() => toggleNotification(key)}
                    />
                    <label
                      htmlFor={`notification-${key}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {NOTIFICATION_LABELS[key]}
                    </label>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Eventos</p>
                  {(['newMeeting', 'newSale', 'campaignSent'] as const).map((key) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`notification-${key}`}
                        checked={enabledNotifications[key]}
                        onCheckedChange={() => toggleNotification(key)}
                      />
                      <label
                        htmlFor={`notification-${key}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {NOTIFICATION_LABELS[key]}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-time">Horário de Envio</Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Fuso Horário</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Sao_Paulo">São Paulo (UTC-3)</SelectItem>
                    <SelectItem value="America/New_York">Nova York (UTC-5)</SelectItem>
                    <SelectItem value="Europe/London">Londres (UTC+0)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tóquio (UTC+9)</SelectItem>
                  </SelectContent>
                </Select>
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
