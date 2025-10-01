// src/components/campaigns/create-sms-campaign-dialog.tsx
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ContactList, SmsGateway } from '@/lib/types';
import { Loader2, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface CreateSmsCampaignDialogProps {
  children: React.ReactNode;
  onSaveSuccess?: () => void;
}

export function CreateSmsCampaignDialog({ children, onSaveSuccess }: CreateSmsCampaignDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('');
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [sendNow, setSendNow] = useState(true);

  const [gateways, setSmsGateways] = useState<SmsGateway[]>([]);
  const [lists, setContactLists] = useState<ContactList[]>([]);
  
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const fetchPrereqs = async () => {
        try {
          const [gwRes, listsRes] = await Promise.all([
            fetch('/api/v1/sms-gateways'),
            fetch('/api/v1/lists'),
          ]);
          if (!gwRes.ok || !listsRes.ok) throw new Error('Falha ao carregar dados necessários.');
          
          const gwData = await gwRes.json();
          const listsData = await listsRes.json();

          setSmsGateways(gwData);
          setContactLists(listsData);

          if (gwData.length > 0) {
            setSelectedGatewayId(gwData[0].id);
          }
        } catch (error) {
          toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
        } finally {
          setIsLoading(false);
        }
      };
      fetchPrereqs();
    }
  }, [isOpen, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    let schedule = null;
    if (!sendNow && scheduleDate) {
      const [hours, minutes] = scheduleTime.split(':').map(Number);
      const scheduledDateTime = new Date(scheduleDate);
      if (hours !== undefined && minutes !== undefined) {
          scheduledDateTime.setHours(hours, minutes, 0, 0);
      }
      schedule = scheduledDateTime.toISOString();
    }

    const payload = {
      name,
      message,
      smsGatewayId: selectedGatewayId,
      contactListIds: selectedListIds,
      schedule,
    };

    try {
      const response = await fetch('/api/v1/campaigns/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Falha ao criar campanha SMS.');
      
      toast({ title: 'Sucesso!', description: result.message });
      setIsOpen(false);
      router.refresh();
      if (onSaveSuccess) onSaveSuccess();

    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Criar Campanha de SMS</DialogTitle>
           <DialogDescription>
            Configure e agende o envio da sua campanha de SMS.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label htmlFor="sms-campaign-name">Nome da Campanha</Label>
              <Input id="sms-campaign-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-message">Mensagem</Label>
              <Textarea id="sms-message" value={message} onChange={(e) => setMessage(e.target.value)} required placeholder="Sua mensagem aqui..." />
              <p className="text-xs text-muted-foreground">{message.length} caracteres</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-gateway">Gateway de Envio</Label>
              <Select value={selectedGatewayId} onValueChange={setSelectedGatewayId} required>
                <SelectTrigger id="sms-gateway"><SelectValue placeholder="Selecione um gateway" /></SelectTrigger>
                <SelectContent>
                  {gateways.map(gw => <SelectItem key={gw.id} value={gw.id}>{gw.name} ({gw.provider})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Listas de Contatos</Label>
              <Select value={selectedListIds[0]} onValueChange={(value) => setSelectedListIds([value])}>
                <SelectTrigger><SelectValue placeholder="Selecione uma lista..." /></SelectTrigger>
                <SelectContent>
                  {lists.map(list => <SelectItem key={list.id} value={list.id}>{list.name} ({list.contactCount || 0} contatos)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-base font-semibold">Agendamento</Label>
              <div className="flex items-center space-x-2">
                <Checkbox id="send-now-checkbox-sms" checked={sendNow} onCheckedChange={(checked) => setSendNow(!!checked)} />
                <Label htmlFor="send-now-checkbox-sms">Enviar Imediatamente</Label>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !scheduleDate && "text-muted-foreground", sendNow && 'opacity-50 cursor-not-allowed')} disabled={sendNow}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduleDate ? format(scheduleDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={scheduleDate} onSelect={setScheduleDate} initialFocus />
                  </PopoverContent>
                </Popover>
                <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full sm:w-auto" disabled={sendNow} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={isProcessing}>Cancelar</Button></DialogClose>
            <Button type="submit" disabled={isProcessing || isLoading || !selectedGatewayId || selectedListIds.length === 0}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Criar e Enviar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
