'use client';

import { useState, useMemo } from 'react';
import { Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRetellCalls } from '@/hooks/useRetellCalls';
import { useToast } from '@/hooks/use-toast';
import { createToastNotifier } from '@/lib/toast-helper';

interface CallButtonProps {
  contactId?: string;
  customerName: string;
  customerNumber: string;
  context?: string;
  conversationId?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  trigger?: React.ReactNode;
}

export function CallButton({
  contactId,
  customerName,
  customerNumber,
  context = '',
  conversationId,
  variant = 'default',
  size = 'default',
  className,
  trigger,
}: CallButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const { initiateCall } = useRetellCalls();
  const { toast } = useToast();
  const notify = useMemo(() => createToastNotifier(toast), [toast]);

  const handleInitiateCall = async () => {
    setIsInitiating(true);
    
    const result = await initiateCall({
      phoneNumber: customerNumber,
      customerName,
      contactId,
    });

    setIsInitiating(false);
    setShowConfirmDialog(false);

    if (result.success) {
      notify.success('Chamada iniciada!', `Ligando para ${customerName}...`);
    } else {
      notify.error('Erro ao iniciar chamada', result.error);
    }
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setShowConfirmDialog(true)}>
          {trigger}
        </div>
      ) : (
        <Button
          variant={variant}
          size={size}
          className={className}
          onClick={() => setShowConfirmDialog(true)}
        >
          <Phone className="h-4 w-4 mr-2" />
          {size !== 'icon' && 'Ligar'}
        </Button>
      )}

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Chamada</DialogTitle>
            <DialogDescription>
              Deseja iniciar uma chamada de voz com {customerName}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nome:</span>
              <span className="font-medium">{customerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Telefone:</span>
              <span className="font-medium">{customerNumber}</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isInitiating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleInitiateCall}
              disabled={isInitiating}
            >
              {isInitiating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iniciar Chamada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
