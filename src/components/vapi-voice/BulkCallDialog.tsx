'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useVapiCalls } from '@/hooks/useVapiCalls';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface BulkCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Array<{
    id: string;
    name: string;
    phone: string;
  }>;
  context?: string;
  onCallsInitiated?: () => void;
}

export function BulkCallDialog({
  open,
  onOpenChange,
  contacts,
  context = '',
  onCallsInitiated,
}: BulkCallDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Array<{ name: string; success: boolean; error?: string }>>([]);
  const [customContext, setCustomContext] = useState(context);
  const { initiateCall } = useVapiCalls();
  const { toast } = useToast();

  const handleBulkCall = async () => {
    if (!contacts || contacts.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    const totalCalls = contacts.length;
    const callResults: Array<{ name: string; success: boolean; error?: string }> = [];

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      const result = await initiateCall({
        phoneNumber: contact.phone,
        customerName: contact.name,
        context: customContext || `Campanha de chamadas em massa - ${contact.name}`,
        contactId: contact.id,
      });

      callResults.push({
        name: contact.name,
        success: result.success,
        error: result.error,
      });

      setProgress(((i + 1) / totalCalls) * 100);
      setResults([...callResults]);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setIsProcessing(false);

    const successCount = callResults.filter((r) => r.success).length;
    const failCount = callResults.filter((r) => !r.success).length;

    toast({
      title: 'Campanha de chamadas concluída',
      description: `${successCount} chamadas iniciadas com sucesso, ${failCount} falharam.`,
    });

    if (onCallsInitiated) {
      onCallsInitiated();
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setResults([]);
      setProgress(0);
      setCustomContext('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chamadas em Massa</DialogTitle>
          <DialogDescription>
            Iniciar campanha de chamadas para {contacts?.length || 0} contato(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Contexto da Chamada (opcional)
            </label>
            <Textarea
              placeholder="Ex: Campanha de vendas para produto X..."
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              disabled={isProcessing}
              rows={3}
            />
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progresso</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <p className="text-sm font-medium">Resultados:</p>
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm p-2 rounded-md bg-muted"
                >
                  <span>{result.name}</span>
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-4 w-4" />
                      <span className="text-xs">{result.error}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >
            {results.length > 0 ? 'Fechar' : 'Cancelar'}
          </Button>
          {results.length === 0 && (
            <Button
              onClick={handleBulkCall}
              disabled={isProcessing || !contacts || contacts.length === 0}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iniciar {contacts?.length || 0} Chamada(s)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
