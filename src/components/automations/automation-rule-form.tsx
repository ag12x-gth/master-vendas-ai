
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tag, ContactList, User, AutomationRule, AutomationCondition, AutomationAction, Connection } from '@/lib/types';
import { ContactMultiSelect } from '../contacts/contact-multi-select';

interface AutomationRuleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleToEdit?: AutomationRule | null;
  onSaveSuccess: () => void;
}

const eventTriggers = [
  { value: 'new_message_received', label: 'Nova Mensagem Recebida' },
  { value: 'conversation_opened', label: 'Conversa Aberta' },
  { value: 'conversation_created', label: 'Conversa Criada' },
  { value: 'conversation_updated', label: 'Conversa Atualizada' },
];

const conditionTypes = [
    { value: 'message_content', label: 'Conteúdo da Mensagem' },
    { value: 'contact_tag', label: 'Tag do Contato' },
    { value: 'contact_list', label: 'Lista do Contato' },
    { value: 'conversation_status', label: 'Status da Conversa' },
];

const actionTypes = [
    { value: 'send_message', label: 'Enviar Mensagem de Texto' },
    { value: 'add_tag', label: 'Adicionar Tag' },
    { value: 'add_to_list', label: 'Adicionar à Lista' },
    { value: 'assign_user', label: 'Atribuir a um Atendente' },
];

