'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { VoiceAgent, CreateAgentData, UpdateAgentData } from '@/hooks/useVoiceAgents';
import { Loader2 } from 'lucide-react';

interface VoiceAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: VoiceAgent | null;
  onSave: (data: CreateAgentData | UpdateAgentData) => Promise<VoiceAgent | null>;
}

const voiceOptions = [
  { value: 'cartesia-Hailey-Portugese-Brazilian', label: 'Hailey (Feminino PT-BR Nativo)' },
  { value: '11labs-Adrian', label: 'Adrian (Masculino Multilíngue)' },
  { value: '11labs-Rachel', label: 'Rachel (Feminino Multilíngue)' },
  { value: '11labs-Lily', label: 'Lily (Feminino Multilíngue)' },
  { value: '11labs-Brian', label: 'Brian (Masculino Multilíngue)' },
  { value: 'openai-Nova', label: 'Nova (Feminino OpenAI)' },
  { value: 'openai-Echo', label: 'Echo (Masculino OpenAI)' },
];

const modelOptions = [
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

export function VoiceAgentDialog({ open, onOpenChange, agent, onSave }: VoiceAgentDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'inbound' as 'inbound' | 'outbound' | 'transfer',
    systemPrompt: '',
    firstMessage: '',
    voiceId: 'cartesia-Hailey-Portugese-Brazilian',
    llmModel: 'gpt-4',
    temperature: 0.7,
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        type: agent.type,
        systemPrompt: agent.systemPrompt,
        firstMessage: agent.firstMessage || '',
        voiceId: agent.voiceId || 'pt-BR-FranciscaNeural',
        llmModel: agent.llmModel,
        temperature: agent.temperature,
        status: agent.status === 'archived' ? 'inactive' : agent.status,
      });
    } else {
      setFormData({
        name: '',
        type: 'inbound',
        systemPrompt: '',
        firstMessage: '',
        voiceId: 'cartesia-Hailey-Portugese-Brazilian',
        llmModel: 'gpt-4',
        temperature: 0.7,
        status: 'active',
      });
    }
  }, [agent, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data = agent
      ? {
          name: formData.name,
          type: formData.type,
          systemPrompt: formData.systemPrompt,
          firstMessage: formData.firstMessage || undefined,
          voiceId: formData.voiceId,
          llmModel: formData.llmModel,
          temperature: formData.temperature,
          status: formData.status,
        }
      : {
          name: formData.name,
          type: formData.type,
          systemPrompt: formData.systemPrompt,
          firstMessage: formData.firstMessage || undefined,
          voiceId: formData.voiceId,
          llmModel: formData.llmModel,
          temperature: formData.temperature,
        };

    const result = await onSave(data);
    setSaving(false);
    
    if (result) {
      onOpenChange(false);
    }
  };

  const isEditing = !!agent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Agente' : 'Novo Agente de Voz'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Atualize as configurações do agente de voz.'
                : 'Configure um novo agente de voz com IA.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Agente *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Suporte Técnico"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'inbound' | 'outbound' | 'transfer') =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">Receptivo (Inbound)</SelectItem>
                    <SelectItem value="outbound">Ativo (Outbound)</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isEditing && (
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'active' | 'inactive') =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="systemPrompt">Prompt do Sistema *</Label>
              <Textarea
                id="systemPrompt"
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                placeholder="Descreva o comportamento e personalidade do agente..."
                rows={4}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="firstMessage">Mensagem Inicial</Label>
              <Input
                id="firstMessage"
                value={formData.firstMessage}
                onChange={(e) => setFormData({ ...formData, firstMessage: e.target.value })}
                placeholder="Ex: Olá! Como posso ajudá-lo hoje?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="voiceId">Voz</Label>
                <Select
                  value={formData.voiceId}
                  onValueChange={(value) => setFormData({ ...formData, voiceId: value })}
                >
                  <SelectTrigger id="voiceId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceOptions.map((voice) => (
                      <SelectItem key={voice.value} value={voice.value}>
                        {voice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="llmModel">Modelo IA</Label>
                <Select
                  value={formData.llmModel}
                  onValueChange={(value) => setFormData({ ...formData, llmModel: value })}
                >
                  <SelectTrigger id="llmModel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Temperatura: {formData.temperature.toFixed(1)}</Label>
                <span className="text-xs text-muted-foreground">
                  {formData.temperature < 0.3
                    ? 'Mais preciso'
                    : formData.temperature > 0.7
                    ? 'Mais criativo'
                    : 'Balanceado'}
                </span>
              </div>
              <Slider
                value={[formData.temperature]}
                onValueChange={(values) => setFormData({ ...formData, temperature: values[0] ?? 0.7 })}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Criar Agente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
