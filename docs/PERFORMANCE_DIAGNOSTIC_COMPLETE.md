# 🚀 DIAGNÓSTICO COMPLETO DE PERFORMANCE - MASTER IA OFICIAL

**Data:** 05/11/2025  
**Status:** Sistema com lentidão significativa ao carregar páginas  
**Objetivo:** Tornar o sistema ultra rápido absoluto

---

## 📊 **PROBLEMAS CRÍTICOS IDENTIFICADOS**

### **🔴 CRÍTICO #1: N+1 Query Problem**

**Arquivo:** `src/app/api/v1/contacts/route.ts` (Linhas 110-124)

**Problema:**
```typescript
// ❌ MAL: Para CADA contato, faz 2 queries separadas
const contactsWithRelations = await Promise.all(companyContacts.map(async (contact) => {
    const contactTags = await db.select(...) // Query 1 por contato
    const contactContactLists = await db.select(...) // Query 2 por contato
}));
```

**Impacto:**
- Para 100 contatos: **201 queries** (1 inicial + 100×2 subsequentes)
- Tempo estimado: 2-5 segundos para carregar lista de contatos
- **Solução:** Usar LEFT JOIN ou subquery única

---

### **🔴 CRÍTICO #2: Query Complexa de Conversações Sem Cache**

**Arquivo:** `src/app/api/v1/conversations/route.ts` (Linhas 14-71)

**Problema:**
- ROW_NUMBER window function sem otimização
- 3 subqueries complexas executadas para TODAS conversas
- Sem cache ou paginação
- Carrega TODAS conversas da empresa de uma vez

**Impacto:**
- Endpoint `/api/v1/conversations` chamado a cada 5 segundos (polling)
- Com 500 conversas: 3-8 segundos de resposta
- **Solução:** Implementar cache Redis/In-Memory + paginação

---

### **🔴 CRÍTICO #3: Índices Faltando**

**Queries SQL revelam índices faltando:**

```sql
-- ❌ kanban_leads NÃO TEM índices em:
- contact_id (usado em JOINs frequentes)
- board_id (usado em filtros)
- stage_id (usado em filtros)
- created_at (usado para ordenação)

-- ❌ automation_logs poderia se beneficiar de:
- company_id + conversation_id (consultas conjuntas)

-- ❌ contacts_to_tags e contacts_to_contact_lists:
- Faltam índices compostos para queries de relacionamento
```

**Impacto:**
- Full table scans em queries de Kanban
- Lentidão ao carregar funis com muitos leads
- **Solução:** Adicionar índices compostos estratégicos

---

### **🟠 MÉDIO #4: Bundle JavaScript Grande**

**Dependências Pesadas Identificadas:**
- `@whiskeysockets/baileys` (7.0.0-rc.6) - biblioteca grande para WhatsApp
- `firebase` (12.1.0) - 300KB+ não otimizado
- `socket.io-client` (4.8.1) - carregado em todas as páginas
- `recharts` (2.15.1) - biblioteca de gráficos pesada
- `emoji-picker-react` (4.10.0) - emoji picker completo

**Problema:**
- Bundle inicial estimado: 800KB-1.2MB (não comprimido)
- Todas as páginas carregam bibliotecas desnecessárias
- **Solução:** Code splitting, lazy loading, dynamic imports

---

### **🟠 MÉDIO #5: Componentes Pesados Sem Otimização**

**Componentes Identificados:**
1. **ContactTable** - Recarrega tudo a cada mudança de filtro
2. **CampaignTable** - Sem debounce adequado em filtros
3. **InboxView** - Polling a cada 5 segundos sem cache
4. **AI Playground** - Carrega histórico completo de chats

**Problema:**
- Re-renders desnecessários
- Falta de memoization (useMemo, useCallback)
- **Solução:** React.memo, useMemo, virtualization

---

### **🟡 MENOR #6: Imagens e Assets Não Otimizados**

**Problema:**
- Avatares de contatos carregados sem lazy loading
- Sem otimização de imagens via Next.js Image
- **Solução:** Usar next/image, lazy loading

