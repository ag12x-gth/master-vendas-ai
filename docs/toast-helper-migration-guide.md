# Toast Helper Migration Guide

## 📚 Visão Geral

Este guia documenta o processo de migração de componentes que usam `toast({ ... })` diretamente para o novo pattern estabilizado com `createToastNotifier`.

**Objetivo:** Eliminar re-renders e loops infinitos causados por referências instáveis de `toast()` em dependency arrays.

---

## ✅ Pattern Obrigatório

### **Antes (BUGGY):**
```typescript
import { useToast } from '@/components/ui/use-toast';

function MyComponent() {
  const { toast } = useToast();
  
  const handleAction = useCallback(async () => {
    // ... ação
    toast({ title: 'Sucesso!', description: 'Mensagem' });
  }, [toast]); // ❌ PROBLEMA: toast muda a cada render
  
  return <button onClick={handleAction}>Ação</button>;
}
```

**Problemas:**
- `toast` não é estável entre renders
- Dependency arrays com `[toast]` causam re-renders infinitos
- useCallback/useEffect executam repetidamente

---

### **Depois (CORRETO):**
```typescript
import { useToast } from '@/components/ui/use-toast';
import { createToastNotifier } from '@/lib/toast-helper';
import { useMemo } from 'react';

function MyComponent() {
  const { toast } = useToast();
  
  // ✅ OBRIGATÓRIO: Wrap com useMemo
  const notify = useMemo(() => createToastNotifier(toast), [toast]);
  
  const handleAction = useCallback(async () => {
    // ... ação
    notify.success('Sucesso!', 'Mensagem');
  }, [notify]); // ✅ CORRETO: notify é estável
  
  return <button onClick={handleAction}>Ação</button>;
}
```

**Benefícios:**
- `notify` é estável (mesma referência entre renders)
- Dependency arrays com `[notify]` funcionam corretamente
- useCallback/useEffect executam apenas quando necessário
- Código mais limpo e consistente

---

## 🔧 API do Toast Helper

O `createToastNotifier` retorna 4 métodos:

### **1. notify.success(title, description?)**
```typescript
notify.success('Operação concluída!', 'O item foi salvo com sucesso.');
```
- **Uso:** Confirmações, sucesso de ações
- **Duração:** 4000ms
- **Estilo:** Verde, ícone de check

### **2. notify.error(title, description?)**
```typescript
notify.error('Erro ao salvar', 'Verifique os campos e tente novamente.');
```
- **Uso:** Erros, validações, falhas de API
- **Duração:** 4000ms
- **Estilo:** Vermelho, ícone de X

### **3. notify.info(title, description?)**
```typescript
notify.info('Processando...', 'Por favor aguarde enquanto finalizamos.');
```
- **Uso:** Status, informações, progresso
- **Duração:** 4000ms
- **Estilo:** Azul, ícone de i

### **4. notify.warning(title, description?)**
```typescript
notify.warning('Atenção', 'Esta ação não pode ser desfeita.');
```
- **Uso:** Avisos, confirmações importantes
- **Duração:** 4000ms
- **Estilo:** Amarelo, ícone de alerta

---

## 📋 Checklist de Migração

### **Passo 1: Importar dependências**
```typescript
import { useMemo } from 'react';
import { createToastNotifier } from '@/lib/toast-helper';
```

### **Passo 2: Criar notify com useMemo**
```typescript
const notify = useMemo(() => createToastNotifier(toast), [toast]);
```

### **Passo 3: Substituir toast({ ... })**
```typescript
// ANTES
toast({ title: 'Sucesso!', description: 'Salvo' });
toast({ variant: 'destructive', title: 'Erro', description: 'Falhou' });

// DEPOIS
notify.success('Sucesso!', 'Salvo');
notify.error('Erro', 'Falhou');
```

### **Passo 4: Atualizar dependency arrays**
```typescript
// ANTES
}, [toast, otherDep]);

// DEPOIS
}, [notify, otherDep]);
```

