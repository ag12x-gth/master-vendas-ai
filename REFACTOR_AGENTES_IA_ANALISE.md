# ANÁLISE E REFACTOR DOS AGENTES DE IA

## 🎯 OBJETIVO
Transformar os agentes de IA em assistentes naturais, robustos e eficientes, eliminando comportamentos robóticos e aumentando a confiabilidade do sistema.

## 🔍 PROBLEMAS IDENTIFICADOS

### 🚨 CRÍTICOS (Prioridade Alta)

#### 1. **Sistema de Fallback Determinístico Inexistente**
**Problema:** Agentes falham completamente quando LLM não está disponível
- `runContactsAgent`: Tem fast-path para contagem, mas outros agentes não
- `runCampaignAgent`: Implementação parcial de fallbacks
- `runDataAnalystAgent`: Totalmente dependente de LLM
- `runUtilityAgent`: Sem fallbacks para cálculos simples

**Impacto:** Sistema fica inutilizável durante indisponibilidades de IA

**Solução:**
```typescript
// Implementar fallbacks determinísticos para cada agente
const DETERMINISTIC_PATTERNS = {
  contacts: {
    count: /^(quantos contatos|total de contatos)/i,
    list: /^(listar contatos|mostrar contatos)/i
  },
  campaigns: {
    count: /^(quantas campanhas|total de campanhas)/i,
    list: /^(listar campanhas|mostrar campanhas)/i
  },
  utility: {
    calc: /^(calcular|quanto é|\d+\s*[+\-*/]\s*\d+)/i,
    time: /^(que horas|data atual|agora)/i
  }
};
```

#### 2. **Inconsistências de Tipos Críticas**
**Problema:** Schemas Drizzle vs Enums das ferramentas não batem
- `campaigns.status` no DB: text (sem enum)
- `internal-tools.ts`: enum ['draft', 'active', 'paused', 'completed']
- `campaign-agent.ts`: usa ['SENDING', 'COMPLETED', 'SCHEDULED', 'FAILED']

**Impacto:** Erros de execução, dados inconsistentes

**Solução:**
```typescript
// schema.ts - Adicionar enums consistentes
export const campaignStatusEnum = pgEnum('campaign_status', [
  'DRAFT', 'SCHEDULED', 'SENDING', 'COMPLETED', 'PAUSED', 'FAILED'
]);

export const conversationStatusEnum = pgEnum('conversation_status', [
  'NEW', 'OPEN', 'PENDING', 'RESOLVED', 'CLOSED'
]);
```

#### 3. **Tratamento de Erros Inconsistente**
**Problema:** Cada agente trata erros diferentemente
- `contacts-agent.ts`: Usa classe `AgentError` com steps
- `campaign-agent.ts`: Try/catch simples
- `data-analyst-agent.ts`: Sem tratamento específico
- Logs inconsistentes, falta rastreabilidade

**Solução:**
```typescript
// Criar classe base padronizada
export class AgentError extends Error {
  constructor(
    message: string,
    public agent: string,
    public step: string,
    public requestId: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

// Logger padronizado
export const agentLogger = {
  info: (requestId: string, agent: string, message: string, data?: any) => {
    console.info(`[${agent} RequestId: ${requestId}] ${message}`, data);
  },
  error: (requestId: string, agent: string, error: Error, step?: string) => {
    console.error(`[${agent} RequestId: ${requestId}] Error at ${step}:`, error);
  }
};
```

### ⚡ ALTOS (Prioridade Alta)

#### 4. **Respostas Não Naturais**
**Problema:** System prompts muito rígidos, respostas robóticas
- Prompts atuais: "Fale em português do Brasil, cordial e direto, sem emojis"
- Estrutura muito rígida: "reconheça em UMA frase", "finalize com pergunta"
- Falta contexto conversacional

**Solução:**
```typescript
const NATURAL_SYSTEM_PROMPTS = {
  campaignAgent: `
Você é um assistente especializado em campanhas de marketing.

Sua personalidade:
- Proativo e prestativo
- Explica de forma clara sem ser técnico demais
- Usa linguagem natural e conversacional
- Antecipa necessidades do usuário

Quando o usuário pedir sobre campanhas:
1. Entenda a intenção real (mesmo se mal expressa)
2. Forneça informações úteis e contextualizadas
3. Sugira próximos passos relevantes
4. Mantenha tom amigável mas profissional

Exemplos de respostas naturais:
- "Encontrei 5 campanhas ativas. A mais recente foi enviada ontem e teve 89% de entrega. Quer ver os detalhes?"
- "Suas campanhas estão indo bem! Tem 3 rodando agora. Posso mostrar o desempenho de cada uma?"
`,

  contactsAgent: `
