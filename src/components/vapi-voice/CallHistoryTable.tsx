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
import { Eye } from 'lucide-react';
import { CallStatusBadge } from './CallStatusBadge';
import { CallDetailsDialog } from './CallDetailsDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VapiCall } from '@/hooks/useVapiCalls';

interface CallHistoryTableProps {
  calls: VapiCall[];
  loading?: boolean;
}

export function CallHistoryTable({ calls, loading }: CallHistoryTableProps) {
  const [selectedCall, setSelectedCall] = useState<VapiCall | null>(null);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando chamadas...</p>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">Nenhuma chamada registrada</p>
        <p className="text-sm text-muted-foreground mt-1">
          As chamadas realizadas aparecerão aqui
        </p>
      </div>
    );
  }

  return (
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

      {selectedCall && (
        <CallDetailsDialog
          open={!!selectedCall}
          onOpenChange={(open) => !open && setSelectedCall(null)}
          call={selectedCall}
        />
      )}
    </>
  );
}
