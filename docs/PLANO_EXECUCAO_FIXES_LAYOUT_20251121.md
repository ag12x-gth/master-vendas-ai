# 📋 PLANO DE EXECUÇÃO - CORREÇÃO DOS BUGS DE LAYOUT

## 🎯 OBJETIVO
Corrigir os 6 bugs identificados na página de Atendimentos, priorizando impacto visual e experiência do usuário.

---

## 🔥 FASE 1: CORREÇÕES CRÍTICAS (Prioridade MÁXIMA)

### ✅ TAREFA 1.1: Alinhar Skeleton com Implementação Real
**Arquivo**: `src/components/atendimentos/inbox-view.tsx`  
**Tempo estimado**: 15 min

**Ação**:
- Substituir Grid por Flexbox no InboxSkeleton (linha 19)
- Aplicar mesmas classes do componente real

**Antes (linha 19):**
```tsx
<div className="h-full grid grid-cols-1 md:grid-cols-[minmax(320px,_1fr)_2fr_1fr] border rounded-lg overflow-hidden">
```

**Depois:**
```tsx
<div className="h-full flex flex-row border rounded-lg overflow-hidden">
```

**Elementos filhos ajustados**:
- Skeleton lista: `w-full md:w-[320px] lg:w-[350px] xl:w-[400px]`
- Skeleton chat: `flex-1`
- Skeleton sidebar: `hidden xl:flex w-[340px]`

---

### ✅ TAREFA 1.2: Converter Larguras Fixas para Proporções Fluidas
**Arquivo**: `src/components/atendimentos/inbox-view.tsx`  
**Tempo estimado**: 20 min

**Objetivo**: Substituir `w-[320px]` etc. por `flex-[proporção]`

**Antes (linha 308, 319, 339):**
```tsx
<div className="w-full md:w-[320px] lg:w-[350px] xl:w-[400px] flex-shrink-0">
<div className="flex-1 flex flex-col">
<aside className="w-[340px] hidden xl:flex">
```

**Depois:**
```tsx
<div className="w-full md:flex-[0.25] lg:flex-[0.22] xl:flex-[0.20] flex-shrink-0">
<div className="flex-[0.6] md:flex-[0.55] xl:flex-[0.60] flex flex-col">
<aside className="flex-[0.20] hidden xl:flex">
```

**Benefícios**:
- ✅ Proporções consistentes em todas as resoluções
- ✅ Melhor aproveitamento de espaço em 4K
- ✅ Layout mais equilibrado

---

## ⚠️ FASE 2: CORREÇÕES ALTAS (Prioridade ALTA)

### ✅ TAREFA 2.1: Reduzir Padding do Main Container
**Arquivo**: `src/contexts/session-context.tsx`  
**Tempo estimado**: 5 min

**Ação**: Reduzir padding desktop de `p-8` para `p-4`

**Antes (linha 35):**
```tsx
<main className="flex-1 overflow-y-auto bg-muted/40 p-3 sm:p-4 md:p-6 lg:p-8 pb-6">
```

**Depois:**
```tsx
<main className="flex-1 overflow-y-auto bg-muted/40 p-3 sm:p-4 md:p-4 lg:p-4 pb-4">
```

**Benefícios**:
- ✅ +48px de largura recuperados em desktop
- ✅ Melhor densidade de informação
- ✅ Mais espaço para lista/chat/sidebar

---

### ✅ TAREFA 2.2: Corrigir Altura do ScrollArea no ActiveChat
**Arquivo**: `src/components/atendimentos/active-chat.tsx`  
**Tempo estimado**: 10 min

**Ação**: Adicionar `overflow-hidden` ao wrapper do ScrollArea

**Antes (linha 185):**
```tsx
<div className="flex-1 min-h-0">
  <ScrollArea className="h-full" viewportRef={scrollAreaRef}>
```

**Depois:**
```tsx
<div className="flex-1 min-h-0 overflow-hidden">
  <ScrollArea className="h-full" viewportRef={scrollAreaRef}>
```