---

## 📋 **PLANO DE AÇÃO E EXECUÇÃO**

### **FASE 1: Otimizações de Banco de Dados** ⚡ (Maior Impacto)

#### **1.1 Adicionar Índices Críticos**
```sql
-- kanban_leads
CREATE INDEX idx_kanban_leads_contact_id ON kanban_leads(contact_id);
CREATE INDEX idx_kanban_leads_board_id ON kanban_leads(board_id);
CREATE INDEX idx_kanban_leads_stage_id ON kanban_leads(stage_id);
CREATE INDEX idx_kanban_leads_board_stage ON kanban_leads(board_id, stage_id);
CREATE INDEX idx_kanban_leads_created_at ON kanban_leads(created_at DESC);

-- contacts_to_tags (otimizar N+1)
CREATE INDEX idx_contacts_to_tags_contact ON contacts_to_tags(contact_id, tag_id);

-- contacts_to_contact_lists (otimizar N+1)
CREATE INDEX idx_contacts_to_lists_contact ON contacts_to_contact_lists(contact_id, list_id);

-- automation_logs
CREATE INDEX idx_automation_logs_company_conversation 
  ON automation_logs(company_id, conversation_id, created_at DESC);
```

**Ganho Esperado:** 60-80% redução no tempo de queries do Kanban e Contacts

---

#### **1.2 Resolver N+1 Query em Contacts**

**Antes (❌ MAL):**
```typescript
const contactsWithRelations = await Promise.all(companyContacts.map(async (contact) => {
    const contactTags = await db.select(...)
    const contactContactLists = await db.select(...)
}));
```

**Depois (✅ BOM):**
```typescript
// Buscar todas tags de uma vez
const contactIds = companyContacts.map(c => c.id);
const allTags = await db.select({
    contactId: contactsToTags.contactId,
    id: tags.id,
    name: tags.name,
    color: tags.color
})
.from(tags)
.innerJoin(contactsToTags, eq(tags.id, contactsToTags.tagId))
.where(inArray(contactsToTags.contactId, contactIds));

// Agrupar por contact
const tagsByContact = allTags.reduce((acc, tag) => {
    if (!acc[tag.contactId]) acc[tag.contactId] = [];
    acc[tag.contactId].push(tag);
    return acc;
}, {});

// Mesma lógica para lists
```

**Ganho Esperado:** 90-95% redução (201 queries → 3 queries)

---

#### **1.3 Otimizar Query de Conversações**

**Solução:**
1. Adicionar paginação (limit/offset)
2. Implementar cache de 30 segundos
3. Simplificar subqueries usando CTEs (Common Table Expressions)
4. Considerar materialized view para dashboards

**Ganho Esperado:** 70-80% redução + cache evita 90% das queries

---

### **FASE 2: Frontend Performance** 🎨

#### **2.1 Code Splitting e Lazy Loading**

**Componentes para Lazy Load:**
```typescript
// ✅ Lazy load componentes pesados
const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full" />
});

const RichTextEditor = dynamic(() => import('@/components/editor'), {
  ssr: false
});

const Charts = dynamic(() => import('recharts'), {
  loading: () => <LoadingSpinner />
});
```

**Ganho Esperado:** 40-50% redução no bundle inicial

---

#### **2.2 Otimizar Re-renders**

**Aplicar em todos os componentes de lista:**
```typescript
const ContactRow = React.memo(({ contact }) => {
  return <TableRow>...</TableRow>
}, (prev, next) => prev.contact.id === next.contact.id);

const MemoizedContactTable = React.memo(ContactTable);
```

**Ganho Esperado:** 50-70% redução em re-renders desnecessários

---

#### **2.3 Virtualization para Listas Longas**

**Implementar react-window para:**
- Lista de contatos (>100 itens)
- Lista de conversas
- Lista de campanhas
- Histórico de mensagens

**Ganho Esperado:** Renderiza apenas itens visíveis (10-20 vs 500+)

---

