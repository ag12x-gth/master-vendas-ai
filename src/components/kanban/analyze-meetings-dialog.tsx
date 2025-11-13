'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Scan, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';

interface AnalyzeMeetingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funnelId: string;
}

interface AnalyzeResult {
  stats: {
    conversationsAnalyzed: number;
    meetingsDetected: number;
    leadsMoved: number;
    leadsAlreadyCorrect: number;
    errors: number;
  };
  details: Array<{
    contactName: string;
    scheduledTime: string;
    moved: boolean;
    reason: string;
  }>;
}

export function AnalyzeMeetingsDialog({ open, onOpenChange, funnelId }: AnalyzeMeetingsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/v1/kanbans/analyze-meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ boardId: funnelId }),
      });

      if (!response.ok) {
        throw new Error('Erro ao analisar conversas');
      }

      const data: AnalyzeResult = await response.json();
      setResult(data);

      toast({
        title: '✅ Análise concluída!',
        description: `${data.stats.meetingsDetected} agendamentos detectados, ${data.stats.leadsMoved} leads movidos.`,
      });
    } catch (error) {
      console.error('Erro ao analisar conversas:', error);
      toast({
        title: '❌ Erro ao analisar',
        description: 'Não foi possível analisar as conversas. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Analisar Agendamentos em Conversas
          </DialogTitle>
          <DialogDescription>
            {result
              ? 'Análise concluída! Veja os resultados abaixo.'
              : 'Esta funcionalidade analisará todas as conversas deste funil para detectar agendamentos de calls/reuniões que ainda não foram identificados.'}
          </DialogDescription>
        </DialogHeader>

        {!result && !loading && (
          <div className="py-6 space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">O que será feito:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Analisar TODAS as conversas deste funil</li>
                <li>Detectar agendamentos de calls/reuniões nas mensagens</li>
                <li>Mover leads automaticamente para o estágio "Call Agendada"</li>
                <li>Atualizar horários nas notas dos leads</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              ⚠️ Leads já no estágio correto terão seus horários atualizados, mas não serão movidos.
            </p>
          </div>
        )}

        {loading && (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analisando conversas...</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Conversas Analisadas</p>
                <p className="text-2xl font-bold">{result.stats.conversationsAnalyzed}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Agendamentos Detectados</p>
                <p className="text-2xl font-bold">{result.stats.meetingsDetected}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Leads Movidos</p>
                <p className="text-2xl font-bold">{result.stats.leadsMoved}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Já no Estágio Correto</p>
                <p className="text-2xl font-bold">{result.stats.leadsAlreadyCorrect}</p>
              </div>
            </div>

            {result.details.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Detalhes:</p>
                <ScrollArea className="h-[200px] rounded-md border p-3">
                  <div className="space-y-2">
                    {result.details.map((detail, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 text-sm p-2 rounded-md hover:bg-muted"
                      >
                        {detail.moved ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{detail.contactName}</p>
                          <p className="text-xs text-muted-foreground">
                            {detail.scheduledTime} • {detail.reason}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {result ? 'Fechar' : 'Cancelar'}
          </Button>
          {!result && (
            <Button onClick={handleAnalyze} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Scan className="mr-2 h-4 w-4" />
                  Iniciar Análise
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
