
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, ToggleRight, ToggleLeft } from 'lucide-react';
import { AutomationRuleForm } from './automation-rule-form';
import type { AutomationRule } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from '@/components/ui/alert-dialog';
import { Badge } from '../ui/badge';

export function AutomationList() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const { toast } = useToast();

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
        const response = await fetch('/api/v1/automations');
        if (!response.ok) throw new Error('Falha ao carregar regras.');
        const data = await response.json();
        setRules(data);
    } catch(error) {
        toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
    } finally {
        setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchRules();
  }, [fetchRules]);
  
  const handleOpenModal = (rule: AutomationRule | null) => {
    setEditingRule(rule);
    setIsFormOpen(true);
  }

  const handleToggleActive = async (rule: AutomationRule) => {
      const originalRules = [...rules];
      const newStatus = !rule.isActive;
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: newStatus } : r));
      try {
          const response = await fetch(`/api/v1/automations/${rule.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isActive: newStatus }),
          });
          if (!response.ok) throw new Error('Falha ao atualizar o status da regra.');
          toast({ title: 'Status Atualizado!', description: `A regra "${rule.name}" foi ${newStatus ? 'ativada' : 'desativada'}.`});

      } catch (error) {
          setRules(originalRules);
          toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
      }
  }

  const handleDelete = async (ruleId: string) => {
    try {
        const response = await fetch(`/api/v1/automations/${ruleId}`, { method: 'DELETE' });
        if (response.status !== 204) throw new Error('Falha ao excluir a regra.');
        toast({ title: 'Regra Excluída!' });
        fetchRules();
    } catch(error) {
        toast({ variant: 'destructive', title: 'Erro ao Excluir', description: (error as Error).message });
    }
  }
  
  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => handleOpenModal(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Regra
        </Button>
      </div>
       <Card className="mt-4">
        <CardContent className="p-4">
            {loading ? (
                 <div className="flex justify-center items-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                 </div>
            ) : rules.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <p>Nenhuma regra de automação criada ainda.</p>
                </div>
            ) : (
                <div className="space-y-3">
                {rules.map(rule => (
                    <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div className="space-y-1">
                            <p className="font-semibold">{rule.name}</p>
                            <p className="text-sm text-muted-foreground">Gatilho: {rule.triggerEvent}</p>
                        </div>
                        <div className="flex items-center gap-4">
                             <Badge variant={rule.isActive ? 'default' : 'secondary'} className={rule.isActive ? 'bg-green-500' : ''}>
                                {rule.isActive ? 'Ativa' : 'Inativa'}
                            </Badge>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onSelect={() => handleOpenModal(rule)}>
                                        <Edit className="mr-2 h-4 w-4"/> Editar
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onSelect={() => handleToggleActive(rule)}>
                                        {rule.isActive ? <ToggleLeft className="mr-2 h-4 w-4"/> : <ToggleRight className="mr-2 h-4 w-4"/>}
                                        {rule.isActive ? 'Desativar' : 'Ativar'}
                                    </DropdownMenuItem>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4"/>Excluir
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Deseja excluir a regra &quot;{rule.name}&quot;?</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(rule.id)}>Sim, Excluir</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                ))}
                </div>
            )}
        </CardContent>
      </Card>
      <AutomationRuleForm 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        ruleToEdit={editingRule} 
        onSaveSuccess={fetchRules}
      />
    </>
  );
}
