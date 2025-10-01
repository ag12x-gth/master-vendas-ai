// src/components/atendimentos/send-template-dialog.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Template, Contact } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SendTemplateDialogProps {
  children: React.ReactNode;
  templates: Template[];
  connectionId: string;
  contact: Contact;
}

export function SendTemplateDialog({ children, templates, connectionId, contact }: SendTemplateDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const { toast } = useToast();
  const router = useRouter();

  const selectedTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId);
  }, [selectedTemplateId, templates]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !contact || !connectionId) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Dados incompletos para iniciar a conversa.' });
      return;
    }
    setIsProcessing(true);

    try {
      const response = await fetch('/api/v1/conversations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          connectionId: connectionId,
          templateId: selectedTemplate.id,
          variableMappings: {}, // Simplified for this context
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Falha ao iniciar a conversa.');
      }
      
      toast({ title: 'Conversa Iniciada!', description: 'A mensagem foi enviada com sucesso.' });
      setIsOpen(false);
      router.push(`/atendimentos?conversationId=${result.conversationId}`);

    } catch (error) {
       toast({ variant: 'destructive', title: 'Erro ao Enviar', description: (error as Error).message });
    } finally {
        setIsProcessing(false);
    }
  }, [contact, connectionId, selectedTemplate, toast, router]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Iniciar Conversa com Modelo</DialogTitle>
            <DialogDescription>
              A janela de 24 horas para resposta livre expirou. Selecione um modelo aprovado para iniciar uma nova conversa com este contato.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
              <div className="space-y-2">
                  <Label htmlFor="template-select">Modelo de Mensagem</Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger id="template-select">
                          <SelectValue placeholder="Selecione um modelo..." />
                      </SelectTrigger>
                      <SelectContent>
                          {templates.filter(t => t.status === 'APPROVED' || t.status === 'APROVADO').map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>

              {selectedTemplate && (
                  <div className="p-4 border rounded-md bg-muted/50 text-sm">
                      <p className="whitespace-pre-wrap">{selectedTemplate.body}</p>
                  </div>
              )}
          </div>
          <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary" disabled={isProcessing}>Cancelar</Button></DialogClose>
              <Button type="submit" disabled={!selectedTemplateId || isProcessing}>
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Mensagem
              </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