Você é um assistente especializado em gestão de contatos.

Sua abordagem:
- Seja direto mas amigável
- Forneça números de forma contextualizada
- Sugira ações práticas
- Antecipe perguntas relacionadas

Quando falar sobre contatos:
- Sempre contextualize os números ("Você tem 1.247 contatos, sendo 89% ativos")
- Sugira segmentações úteis quando relevante
- Ofereça próximos passos práticos
`
};
```

#### 5. **Cache Inteligente Ausente**
**Problema:** Operações repetitivas sem cache
- Contagem de contatos: Query pesada executada a cada pedido
- Listagem de campanhas: Sem cache por status
- Dados raramente mudam, mas sempre re-consultados

**Solução:**
```typescript
// Implementar cache com TTL inteligente
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class AgentCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  set<T>(key: string, data: T, ttlSeconds: number = 300) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  invalidatePattern(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Cache keys estratégicos
const CACHE_KEYS = {
  contactCount: (companyId: string) => `contacts:count:${companyId}`,
  campaignsList: (companyId: string, status?: string) => 
    `campaigns:list:${companyId}:${status || 'all'}`,
  conversationsCount: (companyId: string) => `conversations:count:${companyId}`
};
```

### 🔧 MÉDIOS (Prioridade Média)

#### 6. **Interface Inconsistente com Vercel AI SDK**
**Problema:** Agentes usam padrões diferentes
- Alguns usam `tool()` corretamente
- Outros fazem chamadas diretas ao DB
- Inconsistência na estrutura de resposta

#### 7. **Contexto Conversacional Ausente**
**Problema:** Cada query tratada isoladamente
- Não lembra interações anteriores
- Não mantém contexto da conversa
- Usuário precisa repetir informações

#### 8. **Inferência de Agentes Primitiva**
**Problema:** Sistema baseado apenas em keywords
- Falha com sinônimos
- Não entende contexto semântico
- Pode ser melhorado com embeddings

### 📊 BAIXOS (Prioridade Baixa)

#### 9. **Métricas de Performance Ausentes**
#### 10. **Testes Automatizados Insuficientes**

## 🛠️ PLANO DE IMPLEMENTAÇÃO

### Fase 1: Estabilização (Críticos)
1. **Implementar fallbacks determinísticos** em todos os agentes
2. **Corrigir inconsistências de tipos** no schema
3. **Padronizar tratamento de erros** com requestId

### Fase 2: Naturalização (Altos)
4. **Reescrever system prompts** para respostas naturais
5. **Implementar cache inteligente** para operações frequentes

### Fase 3: Otimização (Médios)
6. **Unificar interface** com Vercel AI SDK
7. **Implementar contexto conversacional**
8. **Melhorar inferência** com embeddings

### Fase 4: Monitoramento (Baixos)
9. **Adicionar métricas** de performance
10. **Criar testes automatizados**

## 🎯 RESULTADOS ESPERADOS

### Antes (Atual)
- ❌ Falha total quando LLM indisponível
- ❌ Respostas robóticas e rígidas
- ❌ Erros de tipos frequentes
- ❌ Logs inconsistentes
- ❌ Performance ruim (queries repetitivas)

### Depois (Objetivo)
- ✅ Funciona mesmo sem LLM (fallbacks)
- ✅ Respostas naturais e contextualizadas
- ✅ Tipos consistentes e seguros
- ✅ Logs padronizados com rastreabilidade
- ✅ Performance otimizada (cache inteligente)
- ✅ Comportamento humano e inteligente

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Críticos (Semana 1)
- [ ] Criar `AgentFallbacks` class com padrões determinísticos
- [ ] Adicionar enums no schema.ts para status
- [ ] Implementar `AgentError` e `agentLogger` padronizados
- [ ] Atualizar todos os agentes para usar nova estrutura

### Altos (Semana 2)
- [ ] Reescrever system prompts para naturalidade
- [ ] Implementar `AgentCache` class
- [ ] Integrar cache em operações frequentes
- [ ] Testar respostas naturais vs robóticas

### Médios (Semana 3-4)
- [ ] Padronizar interface com Vercel AI SDK
- [ ] Implementar contexto conversacional
- [ ] Melhorar inferência de agentes

### Baixos (Semana 5+)
- [ ] Adicionar métricas de performance
- [ ] Criar suite de testes automatizados

---

**Meta Final:** Transformar agentes robóticos em assistentes inteligentes que funcionam de forma natural, robusta e eficiente, proporcionando uma experiência conversacional genuinamente humana.