const renderConditionValueInput = (
    condition: Partial<AutomationCondition>,
    onChange: (id: string, field: string, value: any) => void,
    tags: Tag[], 
    lists: ContactList[]
) => {
    switch (condition.type) {
        case 'contact_tag':
            return (
                <Select value={condition.value as string || ''} onValueChange={(val) => onChange(condition.id!, 'value', val)}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma tag"/></SelectTrigger>
                    <SelectContent>{tags.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
            );
        case 'contact_list':
             return (
                <Select value={condition.value as string || ''} onValueChange={(val) => onChange(condition.id!, 'value', val)}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma lista"/></SelectTrigger>
                    <SelectContent>{lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
            );
        case 'conversation_status':
             return (
                <Select value={condition.value as string || ''} onValueChange={(val) => onChange(condition.id!, 'value', val)}>
                    <SelectTrigger><SelectValue placeholder="Selecione um status"/></SelectTrigger>
                    <SelectContent><SelectItem value="new">Novo</SelectItem><SelectItem value="in_progress">Em Andamento</SelectItem><SelectItem value="resolved">Resolvido</SelectItem></SelectContent>
                </Select>
            );
        case 'message_content':
        default:
            return <Input placeholder="Valor" value={condition.value as string || ''} onChange={(e) => onChange(condition.id!, 'value', e.target.value)} />;
    }
}

const renderActionValueInput = (
    action: Partial<AutomationAction>,
    onChange: (id: string, field: string, value: any) => void,
    tags: Tag[], 
    users: User[],
    lists: ContactList[]
) => {
    switch(action.type) {
        case 'send_message':
            return <Textarea placeholder="Digite a mensagem a ser enviada..." value={action.value || ''} onChange={(e) => onChange(action.id!, 'value', e.target.value)} />;
        case 'add_tag':
             return (
                <Select value={action.value || ''} onValueChange={(val) => onChange(action.id!, 'value', val)}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma tag para adicionar"/></SelectTrigger>
                    <SelectContent>
                        {Array.isArray(tags) && tags.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            );
        case 'add_to_list':
             return (
                <Select value={action.value || ''} onValueChange={(val) => onChange(action.id!, 'value', val)}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma lista para adicionar"/></SelectTrigger>
                    <SelectContent>
                        {Array.isArray(lists) && lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            );
        case 'assign_user':
             return (
                <Select value={action.value || ''} onValueChange={(val) => onChange(action.id!, 'value', val)}>
                    <SelectTrigger><SelectValue placeholder="Selecione um atendente"/></SelectTrigger><SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
            );
        default:
            return null;
    }
}

export function AutomationRuleForm({ open, onOpenChange, ruleToEdit, onSaveSuccess }: AutomationRuleFormProps) {
  const [ruleName, setRuleName] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('');
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [conditions, setConditions] = useState<Partial<AutomationCondition>[]>([{ id: String(Date.now()), type: 'message_content' }]);
  const [actions, setActions] = useState<Partial<AutomationAction>[]>([{ id: String(Date.now()), type: 'send_message' }]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [availableLists, setAvailableLists] = useState<ContactList[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [availableConnections, setAvailableConnections] = useState<Connection[]>([]);

  const { toast } = useToast();
  
  const resetForm = useCallback(() => {
    const isEditing = !!ruleToEdit;
    setRuleName(isEditing ? ruleToEdit.name : '');
    setTriggerEvent(isEditing ? ruleToEdit.triggerEvent : eventTriggers[0]?.value || '');
    setConditions(isEditing ? ruleToEdit.conditions.map(c => ({...c, id: c.id || String(Date.now())})) : [{ id: String(Date.now()), type: 'message_content', operator: 'contains', value: '' }]);
    setActions(isEditing ? ruleToEdit.actions.map(a => ({...a, id: a.id || String(Date.now())})) : [{ id: String(Date.now()), type: 'send_message', value: '' }]);
    setSelectedConnectionIds(isEditing ? ruleToEdit.connectionIds || [] : []);
  }, [ruleToEdit]);

  useEffect(() => {
    if (open) {
      const fetchPrerequisites = async () => {
        setLoading(true);
        try {
            const [tagsRes, listsRes, usersRes, connsRes] = await Promise.all([
                fetch('/api/v1/tags'),
                fetch('/api/v1/lists'),
                fetch('/api/v1/team/users'),
                fetch('/api/v1/connections'),
            ]);
            if (!tagsRes.ok || !listsRes.ok || !usersRes.ok || !connsRes.ok) throw new Error('Falha ao carregar dados para o formulário.');
            
            const tagsData = await tagsRes.json();
            const listsData = await listsRes.json();

            setAvailableTags(tagsData.data || []);
            setAvailableLists(listsData.data || []);
            setAvailableUsers(await usersRes.json());
            setAvailableConnections(await connsRes.json());
            
            // Only set form state after all data is loaded
            resetForm();

        } catch(error) {
             toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
        } finally {
            setLoading(false);
        }
      };
      fetchPrerequisites();
    }
  }, [open, resetForm, toast]);
  
  const updateCondition = (id: string, field: string, value: any): void => {
    setConditions(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const updateAction = (id: string, field: string, value: any): void => {
    setActions(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  
  const addCondition = () => setConditions([...conditions, { id: String(Date.now()), type: 'message_content', operator: 'contains', value: '' }]);
  const removeCondition = (id: string) => setConditions(conditions.filter(c => c.id !== id));
  
  const addAction = () => setActions([...actions, { id: String(Date.now()), type: 'send_message', value: '' }]);
  const removeAction = (id: string) => setActions(actions.filter(a => a.id !== id));
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const payload = {
        name: ruleName,
        triggerEvent,
        connectionIds: selectedConnectionIds.length > 0 ? selectedConnectionIds : null,
        conditions,
        actions
    };
    
    const isEditing = !!ruleToEdit;
    const url = isEditing ? `/api/v1/automations/${ruleToEdit.id}` : '/api/v1/automations';
    const method = isEditing ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Falha ao salvar a regra.');
        
        toast({ title: 'Sucesso!', description: `A regra "${result.name}" foi salva.` });
        onOpenChange(false);
        onSaveSuccess();
    } catch(error) {
        toast({ variant: 'destructive', title: 'Erro ao Salvar', description: (error as Error).message });
    } finally {
        setIsProcessing(false);
    }
  }

  const connectionOptions = availableConnections.map(c => ({ value: c.id, label: c.config_name }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{ruleToEdit ? 'Editar Regra de Automação' : 'Criar Nova Regra'}</DialogTitle>
          <DialogDescription>
            Configure um gatilho, condições e ações para automatizar uma tarefa.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
        <form onSubmit={handleSubmit} id="automation-form" className="flex-1 space-y-4 overflow-y-auto pr-4 -mr-6 pl-1 flex flex-col">
            <div className="space-y-2">
                <Label htmlFor="rule-name" className="text-base font-semibold">Nome da Regra</Label>
                <Input id="rule-name" placeholder="Ex: Enviar boas-vindas para novo lead" value={ruleName} onChange={e => setRuleName(e.target.value)} required />
            </div>
            
             <Card>
                <CardHeader><CardTitle className="text-base">1. Gatilho e Escopo</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="event-trigger">Quando este evento acontecer...</Label>
                        <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                        <SelectTrigger id="event-trigger"><SelectValue /></SelectTrigger>
                        <SelectContent>{eventTriggers.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Aplicar às Conexões</Label>
                         <ContactMultiSelect
                            selected={selectedConnectionIds}
                            onChange={setSelectedConnectionIds}
                            placeholder="Todas as Conexões"
                            options={connectionOptions}
                        />
                         <p className="text-xs text-muted-foreground">Se nenhuma conexão for selecionada, a regra será aplicada a todas.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-base">2. Condições (Se)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                     {conditions.map((condition, index) => (
                        <div key={condition.id} className="space-y-3">
                           {index > 0 && <div className="text-sm font-semibold text-center py-2">E</div>}
                            <div className="p-4 border rounded-md relative space-y-3">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeCondition(condition.id!)} disabled={conditions.length === 1}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <Select value={condition.type} onValueChange={(type) => updateCondition(condition.id!, 'type', type)}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>{conditionTypes.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select defaultValue="contains" value={condition.operator} onValueChange={(op) => updateCondition(condition.id!, 'operator', op)}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="equals">É igual a</SelectItem>
                                            <SelectItem value="not_equals">É diferente de</SelectItem>
                                            <SelectItem value="contains">Contém</SelectItem>
                                            <SelectItem value="not_contains">Não Contém</SelectItem>
                                             <SelectItem value="exists">Existe / Possui</SelectItem>
                                            <SelectItem value="not_exists">Não Existe / Não Possui</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {renderConditionValueInput(condition, updateCondition, availableTags, availableLists)}
                                </div>
                            </div>
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addCondition}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Condição
                    </Button>
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle className="text-base">3. Ações (Então)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                     {actions.map((action, index) => (
                        <div key={action.id} className="space-y-3">
                             {index > 0 && <div className="text-sm font-semibold text-center py-2">E Então</div>}
                            <div className="p-4 border rounded-md relative space-y-3">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeAction(action.id!)} disabled={actions.length === 1}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <Select value={action.type} onValueChange={(type) => updateAction(action.id!, 'type', type)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>{actionTypes.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                                </Select>
                                {renderActionValueInput(action, updateAction, availableTags, availableUsers, availableLists)}
                            </div>
                        </div>
                     ))}
                    <Button type="button" variant="outline" onClick={addAction}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Ação
                    </Button>
                </CardContent>
            </Card>

        </form>
        )}
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="automation-form" disabled={loading || isProcessing}>
             {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
             {isProcessing ? 'A Salvar...' : 'Salvar Regra'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
