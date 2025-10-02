'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CallStatusBadge } from './CallStatusBadge';
import { Clock, User, Phone, Calendar, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CallDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  call: {
    id: string;
    vapiCallId: string;
    customerName: string;
    customerNumber: string;
    status: 'initiated' | 'ringing' | 'in_progress' | 'completed' | 'failed';
    startedAt: string;
    endedAt?: string;
    duration?: number;
    summary?: string;
    resolved?: boolean;
    nextSteps?: string;
  };
}

export function CallDetailsDialog({ open, onOpenChange, call }: CallDetailsDialogProps) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}min ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Chamada</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[600px] pr-4">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{call.customerName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{call.customerNumber}</span>
                </div>
              </div>
              <CallStatusBadge status={call.status} />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Início</span>
                </div>
                <p className="text-sm font-medium">{formatDate(call.startedAt)}</p>
              </div>

              {call.endedAt && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Término</span>
                  </div>
                  <p className="text-sm font-medium">{formatDate(call.endedAt)}</p>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Duração</span>
                </div>
                <p className="text-sm font-medium">{formatDuration(call.duration)}</p>
              </div>

              {call.resolved !== undefined && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {call.resolved ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span>Resolução</span>
                  </div>
                  <p className="text-sm font-medium">
                    {call.resolved ? 'Resolvido' : 'Não Resolvido'}
                  </p>
                </div>
              )}
            </div>

            {call.summary && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4" />
                    <span>Resumo da Chamada</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {call.summary}
                  </p>
                </div>
              </>
            )}

            {call.nextSteps && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <AlertCircle className="h-4 w-4" />
                    <span>Próximos Passos</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {call.nextSteps}
                  </p>
                </div>
              </>
            )}

            <Separator />
            <div className="text-xs text-muted-foreground">
              ID da Chamada: {call.vapiCallId}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
