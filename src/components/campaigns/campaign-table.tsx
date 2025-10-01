

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, FileText, GitBranch, MessageSquareText, SendIcon, Loader2, PlayCircle, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, List, LayoutGrid } from 'lucide-react';
import type { Campaign, Connection, SmsGateway, Template } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DateRangePicker } from '../ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';


type CampaignTableProps = {
    channel: 'WHATSAPP' | 'SMS';
}
type ViewType = 'grid' | 'table';

const statusConfig = {
    COMPLETED: { variant: 'default', text: 'Concluída', className: 'bg-green-500 hover:bg-green-600' },
    SENDING: { variant: 'outline', text: 'Enviando', className: 'border-blue-500 text-blue-500' },
    QUEUED: { variant: 'outline', text: 'Na Fila', className: 'border-blue-500 text-blue-500' },
    SCHEDULED: { variant: 'secondary', text: 'Agendada', className: 'bg-orange-500 hover:bg-orange-600 text-secondary-foreground' },
    PENDING: { variant: 'secondary', text: 'Pendente', className: 'bg-yellow-500 hover:bg-yellow-600 text-black' },
    FAILED: { variant: 'destructive', text: 'Falhou', className: '' },
    // Legacy statuses for graceful fallback
    Concluída: { variant: 'default', text: 'Concluída', className: 'bg-green-500 hover:bg-green-600' },
    Enviando: { variant: 'outline', text: 'Enviando', className: 'border-blue-500 text-blue-500' },
    Agendada: { variant: 'secondary', text: 'Agendada', className: 'bg-orange-500 hover:bg-orange-600 text-secondary-foreground' },
    Pendente: { variant: 'secondary', text: 'Pendente', className: 'bg-yellow-500 hover:bg-yellow-600 text-black' },
    Falhou: { variant: 'destructive', text: 'Falhou', className: '' },
} as const;


