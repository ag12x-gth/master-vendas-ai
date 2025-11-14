'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import type { KanbanCard } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Phone, Mail, Calendar, DollarSign, MessageCircle, Edit2, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const editLeadSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(100, 'Título muito longo'),
  value: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val))) {
        return undefined;
      }
      return Number(val);
    },
    z.number().min(0, 'Valor deve ser positivo').optional()
  ),
  notes: z.string().max(1000, 'Anotações muito longas').optional(),
});

type EditLeadFormData = z.infer<typeof editLeadSchema>;

interface EditLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: KanbanCard;
  onSave: (leadId: string, data: { title?: string; value?: number | null; notes?: string }) => Promise<void>;
}

export function EditLeadDialog({ open, onOpenChange, card, onSave }: EditLeadDialogProps) {
  const [loading, setLoading] = useState(false);
  
  const form = useForm<EditLeadFormData>({
    resolver: zodResolver(editLeadSchema),
    defaultValues: {
      title: card.title || '',
      value: (card.value !== null && card.value !== undefined) ? Number(card.value) : undefined,
      notes: card.notes || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: card.title || '',
        value: (card.value !== null && card.value !== undefined) ? Number(card.value) : undefined,
        notes: card.notes || '',
      });
    }
  }, [open, card, form]);

  const handleSubmit = async (data: EditLeadFormData) => {
    setLoading(true);
    try {
      const submitData = {
        title: data.title,
        value: data.value === undefined ? null : data.value,
        notes: data.notes || undefined,
      };
      await onSave(card.id, submitData);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Lead</DialogTitle>
          <DialogDescription>
            Atualize as informações do lead {card.contact?.name || 'sem nome'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                {...form.register('title')}
                placeholder="Ex: Interesse em consultoria"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                type="number"
                min="0"
                step="0.01"
                {...form.register('value', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {form.formState.errors.value && (
                <p className="text-sm text-destructive">{form.formState.errors.value.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Anotações</Label>
              <Textarea
                id="notes"
                rows={4}
                {...form.register('notes')}
                placeholder="Anotações sobre o lead..."
              />
              {form.formState.errors.notes && (
                <p className="text-sm text-destructive">{form.formState.errors.notes.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: KanbanCard;
  onConfirm: (leadId: string) => Promise<void>;
}

export function DeleteLeadDialog({ open, onOpenChange, card, onConfirm }: DeleteLeadDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(card.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao excluir lead:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Lead</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o lead <strong>{card.contact?.name || 'sem nome'}</strong>?
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={loading} className="bg-destructive hover:bg-destructive/90">
            {loading ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface ViewLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: KanbanCard;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ViewLeadDialog({ open, onOpenChange, card, onEdit, onDelete }: ViewLeadDialogProps) {
  const handleWhatsApp = () => {
    if (card.contact?.phone) {
      const cleanPhone = card.contact.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Detalhes do Lead</DialogTitle>
          <DialogDescription>
            Visualize todas as informações e histórico do lead
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">Informações do Contato</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium min-w-[100px]">Nome:</span>
                    <span className="text-muted-foreground">{card.contact?.name || 'Não informado'}</span>
                  </div>
                  {card.contact?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{card.contact.phone}</span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="ml-auto h-7 text-xs"
                        onClick={handleWhatsApp}
                      >
                        <MessageCircle className="h-3 w-3 mr-1" />
                        Abrir WhatsApp
                      </Button>
                    </div>
                  )}
                  {card.contact?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{card.contact.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {card.contact?.tags && card.contact.tags.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {card.contact.tags.map((tag: any) => (
                        <Badge key={tag.id} variant="outline" style={{ backgroundColor: tag.color }}>
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />
              
              <div>
                <h3 className="text-sm font-semibold mb-3">Informações do Lead</h3>
                <div className="space-y-3 text-sm">
                  {card.title && (
                    <div>
                      <span className="font-medium">Título:</span> 
                      <span className="text-muted-foreground ml-2">{card.title}</span>
                    </div>
                  )}
                  {(card.value !== null && card.value !== undefined) && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Valor:</span> 
                      <span className="text-muted-foreground">
                        R$ {Number(card.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Criado em:</span>
                    <span className="text-muted-foreground">
                      {card.createdAt ? format(new Date(card.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {card.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Anotações</h3>
                    <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md whitespace-pre-wrap">
                      {card.notes}
                    </div>
                  </div>
                </>
              )}

              <Separator />
              
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Linha do Tempo
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="relative flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <div className="h-full w-0.5 bg-border mt-1" />
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium">Lead criado</p>
                      <p className="text-xs text-muted-foreground">
                        {card.createdAt ? format(new Date(card.createdAt), "dd/MM/yyyy 'às' HH:mm") : 'N/A'}
                      </p>
                    </div>
                  </div>
                  {card.updatedAt && card.updatedAt !== card.createdAt && (
                    <div className="flex gap-3">
                      <div className="relative flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Última atualização</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(card.updatedAt), "dd/MM/yyyy 'às' HH:mm")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="sm:flex-1">
            Fechar
          </Button>
          {onDelete && (
            <Button 
              variant="destructive" 
              onClick={() => {
                onOpenChange(false);
                onDelete();
              }}
              className="sm:flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          )}
          {onEdit && (
            <Button 
              onClick={() => {
                onOpenChange(false);
                onEdit();
              }}
              className="sm:flex-1"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AddMeetingTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: KanbanCard;
  onSave: (leadId: string, data: { notes?: string }) => Promise<void>;
}

export function AddMeetingTimeDialog({ open, onOpenChange, card, onSave }: AddMeetingTimeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [meetingTime, setMeetingTime] = useState('');
  
  const existingMeetingTime = card.notes?.match(/📅 Reunião agendada:\s*(.+)/)?.[1] || '';
  
  useEffect(() => {
    if (open) {
      setMeetingTime(existingMeetingTime);
    }
  }, [open, existingMeetingTime]);

  const handleSave = async () => {
    if (!meetingTime.trim()) {
      return;
    }

    setLoading(true);
    try {
      const currentNotes = card.notes || '';
      const normalizedNote = `📅 Reunião agendada: ${meetingTime.trim()}`;
      
      let updatedNotes: string;
      if (/📅 Reunião agendada:/i.test(currentNotes)) {
        updatedNotes = currentNotes.replace(/📅 Reunião agendada:.*?(\n|$)/i, `${normalizedNote}\n`);
      } else {
        updatedNotes = currentNotes ? `${normalizedNote}\n\n${currentNotes}` : normalizedNote;
      }
      
      await onSave(card.id, { notes: updatedNotes.trim() });
      onOpenChange(false);
      setMeetingTime('');
    } catch (error) {
      console.error('Erro ao salvar horário da reunião:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {existingMeetingTime ? 'Editar Horário da Reunião' : 'Adicionar Horário da Reunião'}
          </DialogTitle>
          <DialogDescription>
            Digite o horário da call/reunião agendada com {card.contact?.name || 'este lead'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="meetingTime">Horário da Reunião</Label>
            <Input
              id="meetingTime"
              value={meetingTime}
              onChange={(e) => setMeetingTime(e.target.value)}
              placeholder="Ex: segunda 15h, terça às 14h30, 14h"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && meetingTime.trim()) {
                  handleSave();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Exemplos: &quot;segunda 15h&quot;, &quot;terça às 14h30&quot;, &quot;14h&quot;, &quot;quinta-feira 16h&quot;
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!meetingTime.trim() || loading}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
