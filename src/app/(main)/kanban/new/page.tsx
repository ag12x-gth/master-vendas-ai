'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';

type StageType = 'NEUTRAL' | 'WIN' | 'LOSS';

interface Stage {
  id: string;
  title: string;
  type: StageType;
}

interface FunnelType {
  value: 'LEAD_CAPTURE' | 'SALES' | 'CUSTOMER_SUCCESS' | 'RETENTION';
  label: string;
  description: string;
}

const FUNNEL_TYPES: FunnelType[] = [
  { value: 'LEAD_CAPTURE', label: 'Captação de Leads', description: 'Para capturar e qualificar novos leads' },
  { value: 'SALES', label: 'Vendas', description: 'Para gerenciar o processo de vendas' },
  { value: 'CUSTOMER_SUCCESS', label: 'Customer Success', description: 'Para acompanhar clientes ativos' },
  { value: 'RETENTION', label: 'Retenção', description: 'Para evitar cancelamentos e reter clientes' },
];

export default function NewFunnelPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [funnelName, setFunnelName] = useState('');
  const [funnelType, setFunnelType] = useState<string>('');
  const [objective, setObjective] = useState('');
  const [stages, setStages] = useState<Stage[]>([
    { id: uuidv4(), title: 'Novo Lead', type: 'NEUTRAL' },
    { id: uuidv4(), title: 'Qualificado', type: 'NEUTRAL' },
    { id: uuidv4(), title: 'Proposta Enviada', type: 'NEUTRAL' },
    { id: uuidv4(), title: 'Fechado (Ganho)', type: 'WIN' },
    { id: uuidv4(), title: 'Perdido', type: 'LOSS' },
  ]);

  const addStage = () => {
    setStages([...stages, { id: uuidv4(), title: '', type: 'NEUTRAL' }]);
  };

  const removeStage = (id: string) => {
    if (stages.length <= 1) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'É necessário pelo menos um estágio no funil'
      });
      return;
    }
    setStages(stages.filter(s => s.id !== id));
  };

  const updateStage = (id: string, field: keyof Stage, value: string) => {
    setStages(stages.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!funnelName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nome do funil é obrigatório'
      });
      return;
    }

    if (stages.some(s => !s.title.trim())) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Todos os estágios precisam ter um título'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/kanbans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: funnelName,
          funnelType: funnelType || null,
          objective: objective || null,
          stages
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao criar funil');
      }

      const newFunnel = await response.json();

      toast({
        title: 'Sucesso!',
        description: 'Funil criado com sucesso'
      });

      router.push(`/kanban/${newFunnel.id}`);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: (error as Error).message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <Link href="/kanban">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Funis
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Funil Kanban</CardTitle>
          <CardDescription>
            Configure seu funil de vendas, captação de leads ou qualquer outro processo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Funil *</Label>
              <Input
                id="name"
                placeholder="Ex: Pipeline de Vendas"
                value={funnelName}
                onChange={(e) => setFunnelName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="funnelType">Tipo de Funil (opcional)</Label>
              <Select value={funnelType} onValueChange={setFunnelType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de funil..." />
                </SelectTrigger>
                <SelectContent>
                  {FUNNEL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {funnelType && (
                <p className="text-sm text-muted-foreground">
                  {FUNNEL_TYPES.find(t => t.value === funnelType)?.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective">Objetivo (opcional)</Label>
              <Input
                id="objective"
                placeholder="Ex: Aumentar conversão em 20%"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Estágios do Funil *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStage}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Estágio
                </Button>
              </div>

              <div className="space-y-3">
                {stages.map((stage, index) => (
                  <div key={stage.id} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder={`Estágio ${index + 1}`}
                        value={stage.title}
                        onChange={(e) => updateStage(stage.id, 'title', e.target.value)}
                        required
                      />
                    </div>
                    <Select
                      value={stage.type}
                      onValueChange={(value: StageType) => updateStage(stage.id, 'type', value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEUTRAL">Neutro</SelectItem>
                        <SelectItem value="WIN">Vitória</SelectItem>
                        <SelectItem value="LOSS">Perda</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStage(stage.id)}
                      disabled={stages.length <= 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Link href="/kanban">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Funil'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