function CampaignCard({ campaign, onUpdate, onDelete, allTemplates }: { campaign: Campaign, onUpdate: () => void, onDelete: (id: string) => void, allTemplates: Template[] }) {
    const { toast } = useToast();
    const [isTriggering, setIsTriggering] = useState(false);
    const statusKey = campaign.status as keyof typeof statusConfig;
    const status = statusConfig[statusKey] || statusConfig.Agendada;
    const isSms = campaign.channel === 'SMS';
    const campaignDate = campaign.sentAt || campaign.scheduledAt;
    
    const connectionOrGatewayName = isSms ? campaign.smsGatewayName : campaign.connectionName;
    const template = !isSms && campaign.templateId ? allTemplates.find((t: Template) => t.id === campaign.templateId) : null;
    const templateName = template?.name || (isSms ? 'Mensagem de Texto' : 'Modelo não encontrado');
    
    const handleForceTrigger = async () => {
        setIsTriggering(true);
        try {
            const response = await fetch(`/api/v1/campaigns/${campaign.id}/trigger`, {
                method: 'POST'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao forçar o envio.');
            }
            toast({ title: 'Campanha Enviada!', description: `A campanha "${campaign.name}" foi enviada para a fila de processamento.` });
            onUpdate(); // Refresh the campaign list
        } catch (error) {
             toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
        } finally {
            setIsTriggering(false);
        }
    }
    
    const handleDelete = async () => {
        try {
            const response = await fetch(`/api/v1/campaigns/${campaign.id}`, {
                method: 'DELETE'
            });

            if (response.status !== 204) {
                 const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao excluir a campanha.');
            }
            toast({ title: 'Campanha Excluída!', description: `A campanha "${campaign.name}" foi removida.` });
            onDelete(campaign.id);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
        }
    }

    return (
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-bold line-clamp-2">{campaign.name}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Link href={`/campaigns/${campaign.id}/report`} passHref>
                  <DropdownMenuItem>
                    <FileText className="mr-2 h-4 w-4" />
                    Ver Relatório
                  </DropdownMenuItem>
                </Link>
                 {(['SCHEDULED', 'PENDING', 'QUEUED'].includes(campaign.status)) && (
                    <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleForceTrigger} disabled={isTriggering}>
                        {isTriggering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                        Forçar Envio Agora
                    </DropdownMenuItem>
                    </>
                 )}
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir a campanha &quot;{campaign.name}&quot;? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Sim, Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {campaignDate && <p className="text-xs text-muted-foreground pt-1">{new Date(campaignDate).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}</p>}
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
            <div className="space-y-2">
                <Badge variant={status.variant} className={cn(status.className, "mt-2")}>{status.text}</Badge>
                <div className="space-y-2 text-sm text-muted-foreground pt-2">
                    <div className="flex items-center gap-2">
                        {isSms ? <SendIcon className="h-4 w-4"/> : <GitBranch className="h-4 w-4"/>}
                        <span>{connectionOrGatewayName || (isSms ? 'Gateway Padrão' : 'Conexão Padrão')}</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <MessageSquareText className="h-4 w-4"/>
                        <span className="truncate">{templateName}</span>
                    </div>
                </div>
            </div>
             <div className={cn("grid text-center border-t pt-4", isSms ? "grid-cols-2" : "grid-cols-3")}>
                <div>
                    <p className="text-lg font-bold">{campaign.sent}</p>
                    <p className="text-xs text-muted-foreground">Enviadas</p>
                </div>
                {!isSms && (
                    <>
                    <div>
                        <p className="text-lg font-bold">{campaign.delivered}</p>
                        <p className="text-xs text-muted-foreground">Entregues</p>
                    </div>
                    <div>
                        <p className="text-lg font-bold">{campaign.read}</p>
                        <p className="text-xs text-muted-foreground">Lidas</p>
                    </div>
                    </>
                )}
                 {isSms && (
                    <div>
                        <p className="text-lg font-bold">{campaign.failed}</p>
                        <p className="text-xs text-muted-foreground">Falhas</p>
                    </div>
                )}
            </div>
        </CardContent>
        <CardFooter>
            {/* A data foi movida para o CardHeader */}
        </CardFooter>
      </Card>
    );
  }

export function CampaignTable({ channel }: CampaignTableProps) {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [smsGateways, setSmsGateways] = useState<SmsGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const isSms = channel === 'SMS';

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(12); // Padrão de 12 para grelha
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: addDays(new Date(), -30), to: new Date() });
  
  const filterOptions =
    channel === 'WHATSAPP'
      ? [
          { value: 'connection', label: 'Conexão WhatsApp' },
          { value: 'template', label: 'Modelo' },
        ]
      : [{ value: 'gateway', label: 'Gateway de SMS' }];
      
  const [filterType, setFilterType] = useState(filterOptions[0]!.value);
  const [selectedId, setSelectedId] = useState('all');
  const [view, setView] = useState<ViewType>('grid');

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
        const params = new URLSearchParams({ 
            channel,
            page: page.toString(),
            limit: limit.toString(),
        });
        if (dateRange?.from) params.set('startDate', dateRange.from.toISOString());
        if (dateRange?.to) params.set('endDate', dateRange.to.toISOString());

        if (filterType === 'connection' && selectedId !== 'all') params.set('connectionId', selectedId);
        if (filterType === 'template' && selectedId !== 'all') params.set('templateId', selectedId);
        if (filterType === 'gateway' && selectedId !== 'all') params.set('gatewayId', selectedId);

        const response = await fetch(`/api/v1/campaigns?${params.toString()}`);
        if (!response.ok) throw new Error('Falha ao buscar campanhas.');
        
        const data = await response.json();
        
        if (Array.isArray(data.data)) {
          setCampaigns(data.data);
          setTotalPages(data.totalPages || 1);
        } else {
           console.error("Formato de dados inesperado da API:", data);
          setCampaigns([]);
          setTotalPages(1);
        }

    } catch (error) {
        toast({ variant: "destructive", title: "Erro", description: (error as Error).message });
        setCampaigns([]); // Limpa os dados em caso de erro
    } finally {
        setLoading(false);
    }
  }, [toast, channel, page, limit, dateRange, filterType, selectedId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);
  
  useEffect(() => {
    const fetchPrerequisites = async () => {
        try {
            const [connRes, smsRes, tplRes] = await Promise.all([
                fetch('/api/v1/connections'),
                fetch('/api/v1/sms-gateways'),
                fetch('/api/v1/templates'),
            ]);
            if (!connRes.ok || !smsRes.ok || !tplRes.ok) throw new Error('Falha ao carregar filtros.');
            const connData = await connRes.json();
            const smsData = await smsRes.json();
            const tplData = await tplRes.json();
            setConnections(connData);
            setSmsGateways(smsData);
            setAllTemplates(tplData);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
        }
    };
    fetchPrerequisites();
  }, [toast]);


  const handleFilterTypeChange = (type: string) => {
    setFilterType(type);
    setSelectedId('all'); // Reset selection when type changes
  };

  const handleCampaignDeleted = (campaignId: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== campaignId));
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="col-span-full flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (campaigns.length === 0) {
      return (
        <div className="col-span-full text-center py-16 text-muted-foreground">
          <p>Nenhuma campanha encontrada para os filtros selecionados.</p>
        </div>
      );
    }

    if (view === 'grid') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {campaigns.map(campaign => (
            <CampaignCard key={campaign.id} campaign={campaign} onUpdate={fetchCampaigns} onDelete={handleCampaignDeleted} allTemplates={allTemplates} />
          ))}
        </div>
      );
    }

    return (
        <div className="border rounded-lg w-full overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data de Envio</TableHead>
                        <TableHead>Enviadas</TableHead>
                        {!isSms && <TableHead>Entregues</TableHead>}
                        {!isSms && <TableHead>Lidas</TableHead>}
                        {isSms && <TableHead>Falhas</TableHead>}
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {campaigns.map(campaign => {
                        const statusKey = campaign.status as keyof typeof statusConfig;
                        const status = statusConfig[statusKey] || statusConfig.Agendada;
                        const campaignDate = campaign.sentAt || campaign.scheduledAt;
                        const isSms = campaign.channel === 'SMS';
                        return (
                            <TableRow key={campaign.id}>
                                <TableCell className="font-medium">{campaign.name}</TableCell>
                                <TableCell><Badge variant={status.variant} className={cn(status.className)}>{status.text}</Badge></TableCell>
                                <TableCell>{campaignDate ? new Date(campaignDate).toLocaleString('pt-BR') : '-'}</TableCell>
                                <TableCell>{campaign.sent}</TableCell>
                                {!isSms && <TableCell>{campaign.delivered}</TableCell>}
                                {!isSms && <TableCell>{campaign.read}</TableCell>}
                                {isSms && <TableCell>{campaign.failed}</TableCell>}
                                <TableCell className="text-right">
                                    <Link href={`/campaigns/${campaign.id}/report`}>
                                        <Button variant="outline" size="sm">Ver Relatório</Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
  };


  return (
    <div className="space-y-4">
       <Card>
        <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
                    <div className="xl:col-span-1">
                        <Label>Período</Label>
                        <DateRangePicker onDateChange={setDateRange} initialDate={dateRange} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 xl:col-span-2">
                        <div>
                            <Label htmlFor="filter-type">Filtrar por</Label>
                            <Select value={filterType} onValueChange={handleFilterTypeChange}>
                                <SelectTrigger id="filter-type">
                                    <SelectValue placeholder="Selecione um tipo de filtro" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filterOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="filter-value">Valor</Label>
                            <Select value={selectedId} onValueChange={setSelectedId} disabled={filterType === 'all'}>
                                <SelectTrigger id="filter-value">
                                    <SelectValue placeholder="Selecione um valor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {filterType === 'connection' && connections.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.config_name}</SelectItem>
                                    ))}
                                    {filterType === 'template' && allTemplates.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                    {filterType === 'gateway' && smsGateways.map(g => (
                                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="flex items-end justify-end gap-2">
                         <div className="space-y-2">
                            <Label>Visualização</Label>
                            <div className="flex items-center gap-2">
                                <Button variant={view === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setView('grid')}>
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                                <Button variant={view === 'table' ? 'default' : 'outline'} size="icon" onClick={() => setView('table')}>
                                    <List className="h-4 w-4" />
                                </Button>
                            </div>
                         </div>
                    </div>
            </div>
        </CardContent>
       </Card>
      
       <div className="mt-4">
        {renderContent()}
       </div>

       {totalPages > 1 && (
         <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
                Página {page} de {totalPages}.
            </div>
            <div className="flex items-center gap-2">
                 <Select value={limit.toString()} onValueChange={(value) => {setLimit(parseInt(value, 10)); setPage(1);}}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {[12, 24, 48, 96].map(val => (
                             <SelectItem key={val} value={val.toString()}>{val} por página</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setPage(1)} disabled={page === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => setPage(totalPages)} disabled={page === totalPages}><ChevronsRight className="h-4 w-4" /></Button>
            </div>
         </div>
       )}
    </div>
  );
}
