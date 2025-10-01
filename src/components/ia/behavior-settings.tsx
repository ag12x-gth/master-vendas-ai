
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
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
import { Save, Bot, Loader2, Share2, List, AlertTriangle } from 'lucide-react';
import type { Persona as Agent } from '@/lib/types';
import { Slider } from '../ui/slider';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface McpTool {
    name: string;
    description: string;
    input_schema?: {
        properties?: Record<string, any>;
        required?: string[];
    } | null;
}

export function BehaviorSettings({
  persona: agent,
  onSaveSuccess,
}: {
  persona: Agent | null;
  onSaveSuccess: (updatedAgent: Agent) => void;
}) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: agent?.name || '',
    systemPrompt: agent?.systemPrompt || '',
    provider: 'OPENAI', // Fixo como OpenAI
    model: agent?.model || 'gpt-4o-mini',
    credentialId: null,
    temperature: parseFloat(agent?.temperature || '0.7'),
    topP: parseFloat(agent?.topP || '0.9'),
    maxOutputTokens: agent?.maxOutputTokens || 2048,
    mcpServerUrl: agent?.mcpServerUrl || '',
    mcpServerHeaders: agent?.mcpServerHeaders ? JSON.stringify(agent.mcpServerHeaders, null, 2) : '',
  });

  const [availableTools, setAvailableTools] = useState<McpTool[]>([]);
  const [_isConnecting, _setIsConnecting] = useState(false);
  const [_connectionError, _setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    setFormData({
        name: agent?.name || '',
        systemPrompt: agent?.systemPrompt || '',
        provider: 'OPENAI',
        model: agent?.model || 'gpt-4o-mini',
        credentialId: null,
        temperature: parseFloat(agent?.temperature || '0.7'),
        topP: parseFloat(agent?.topP || '0.9'),
        maxOutputTokens: agent?.maxOutputTokens || 2048,
        mcpServerUrl: agent?.mcpServerUrl || '',
        mcpServerHeaders: agent?.mcpServerHeaders ? JSON.stringify(agent.mcpServerHeaders, null, 2) : '',
    });
    setAvailableTools([]);
  }, [agent]);

  const placeholderPrompt =
    "Você é o 'Zapito', o assistente virtual da Loja Master IA. Seu tom é amigável, prestativo e um pouco informal. NUNCA prometa descontos que não existam. Se você não souber a resposta, diga 'Não tenho certeza sobre isso, mas vou te transferir para um de nossos especialistas humanos.' Adicione aqui também informações da sua empresa, como horário de funcionamento, políticas de troca, etc.";

  const modelsByProvider = {
    OPENAI: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    ],
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string | null) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSliderChange = (name: string, value: number[]) => {
    setFormData((prev) => ({ ...prev, [name]: value[0] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const url = agent?.id ? `/api/v1/ia/personas/${agent.id}` : '/api/v1/ia/personas';
    const method = agent?.id ? 'PUT' : 'POST';
    
    let parsedHeaders = {};
    try {
        if (formData.mcpServerHeaders.trim()) {
            parsedHeaders = JSON.parse(formData.mcpServerHeaders);
        }
    } catch(error) {
        toast({ variant: 'destructive', title: 'Erro no JSON de Headers', description: 'O formato dos cabeçalhos é inválido.'});
        setIsSaving(false);
        return;
    }
    
    const { credentialId, ...payload } = formData;

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...payload,
            temperature: payload.temperature.toString(),
            topP: payload.topP.toString(),
            mcpServerUrl: payload.mcpServerUrl || null,
            mcpServerHeaders: parsedHeaders,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Falha ao salvar o agente.');
      }
      toast({
        title: 'Agente Salvo!',
        description: `O agente "${result.name}" foi salvo com sucesso.`,
      });
      onSaveSuccess(result);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: (error as Error).message,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                <Bot className="h-6 w-6" />
                Configurações Gerais do Agente
                </CardTitle>
                <CardDescription>
                Defina o nome, a personalidade, as instruções, o modelo de IA e as ferramentas externas para este agente.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 rounded-lg border p-4">
                     <h3 className="text-base font-semibold">Informações Básicas</h3>
                    <div className="space-y-2">
                        <Label htmlFor="persona-name">Nome do Agente</Label>
                        <Input id="persona-name" name="name" placeholder="Ex: Agente de Vendas" value={formData.name} onChange={handleInputChange} required />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="system-prompt" className="text-base font-semibold">
                        Instruções e Base de Conhecimento
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        Descreva como a IA deve se comportar e adicione aqui todo o conhecimento sobre sua empresa (horários, políticas, etc.).
                    </p>
                    <Textarea
                        id="system-prompt"
                        name="systemPrompt"
                        placeholder={placeholderPrompt}
                        className="min-h-[250px] text-base"
                        value={formData.systemPrompt || ''}
                        onChange={handleInputChange}
                    />
                </div>

                 <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="text-base font-semibold">Configuração do Modelo de IA</h3>
                    <div className="space-y-2">
                        <Label htmlFor="ai-model">Modelo</Label>
                        <Select name="model" value={formData.model} onValueChange={(value) => handleSelectChange('model', value)}>
                            <SelectTrigger id="ai-model"><SelectValue /></SelectTrigger>
                            <SelectContent>
                            {modelsByProvider.OPENAI.map(model => (
                                <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 pt-2">
                        <Label htmlFor="temperature">Temperatura: {formData.temperature}</Label>
                        <Slider id="temperature" name="temperature" min={0} max={1} step={0.1} value={[formData.temperature]} onValueChange={(value) => handleSliderChange('temperature', value)} />
                    </div>
                    <div className="space-y-2 pt-2">
                        <Label htmlFor="top-p">Top-p: {formData.topP}</Label>
                        <Slider id="top-p" name="topP" min={0} max={1} step={0.1} value={[formData.topP]} onValueChange={(value) => handleSliderChange('topP', value)} />
                    </div>
                    <div className="space-y-2 pt-2">
                        <Label htmlFor="max-tokens">Tamanho Máximo da Resposta (Tokens): {formData.maxOutputTokens}</Label>
                        <Slider id="max-tokens" name="maxOutputTokens" min={256} max={8192} step={256} value={[formData.maxOutputTokens || 2048]} onValueChange={(value) => handleSliderChange('maxOutputTokens', value)} />
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                            <Share2 className="h-5 w-5" />
                            Ferramentas Externas (MCP Server)
                        </CardTitle>
                        <CardDescription>
                            Conecte a um servidor MCP (Model Context Protocol) para dar ao agente acesso a ferramentas customizadas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="mcp-url">URL do Servidor MCP</Label>
                            <Input id="mcp-url" name="mcpServerUrl" placeholder="https://hook.seuservidor.com/mcp/..." value={formData.mcpServerUrl} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mcp-headers">Cabeçalhos (Headers) - Formato JSON</Label>
                            <Textarea id="mcp-headers" name="mcpServerHeaders" placeholder='{ "Authorization": "Bearer SEU_TOKEN" }' value={formData.mcpServerHeaders} onChange={handleInputChange} rows={3} />
                        </div>
                        {_connectionError && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4"/>
                                <AlertTitle>Erro na Conexão</AlertTitle>
                                <AlertDescription>{_connectionError}</AlertDescription>
                            </Alert>
                        )}
                        {availableTools.length > 0 && (
                            <div className="space-y-3 pt-4">
                                <h4 className="font-semibold flex items-center gap-2"><List className="h-5 w-5"/> Ferramentas Disponíveis</h4>
                                <div className="border rounded-md max-h-60 overflow-y-auto">
                                    {availableTools.map(tool => (
                                        <div key={tool.name} className="p-3 border-b last:border-b-0">
                                            <p className="font-semibold">{tool.name}</p>
                                            <p className="text-xs text-muted-foreground">{tool.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </CardContent>
            <CardFooter>
                <div className="flex justify-end w-full">
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Alterações do Agente
                </Button>
                </div>
            </CardFooter>
        </Card>
    </form>
  );
}