**Benefícios**:
- ✅ Garante cálculo correto de altura pelo ScrollArea
- ✅ Evita scroll duplo acidental
- ✅ Comportamento mais previsível

---

## ℹ️ FASE 3: CORREÇÕES MÉDIAS/BAIXAS (Prioridade NORMAL)

### ✅ TAREFA 3.1: Adicionar h-full Explícito no Wrapper InboxView
**Arquivo**: `src/app/(main)/atendimentos/atendimentos-client.tsx`  
**Tempo estimado**: 3 min

**Antes (linha 18):**
```tsx
<div className="flex-1 min-h-0">
```

**Depois:**
```tsx
<div className="flex-1 min-h-0 h-full">
```

---

### ✅ TAREFA 3.2: Otimizar ScrollArea da ConversationList
**Arquivo**: `src/components/atendimentos/conversation-list.tsx`  
**Tempo estimado**: 5 min

**Ação**: Remover `min-h-0` redundante do ScrollArea

**Antes (linha 142):**
```tsx
<ScrollArea className="flex-1 min-h-0">
```

**Depois:**
```tsx
<ScrollArea className="flex-1 overflow-y-auto">
```

---

## 📊 RESUMO DE EXECUÇÃO

| Fase | Tarefas | Tempo Total | Prioridade |
|------|---------|-------------|------------|
| Fase 1 | 2 tarefas | ~35 min | 🔥 CRÍTICA |
| Fase 2 | 2 tarefas | ~15 min | ⚠️ ALTA |
| Fase 3 | 2 tarefas | ~8 min | ℹ️ NORMAL |
| **TOTAL** | **6 tarefas** | **~58 min** | - |

---

## 🧪 CHECKLIST DE VALIDAÇÃO

Após implementar cada fase, validar:

### ✅ Validação Visual:
- [ ] Skeleton tem mesma estrutura visual que componente carregado
- [ ] Proporções equilibradas em 1366px, 1920px e 2560px
- [ ] Sidebar direita aparece corretamente em xl+
- [ ] Sem "pulo" visual no carregamento (CLS baixo)
- [ ] Espaçamento adequado ao redor do conteúdo

### ✅ Validação Técnica:
- [ ] Scroll funciona corretamente na lista de conversas
- [ ] Scroll funciona corretamente no chat de mensagens
- [ ] Componentes não "vazam" fora dos containers
- [ ] Altura 100% funciona em todos os níveis
- [ ] Layout responsivo em mobile/tablet/desktop

### ✅ Validação de Performance:
- [ ] Sem warnings no console do navegador
- [ ] Sem erros de hidratação (Next.js)
- [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] Sem scroll desnecessário em múltiplos níveis

---

## 🚀 ORDEM DE EXECUÇÃO RECOMENDADA

1. **Primeiro**: Tarefa 1.1 (Skeleton) - Resolve flash visual
2. **Segundo**: Tarefa 2.1 (Padding) - Ganha espaço imediatamente
3. **Terceiro**: Tarefa 1.2 (Proporções) - Balanceia layout
4. **Quarto**: Tarefa 2.2 (ScrollArea) - Garante estabilidade
5. **Quinto**: Tarefas 3.1 e 3.2 - Polimento final

---

## 📝 OBSERVAÇÕES IMPORTANTES

### ⚠️ Cuidados ao Implementar:
1. **Testar em múltiplas resoluções**: 1366px, 1920px, 2560px
2. **Validar mobile**: Layout deve colapsar corretamente em < 768px
3. **Verificar dark mode**: Classes Tailwind devem funcionar em ambos temas
4. **Testar scroll**: Garantir que não haja scroll duplo ou ausente

### 🎨 Referências de Design:
- **Lista ideal**: 20-25% da largura total
- **Chat ideal**: 55-60% da largura total
- **Sidebar ideal**: 20% da largura total
- **Padding máximo**: 24px (p-6) para aplicações densas

---

**Plano criado em**: 21/11/2025 18:18 BRT  
**Baseado em**: ANALISE_BUGS_LAYOUT_ATENDIMENTOS_20251121.md  
**Status**: ⏳ Aguardando aprovação para execução
