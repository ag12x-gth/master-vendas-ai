'use client';

import { useState, useEffect, useMemo } from 'react';
import { Phone, MessageCircle, MessageSquare, Loader2, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { createToastNotifier } from '@/lib/toast-helper';
import type { Contact } from '@/lib/types';

interface CallResources {
  phoneNumbers: { phoneNumber: string; friendlyName: string }[];
  retellAgents: { id: string; name: string; isPublished: boolean }[];
  whatsappConnections: { id: string; name: string; phoneNumber: string | null }[];
  smsGateways: { id: string; name: string; provider: string }[];
}

interface CommunicationModalProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CommunicationChannel = 'voice' | 'whatsapp' | 'sms';

export function CommunicationModal({ contact, open, onOpenChange }: CommunicationModalProps) {
  const [resources, setResources] = useState<CallResources | null>(null);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [channel, setChannel] = useState<CommunicationChannel>('voice');
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('');

  const { toast } = useToast();
  const notify = useMemo(() => createToastNotifier(toast), [toast]);

  useEffect(() => {
    if (open) {
      fetchResources();
    }
  }, [open]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/voice/call-resources');
      if (!response.ok) throw new Error('Falha ao carregar recursos');
      const data: CallResources = await response.json();
      setResources(data);
      
      if (data.phoneNumbers.length > 0 && data.phoneNumbers[0]) {
        setSelectedPhoneNumber(data.phoneNumbers[0].phoneNumber);
      }
      if (data.retellAgents.length > 0 && data.retellAgents[0]) {
        setSelectedAgentId(data.retellAgents[0].id);
      }
      if (data.whatsappConnections.length > 0 && data.whatsappConnections[0]) {
        setSelectedConnectionId(data.whatsappConnections[0].id);
      }
      if (data.smsGateways.length > 0 && data.smsGateways[0]) {
        setSelectedGatewayId(data.smsGateways[0].id);
      }
    } catch (error) {
      notify.error('Erro', 'Falha ao carregar recursos de comunicação');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceCall = async () => {
    if (!contact) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/v1/voice/initiate-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: contact.phone,
          customerName: contact.name,
          contactId: contact.id,
          agentId: selectedAgentId,
          fromNumber: selectedPhoneNumber,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao iniciar chamada');
      }

      notify.success('Chamada iniciada!', `Ligando para ${contact.name}...`);
      onOpenChange(false);
    } catch (error) {
      notify.error('Erro', error instanceof Error ? error.message : 'Erro ao iniciar chamada');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWhatsApp = () => {
    notify.info('WhatsApp', 'Use a funcionalidade "Iniciar Conversa" para enviar mensagens via WhatsApp.');
    onOpenChange(false);
  };

  const handleSms = () => {
    notify.info('SMS', 'Use a funcionalidade de Campanhas SMS para enviar mensagens.');
    onOpenChange(false);
  };

  const handleSubmit = () => {
    switch (channel) {
      case 'voice':
        handleVoiceCall();
        break;
      case 'whatsapp':
        handleWhatsApp();
        break;
      case 'sms':
        handleSms();
        break;
    }
  };

  const canSubmit = () => {
    if (!contact) return false;
    switch (channel) {
      case 'voice':
        return !!selectedAgentId;
      case 'whatsapp':
        return !!selectedConnectionId;
      case 'sms':
        return !!selectedGatewayId;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-primary" />
            Comunicar com {contact?.name || 'Contato'}
          </DialogTitle>
          <DialogDescription>
            Escolha o canal e as configurações para entrar em contato
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label>Canal de Comunicação</Label>
              <RadioGroup
                value={channel}
                onValueChange={(value) => setChannel(value as CommunicationChannel)}
                className="grid grid-cols-3 gap-4"
              >
                <div>
                  <RadioGroupItem value="voice" id="voice" className="peer sr-only" />
                  <Label
                    htmlFor="voice"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Phone className="mb-3 h-6 w-6" />
                    <span className="text-sm font-medium">Ligar</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="whatsapp" id="whatsapp" className="peer sr-only" />
                  <Label
                    htmlFor="whatsapp"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <MessageCircle className="mb-3 h-6 w-6" />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="sms" id="sms" className="peer sr-only" />
                  <Label
                    htmlFor="sms"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <MessageSquare className="mb-3 h-6 w-6" />
                    <span className="text-sm font-medium">SMS</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {channel === 'voice' && (
              <>
                <div className="space-y-2">
                  <Label>Número de Origem</Label>
                  <Select value={selectedPhoneNumber} onValueChange={setSelectedPhoneNumber}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o número" />
                    </SelectTrigger>
                    <SelectContent>
                      {resources?.phoneNumbers.map((phone) => (
                        <SelectItem key={phone.phoneNumber} value={phone.phoneNumber}>
                          {phone.friendlyName} ({phone.phoneNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Agente de IA (Retell)</Label>
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o agente" />
                    </SelectTrigger>
                    <SelectContent>
                      {resources?.retellAgents.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhum agente publicado
                        </SelectItem>
                      ) : (
                        resources?.retellAgents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {resources?.retellAgents.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum agente Retell publicado encontrado. Publique um agente primeiro.
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p><strong>Destino:</strong> {contact?.phone}</p>
                </div>
              </>
            )}

            {channel === 'whatsapp' && (
              <div className="space-y-2">
                <Label>Conexão WhatsApp</Label>
                <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conexão" />
                  </SelectTrigger>
                  <SelectContent>
                    {resources?.whatsappConnections.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nenhuma conexão ativa
                      </SelectItem>
                    ) : (
                      resources?.whatsappConnections.map((conn) => (
                        <SelectItem key={conn.id} value={conn.id}>
                          {conn.name} {conn.phoneNumber && `(${conn.phoneNumber})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {channel === 'sms' && (
              <div className="space-y-2">
                <Label>Gateway SMS</Label>
                <Select value={selectedGatewayId} onValueChange={setSelectedGatewayId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    {resources?.smsGateways.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nenhum gateway ativo
                      </SelectItem>
                    ) : (
                      resources?.smsGateways.map((gw) => (
                        <SelectItem key={gw.id} value={gw.id}>
                          {gw.name} ({gw.provider})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isProcessing || loading || !canSubmit()}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {channel === 'voice' && 'Iniciar Chamada'}
            {channel === 'whatsapp' && 'Abrir WhatsApp'}
            {channel === 'sms' && 'Enviar SMS'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CommunicationButtonProps {
  contact: Contact;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  trigger?: React.ReactNode;
}

export function CommunicationButton({
  contact,
  variant = 'default',
  size = 'default',
  className,
  trigger,
}: CommunicationButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button
          variant={variant}
          size={size}
          className={className}
          onClick={() => setOpen(true)}
        >
          <PhoneCall className="h-4 w-4 mr-2" />
          {size !== 'icon' && 'Ligar'}
        </Button>
      )}

      <CommunicationModal contact={contact} open={open} onOpenChange={setOpen} />
    </>
  );
}
