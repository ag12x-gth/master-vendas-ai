'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import type { KanbanCard } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Phone, Mail, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface EditLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: KanbanCard;
  onSave: (leadId: string, data: { title?: string; value?: number; notes?: string }) => Promise<void>;
}

export function EditLeadDialog({ open, onOpenChange, card, onSave }: EditLeadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: card.title || '',
    value: Number(card.value) || 0,
    notes: card.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(card.id, formData);
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
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Interesse em consultoria"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                type="number"
                min="0"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Anotações</Label>
              <Textarea
                id="notes"
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Anotações sobre o lead..."
              />
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
}

export function ViewLeadDialog({ open, onOpenChange, card }: ViewLeadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Detalhes do Lead</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Informações do Contato</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium min-w-[100px]">Nome:</span>
                  <span>{card.contact?.name || 'Não informado'}</span>
                </div>
                {card.contact?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{card.contact.phone}</span>
                  </div>
                )}
                {card.contact?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{card.contact.email}</span>
                  </div>
                )}
              </div>
            </div>

            {card.contact?.tags && card.contact.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {card.contact.tags.map((tag: any) => (
                    <Badge key={tag.id} variant="outline" style={{ backgroundColor: tag.color }}>
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-2">Informações do Lead</h3>
              <div className="space-y-2 text-sm">
                {card.title && (
                  <div>
                    <span className="font-medium">Título:</span> {card.title}
                  </div>
                )}
                {card.value && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Valor:</span> 
                    <span>R$ {Number(card.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Criado em:</span>
                  <span>{card.createdAt ? format(new Date(card.createdAt), 'dd/MM/yyyy HH:mm') : 'N/A'}</span>
                </div>
              </div>
            </div>

            {card.notes && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Anotações</h3>
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  {card.notes}
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