### **Passo 5: Validar LSP**
```bash
# Verificar zero erros TypeScript
npm run type-check
```

### **Passo 6: Testar fluxos críticos**
- Criar/editar/excluir itens
- Validações de formulário
- Fetch errors
- Optimistic updates

---

## 🏗️ Pattern Avançado: Hoisting

Para componentes parent/child que compartilham notificações:

### **Parent cria notify:**
```typescript
function ParentTable() {
  const { toast } = useToast();
  const notify = useMemo(() => createToastNotifier(toast), [toast]);
  
  return (
    <div>
      {items.map(item => (
        <ChildCard key={item.id} item={item} notify={notify} />
      ))}
    </div>
  );
}
```

### **Child recebe via props:**
```typescript
interface ChildCardProps {
  item: Item;
  notify: ReturnType<typeof createToastNotifier>;
}

const ChildCard = memo(({ item, notify }: ChildCardProps) => {
  const handleDelete = useCallback(async () => {
    // ... delete logic
    notify.success('Item excluído!');
  }, [notify]); // ✅ Mesma referência do parent
  
  return <button onClick={handleDelete}>Excluir</button>;
});
```

**Benefícios:**
- Elimina instâncias duplicadas de notify
- Child usa referência estável do parent
- Performance otimizada com memo()

---

## 🔍 Troubleshooting

### **Problema: Toasts não aparecem**
```typescript
// ❌ ERRADO: Esqueceu useMemo
const notify = createToastNotifier(toast);

// ✅ CORRETO
const notify = useMemo(() => createToastNotifier(toast), [toast]);
```

### **Problema: Re-renders infinitos**
```typescript
// ❌ ERRADO: Dependency array com [toast]
}, [toast]);

// ✅ CORRETO: Dependency array com [notify]
}, [notify]);
```

### **Problema: LSP errors "notify is not defined"**
```typescript
// ❌ ERRADO: Esqueceu de importar useMemo
import { createToastNotifier } from '@/lib/toast-helper';

// ✅ CORRETO
import { useMemo } from 'react';
import { createToastNotifier } from '@/lib/toast-helper';
```

---

## 📊 Status da Migração

### **✅ Fases Completas (6 componentes):**

**Fase 1:**
- ✅ contact-lists-table.tsx (3 toasts)
- ✅ automation-list.tsx (4 toasts)
- ✅ webhook-dialog.tsx (7 toasts)

**Fase 2:**
- ✅ campaign-table.tsx (6 toasts + hoisting)
- ✅ template-dialog.tsx (7 toasts)

**Fase 3:**
- ✅ contact-table.tsx (7 toasts)

**Total migrado:** ~34 toasts em 6 componentes críticos

---

### **🚀 Fase 4 - Candidatos (19+ componentes):**

#### **Alta Prioridade:**
- app-header.tsx (header global)
- contacts/contact-profile.tsx (perfil de contato)
- contacts/start-conversation-dialog.tsx (iniciar conversas)
- contacts/import-contacts-dialog.tsx (importação)
- kanban/funnel-list.tsx (gestão de funil)

#### **Média Prioridade:**
- ia/persona-list.tsx (gestão de IA)
- ia/behavior-settings.tsx (config de comportamento)
- ia/rag-sections-manager.tsx (RAG manager)
- vapi-voice/BulkCallDialog.tsx (chamadas em massa)
- meetings/NewMeetingDialog.tsx (reuniões)

