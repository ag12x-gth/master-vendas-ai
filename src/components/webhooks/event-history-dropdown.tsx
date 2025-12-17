'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

interface WebhookEvent {
  id: string;
  event_type: string;
  source: string;
  processed_at: string | null;
  created_at: string;
  signature_valid: boolean;
  payload?: any;
}

interface EventHistoryDropdownProps {
  webhookConfigId?: string;
}

export function EventHistoryDropdown({ webhookConfigId: _webhookConfigId }: EventHistoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ treated: 0, untreated: 0 });

  useEffect(() => {
    if (isOpen) {
      loadEvents();
    }
  }, [isOpen]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/v1/webhooks/incoming/events?limit=50`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar eventos');
      }

      setEvents(data.data || []);
      const treated = (data.data || []).filter((e: WebhookEvent) => e.processed_at).length;
      const untreated = (data.data || []).filter((e: WebhookEvent) => !e.processed_at).length;
      setStats({ treated, untreated });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      console.error('Error loading webhook events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getCustomerName = (payload: any) => {
    // Parse if payload is string
    let data = payload;
    if (typeof payload === 'string') {
      try {
        data = JSON.parse(payload);
      } catch {
        return '-';
      }
    }

    // Try all possible customer name locations
    const name = 
      data?.customer?.name ||           // Grapfy: direct customer field
      data?.data?.customer?.name ||     // Nested in data
      data?.payload?.customer?.name ||  // Nested in payload
      data?.data?.name ||               // Lead created: name in data
      data?.name ||                     // Direct name field
      (data?.customer && typeof data.customer === 'string' ? data.customer : null) ||  // String customer
      '-';
    
    return name || '-';
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <ChevronDown className="h-4 w-4 transition-transform" />
          Histórico de Eventos
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="w-full mt-4">
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          {/* Stats */}
          <div className="flex gap-4 text-sm">
            <div>
              <span className="font-medium">✅ Processados:</span>
              <Badge variant="secondary" className="ml-2">
                {stats.treated}
              </Badge>
            </div>
            <div>
              <span className="font-medium">⏳ Pendentes:</span>
              <Badge variant="outline" className="ml-2">
                {stats.untreated}
              </Badge>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Events Table */}
          {!loading && !error && events.length > 0 && (
            <div className="overflow-x-auto">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map(event => (
                    <TableRow key={event.id} className="text-xs">
                      <TableCell className="font-mono">
                        {event.event_type}
                      </TableCell>
                      <TableCell>{getCustomerName(event.payload)}</TableCell>
                      <TableCell>{event.source}</TableCell>
                      <TableCell>
                        <Badge variant={event.processed_at ? 'default' : 'outline'}>
                          {event.processed_at ? 'Processado' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(event.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && !error && events.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum evento recebido ainda
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