### **FASE 3: Cache Strategy** 💾

#### **3.1 Implementar Cache em Memória**

```typescript
// lib/api-cache.ts
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 30, // 30 segundos
});

export function getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);
  
  return fetcher().then(data => {
    cache.set(key, data);
    return data;
  });
}
```

**Aplicar em:**
- `/api/v1/conversations` (cache 30s)
- `/api/v1/contacts` (cache 60s)
- `/api/v1/campaigns` (cache 120s)
- `/api/v1/dashboard/stats` (cache 300s)

**Ganho Esperado:** 80-90% redução em queries para dados não modificados

---

### **FASE 4: Otimizações Específicas** 🎯

#### **4.1 Debounce e Throttle**

```typescript
// Implementar debounce em todos os filtros
const debouncedSearch = useDeferredValue(searchTerm); // React 18
// ou
const debouncedSearch = useDebounce(searchTerm, 500);
```

#### **4.2 Suspense e Streaming SSR**

```typescript
// Usar React Suspense para carregamento paralelo
<Suspense fallback={<DashboardSkeleton />}>
  <DashboardStats />
</Suspense>
<Suspense fallback={<ChartsSkeleton />}>
  <DashboardCharts />
</Suspense>
```

---

## 🎯 **IMPACTO ESPERADO**

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Tempo de carregamento inicial** | 3-5s | 0.8-1.2s | **70-75%** ✅ |
| **Lista de Contatos (100 itens)** | 2-5s | 0.3-0.5s | **90%** ✅ |
| **Lista de Conversas** | 3-8s | 0.4-0.8s | **85%** ✅ |
| **Dashboard** | 4-6s | 0.6-1s | **80%** ✅ |
| **Kanban Board** | 2-4s | 0.4-0.6s | **85%** ✅ |
| **Bundle Size** | ~1.2MB | ~400KB | **66%** ✅ |

---

## 📝 **ORDEM DE EXECUÇÃO RECOMENDADA**

### **Prioridade MÁXIMA (Fazer Agora):**
1. ✅ Adicionar índices no banco (5 min)
2. ✅ Resolver N+1 em `/api/v1/contacts` (15 min)
3. ✅ Implementar cache básico (20 min)

### **Prioridade ALTA (Esta Semana):**
4. ✅ Otimizar query de conversações (30 min)
5. ✅ Lazy load componentes pesados (30 min)
6. ✅ React.memo em componentes de lista (45 min)

### **Prioridade MÉDIA (Este Mês):**
7. ✅ Virtualization nas listas (60 min)
8. ✅ Otimizar bundle com code splitting (60 min)
9. ✅ Implementar Suspense boundaries (45 min)

---

## 🔬 **FERRAMENTAS DE MEDIÇÃO**

### **Backend:**
```sql
-- Habilitar query logging temporariamente
SET log_statement = 'all';
SET log_duration = on;
SET log_min_duration_statement = 100; -- Log queries >100ms
```

### **Frontend:**
```bash
# Analisar bundle
npm run build
# Usar Next.js Bundle Analyzer
npm install @next/bundle-analyzer --save-dev
```

### **Lighthouse Audit:**
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.8s

---

## ✅ **CHECKLIST DE IMPLEMENTAÇÃO**

- [ ] Criar branch `performance/database-optimization`
- [ ] Adicionar índices SQL (migration script)
- [ ] Resolver N+1 queries em Contacts API
- [ ] Implementar sistema de cache (LRU)
- [ ] Otimizar query de Conversações
- [ ] Lazy load: EmojiPicker, Charts, RichEditor
- [ ] React.memo em: ContactRow, CampaignRow, ConversationItem
- [ ] Debounce em todos os filtros de busca
- [ ] Medir performance antes/depois (Lighthouse)
- [ ] Testar com 1000+ contatos/conversas
- [ ] Deploy gradual (canary)

---

**Responsável:** Replit Agent  
**Estimativa Total:** 4-6 horas de implementação  
**ROI:** Sistema 5-10x mais rápido 🚀
