'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { CallStatusBadge } from './CallStatusBadge';
import { CallDetailsDialog } from './CallDetailsDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VapiCall } from '@/hooks/useVapiCalls';
import { useVapiHistory, HistoryFilters } from '@/hooks/useVapiHistory';

interface CallHistoryTableProps {
  limit?: number;
}

export function CallHistoryTable({ limit = 10 }: CallHistoryTableProps) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<HistoryFilters>({
    status: 'all',
    search: '',
  });
  const [selectedCall, setSelectedCall] = useState<VapiCall | null>(null);

  const { calls, pagination, loading } = useVapiHistory(page, limit, filters);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value });
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setFilters({ ...filters, status: value });
    setPage(1);
  };

  if (loading && calls.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando chamadas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={filters.search || ''}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filters.status || 'all'} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="completed">Concluída</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
            <SelectItem value="failed">Falhou</SelectItem>
            <SelectItem value="initiated">Iniciada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {calls.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md">
          <p className="text-muted-foreground">Nenhuma chamada encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filters.search || filters.status !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'As chamadas realizadas aparecerão aqui'}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell className="font-medium">{call.customerName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {call.customerNumber}
                    </TableCell>
                    <TableCell>
                      <CallStatusBadge status={call.status} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(call.startedAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDuration(call.duration)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCall(call)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {pagination.page} de {pagination.totalPages} 
                <span className="ml-2">({pagination.totalCount} chamadas)</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={!pagination.hasPrev || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!pagination.hasNext || loading}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedCall && (
        <CallDetailsDialog
          open={!!selectedCall}
          onOpenChange={(open) => !open && setSelectedCall(null)}
          call={selectedCall}
        />
      )}
    </div>
  );
}