#### **Baixa Prioridade:**
- dashboard/* (3 componentes)
- templates/template-grid.tsx
- ui/multi-select-creatable.tsx

**Total restante:** ~50 componentes com `toast({`

---

## 🎯 Próximos Passos

1. **Incremental Migration:** Migrar componentes conforme necessidade de manutenção
2. **Team Onboarding:** Treinar time no novo pattern
3. **Code Reviews:** Rejeitar PRs com `toast({` direto em componentes novos
4. **Linting Rule (opcional):** ESLint custom rule para detectar `toast({`

---

## 📖 Exemplos Reais

### **Exemplo 1: CRUD Dialog (webhook-dialog.tsx)**
```typescript
const WebhookDialog = ({ webhook, open, onOpenChange, onSave }: Props) => {
  const { toast } = useToast();
  const notify = useMemo(() => createToastNotifier(toast), [toast]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      notify.error('Erro de validação', 'O nome do webhook é obrigatório.');
      return;
    }
    
    try {
      const response = await fetch('/api/v1/webhooks', {
        method: webhook ? 'PUT' : 'POST',
        body: JSON.stringify({ name, url, events, active }),
      });
      
      if (response.status === 204) {
        notify.success('Webhook salvo!', 'As alterações foram aplicadas.');
        onSave();
        onOpenChange(false);
        return;
      }
      
      const data = await response.json();
      notify.success('Webhook criado!', `Secret: ${data.secret}`);
      onSave();
    } catch (error) {
      notify.error('Erro ao salvar', 'Tente novamente.');
    }
  };
  
  return <DialogContent>...</DialogContent>;
};
```

### **Exemplo 2: Bulk Actions (contact-table.tsx)**
```typescript
const ContactTable = () => {
  const { toast } = useToast();
  const notify = useMemo(() => createToastNotifier(toast), [toast]);
  
  const handleBulkDelete = useCallback(async () => {
    notify.info('A excluir contatos...', `Aguarde enquanto ${selectedRows.length} contatos são excluídos.`);
    
    const originalContacts = [...contacts];
    setContacts(contacts.filter(c => !selectedRows.includes(c.id)));
    
    try {
      const results = await Promise.all(
        selectedRows.map(id => fetch(`/api/v1/contacts/${id}`, { method: 'DELETE' }))
      );
      
      const failed = results.filter(res => !res.ok);
      if (failed.length > 0) {
        throw new Error(`${failed.length} contatos não puderam ser excluídos.`);
      }
      
      notify.success(`${selectedRows.length} contatos excluídos`, 'Operação concluída.');
      fetchContacts();
    } catch (error) {
      notify.error('Erro ao excluir', error instanceof Error ? error.message : 'Ocorreu um erro.');
      setContacts(originalContacts); // Rollback
    } finally {
      setSelectedRows([]);
    }
  }, [notify, selectedRows, contacts]);
  
  return <Table>...</Table>;
};
```

### **Exemplo 3: Optimistic Updates (automation-list.tsx)**
```typescript
const AutomationList = () => {
  const { toast } = useToast();
  const notify = useMemo(() => createToastNotifier(toast), [toast]);
  
  const handleToggle = useCallback(async (id: string, active: boolean) => {
    // Optimistic update
    setRules(prev => prev.map(r => r.id === id ? { ...r, active } : r));
    
    try {
      const response = await fetch(`/api/v1/automations/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ active }),
      });
      
      if (!response.ok) throw new Error('Falha ao atualizar');
      
      notify.success('Status atualizado!', `Regra ${active ? 'ativada' : 'desativada'}.`);
    } catch (error) {
      // Rollback on error
      setRules(prev => prev.map(r => r.id === id ? { ...r, active: !active } : r));
      notify.error('Erro ao atualizar', 'Tente novamente.');
    }
  }, [notify]);
  
  return <List>...</List>;
};
```

---

## 🏆 Boas Práticas

1. **Sempre usar useMemo:** Nunca criar `notify` sem useMemo
2. **Dependency arrays consistentes:** Sempre `[notify]`, nunca `[toast]`
3. **Hoisting quando apropriado:** Parent cria, children recebem via props
4. **Mensagens descritivas:** Títulos curtos, descrições informativas
5. **Error handling:** Sempre mostrar toast em catch blocks
6. **Optimistic updates:** Usar notify após rollback se falhar
7. **LSP zero errors:** Validar TypeScript antes de commit
8. **Smoke tests:** Testar fluxos críticos após migração

---

**Última atualização:** Novembro 2025  
**Autor:** Sistema de migração toast helper v1.0  
**Status:** Production-ready ✅
