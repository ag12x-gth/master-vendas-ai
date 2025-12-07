# Diagnóstico e Plano de Integração - Voice AI Platform API

## Status da Implementação

| Fase | Status | Descrição |
|------|--------|-----------|
| **Fase 1: Infraestrutura Base** | ✅ CONCLUÍDA | Setup, cliente API, tabelas DB, teste de conexão |
| **Fase 2: APIs de Backend** | ✅ CONCLUÍDA | CRUD de agentes, chamadas, analytics, configuração |
| **Fase 3: Interface UI** | ✅ CONCLUÍDA | Páginas de gestão de agentes com CRUD completo |
| **Fase 4: Webhooks** | ✅ CONCLUÍDA | 4 webhooks implementados (Retell, Twilio Status/Incoming, Custom) |
| **Fase 5: Testes E2E** | ✅ CONCLUÍDA | 6 testes E2E aprovados, sistema totalmente validado |

### Artefatos Criados na Fase 1

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/voice-ai-platform.ts` | Cliente VoiceAIPlatformClient com todos os endpoints |
| `src/lib/db/schema.ts` | Tabelas `voice_agents` e `voice_calls` |
| `src/app/api/v1/voice/test-connection/route.ts` | Endpoint para testar conexão |

### Artefatos Criados na Fase 2

| Arquivo | Descrição |
|---------|-----------|
| `src/app/api/v1/voice/agents/route.ts` | GET (listar) e POST (criar) agentes |
| `src/app/api/v1/voice/agents/[id]/route.ts` | GET, PATCH, DELETE por ID |
| `src/app/api/v1/voice/calls/route.ts` | GET listar chamadas com paginação |
| `src/app/api/v1/voice/calls/[id]/route.ts` | GET chamada por ID |
| `src/app/api/v1/voice/calls/test/route.ts` | POST iniciar chamada de teste |
| `src/app/api/v1/voice/analytics/route.ts` | GET analytics (totalCalls, duration, cost) |
| `src/app/api/v1/voice/config/route.ts` | GET configuração e status |
| `src/app/api/v1/voice/config/test-providers/route.ts` | POST testar Retell/Twilio/OpenAI |
| `src/app/api/v1/voice/config/external-resources/route.ts` | GET organizações, agentes Retell, números Twilio |

### Evidências de Testes da Fase 2 (2025-12-07)

| Teste | Resultado | Evidência |
|-------|-----------|-----------|
| Listar Agentes | ✅ OK | 7 agentes retornados |
| Filtrar por Status | ✅ OK | 1 agente ativo (Suporte AI Premium) |
| Buscar Agente por ID | ✅ OK | Retorna agente com todos os campos |
| Criar Agente | ✅ OK | "Agente Fase2 Test" criado |
| Atualizar Agente | ✅ OK | Nome e temperature alterados |
| Deletar Agente | ✅ OK | Agente arquivado com sucesso |
| Listar Chamadas | ✅ OK | 11 chamadas com metadata Retell |
| Buscar Chamada por ID | ✅ OK | Retorna chamada com dados do agente |
| Analytics | ✅ OK | 11 chamadas, breakdown por status |
| Config Status | ✅ OK | Retell/Twilio/OpenAI configurados |
| External Resources | ✅ OK | 2 orgs, 1 agente Retell, 6 números Twilio |
| Test Providers | ✅ OK | Retell OK (1 agente), Twilio OK (conta ativa), OpenAI OK (103 modelos) |
| Validação Zod | ✅ OK | Erros específicos por campo |

### Artefatos Criados na Fase 3

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useVoiceAgents.ts` | Hook React para CRUD de agentes e analytics |
| `src/components/voice-agents/VoiceAgentsTable.tsx` | Tabela de agentes com edição e exclusão |
| `src/components/voice-agents/VoiceAgentDialog.tsx` | Diálogo para criar/editar agentes |
| `src/components/voice-agents/VoiceAgentKPIs.tsx` | Cards de métricas de agentes |
| `src/components/voice-agents/index.ts` | Exportações dos componentes |
| `src/app/(main)/voice-calls/page.tsx` | Página atualizada com aba "Agentes de Voz" |

### Evidências de Testes da Fase 3 (2025-12-07)

| Teste | Resultado | Evidência |
|-------|-----------|-----------|
| Hook useVoiceAgents | ✅ OK | Carrega agentes e analytics automaticamente |
| Criar Agente via UI | ✅ OK | "Agente Fase3 UI Test" criado |
| Atualizar Agente via UI | ✅ OK | Nome e temperature alterados |
| Deletar Agente via UI | ✅ OK | Agente arquivado com sucesso |
| Tabela de Agentes | ✅ OK | Lista 8 agentes com status e tipo |
| KPIs de Agentes | ✅ OK | Mostra ativos, total, receptivos, ativos |
| Diálogo de Agente | ✅ OK | Formulário com validação e campos |
| Integração com APIs | ✅ OK | Logs confirmam chamadas CRUD |

### Artefatos Criados na Fase 4

| Arquivo | Descrição |
|---------|-----------|
| `src/app/api/v1/voice/webhooks/retell/route.ts` | Webhook Retell (call_started, call_ended, call_analyzed) |
| `src/app/api/v1/voice/webhooks/twilio/status/route.ts` | Webhook Twilio Status (8 status suportados) |
| `src/app/api/v1/voice/webhooks/twilio/incoming/route.ts` | Webhook Twilio Incoming (TwiML routing) |
| `src/app/api/v1/voice/webhooks/custom/[orgId]/route.ts` | Webhook Custom Multi-tenant (7 eventos) |

### Evidências de Testes da Fase 4 (2025-12-07)

| Teste | Resultado | Evidência |
|-------|-----------|-----------|
| Retell GET | ✅ OK | Status active, 5 eventos suportados |
| Retell POST call_started | ✅ OK | CallId processado em 111ms |
| Retell POST call_ended | ✅ OK | Transcript e recording processados |
| Retell POST call_analyzed | ✅ OK | Summary + sentiment + custom data |
| Twilio Status GET | ✅ OK | Status active, 8 status suportados |
| Twilio Status POST | ✅ OK | TwiML response para completed |
| Twilio Incoming GET | ✅ OK | Status active, roteamento ativo |
| Twilio Incoming POST | ✅ OK | TwiML Say + Record (fallback) |
| Custom GET | ✅ OK | 7 eventos, segurança HMAC |
| Custom POST call.started | ✅ OK | OrgId demo-org-id processado |
| Custom POST recording.ready | ✅ OK | Sync com Voice AI Platform |

### Evidências de Testes da Fase 5 - E2E (2025-12-07)

| Teste | Resultado | Evidência |
|-------|-----------|-----------|
| 5.1 Fluxo Completo | ✅ OK | Criar agente → Chamada → Webhooks funcionando |
| 5.2 Sincronização | ✅ OK | 11 chamadas, 12 agentes sincronizados |
| 5.3 API de Chamadas | ✅ OK | Endpoint de teste com validação |
| 5.4 Analytics | ✅ OK | 11 chamadas, breakdown por status |
| 5.5 Tratamento de Erros | ✅ OK | Validação de payload, TwiML fallback |
| 5.6 Validação Final | ✅ OK | 8 endpoints HTTP 200, respostas corretas |

### Estatísticas Finais

| Métrica | Valor |
|---------|-------|
| Agentes na plataforma | 12 |
| Chamadas registradas | 11 |
| Webhooks implementados | 4 |
| Eventos suportados | 20 |
| Endpoints funcionando | 8 |
| Testes E2E aprovados | 6/6 |

### Configuração de Ambiente

```env
VOICE_AI_PLATFORM_URL=https://plataformai.global
VOICE_AI_PLATFORM_API_KEY=<configurado como secret>
```

---

## 1. Diagnóstico do Sistema Atual

### 1.1 Infraestrutura Existente no Master IA

| Componente | Status | Descrição |
|------------|--------|-----------|
| **Página Voice Calls** | ✅ Existe | `/voice-calls` - Dashboard completo com KPIs, histórico e analytics |
| **Hook useVapiCalls** | ✅ Existe | Gerenciamento de chamadas com métricas e iniciação |
| **Tabela vapiCalls** | ✅ Existe | Schema completo com transcripts, análise e metadata |
| **APIs VAPI** | ✅ Existe | `/api/vapi/*` - Endpoints para metrics, history, initiate-call, webhook |
| **Circuit Breaker** | ✅ Existe | Proteção contra falhas em cascata |
| **Componentes UI** | ✅ Existe | CallKPIDashboard, CallHistoryTable, VoiceCallsAnalytics, BulkCallDialog |

### 1.2 Integração Atual (VAPI - api.vapi.ai)

O Master IA já possui integração com **VAPI** (api.vapi.ai) que oferece:
- Criação dinâmica de assistentes por chamada
- Vozes via 11Labs
- Transcrição via Deepgram
- Webhooks para eventos de chamada
- Análise pós-chamada

### 1.3 API Voice AI Platform (plataformai.global)

**URL Base**: `https://plataformai.global`
**Status**: ✅ Online (health check OK)
**Autenticação**: Header `X-API-KEY`

| Recurso | Endpoints | Funcionalidade |
|---------|-----------|----------------|
| **Agentes** | CRUD `/api/agents` | Gerenciamento de agentes de IA persistentes |
| **Chamadas** | `/api/calls/*` | Histórico, analytics e chamadas de teste |
| **Organizações** | `/api/organizations` | Multi-tenancy |
| **Configuração** | `/api/config/*` | Status e teste de integrações |
| **Webhooks** | `/api/webhooks/*` | Eventos de voz, telefonia e customizados |
| **Retell.ai** | `/api/integrations/retell/*` | Agentes, chamadas, números |

### 1.4 Diferenças entre APIs

| Aspecto | VAPI Atual | Voice AI Platform |
|---------|------------|-------------------|
| Agentes | Criados dinamicamente por chamada | Persistentes com CRUD completo |
| Vozes | 11Labs | Retell.ai (11Labs, Azure Neural) |
| Telefonia | Integrado | Twilio separado |
| Multi-tenant | Não | Sim (Organizations) |
| Analytics | Básico | Avançado (quality score, sentiment, latency) |
| Webhooks | Um endpoint | Múltiplos especializados |

---

## 2. Análise de Viabilidade

### 2.1 Pontos de Sinergia

1. **Estrutura de Dados Compatível**: Campos similares entre `vapiCalls` e dados da Voice AI Platform
2. **Componentes Reutilizáveis**: Dashboard, gráficos e tabelas já existentes
3. **Arquitetura Preparada**: Circuit breaker, cache e padrões de API já implementados

### 2.2 Gaps a Resolver

| Gap | Impacto | Solução |
|-----|---------|---------|
| Tabela para agentes de voz | Alto | Criar `voiceAgents` no schema |
| Serviço de integração | Alto | Criar `voice-ai-platform.service.ts` |
| Configuração multi-provider | Médio | Adicionar env vars e UI de config |
| Webhooks Retell/Twilio | Médio | Criar endpoints receptores |
| Sincronização de dados | Baixo | Mapeamento entre schemas |

---

## 3. Plano de Implementação em Fases

### FASE 1: Infraestrutura Base (2-3 dias)

#### 1.1 Configuração de Ambiente

```env
# Adicionar ao .env
VOICE_AI_PLATFORM_URL=https://plataformai.global
VOICE_AI_PLATFORM_API_KEY=sua_chave_api
```

#### 1.2 Novo Schema de Banco

```typescript
// Adicionar ao schema.ts

// Agentes de Voz (Voice AI Platform)
export const voiceAgents = pgTable('voice_agents', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    externalId: text('external_id'), // ID na plataforma externa
    name: varchar('name', { length: 255 }).notNull(),
    type: text('type').notNull().default('inbound'), // inbound, outbound, transfer
    status: text('status').notNull().default('active'),
    systemPrompt: text('system_prompt').notNull(),
    firstMessage: text('first_message'),
    voiceId: varchar('voice_id', { length: 100 }).default('pt-BR-FranciscaNeural'),
    llmProvider: varchar('llm_provider', { length: 50 }).default('openai'),
    llmModel: varchar('llm_model', { length: 50 }).default('gpt-4'),
    temperature: decimal('temperature', { precision: 3, scale: 2 }).default('0.7'),
    maxTokens: integer('max_tokens').default(500),
    interruptSensitivity: decimal('interrupt_sensitivity', { precision: 3, scale: 2 }).default('0.5'),
    responseDelay: integer('response_delay').default(100),
    retellAgentId: text('retell_agent_id'), // ID do agente no Retell.ai
    config: jsonb('config'), // Configurações adicionais
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    archivedAt: timestamp('archived_at'),
});

// Chamadas de Voz Unificadas (suporta VAPI e Voice AI Platform)
export const voiceCalls = pgTable('voice_calls', {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    agentId: text('agent_id').references(() => voiceAgents.id, { onDelete: 'set null' }),
    contactId: text('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    conversationId: text('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
    
    // IDs Externos
    externalCallId: text('external_call_id'), // ID na plataforma externa
    retellCallId: text('retell_call_id'),
    twilioCallSid: text('twilio_call_sid'),
    
    // Dados da Chamada
    direction: text('direction').notNull().default('outbound'), // inbound, outbound
    fromNumber: varchar('from_number', { length: 20 }),
    toNumber: varchar('to_number', { length: 20 }).notNull(),
    customerName: varchar('customer_name', { length: 255 }),
    
    // Status e Timing
    status: text('status').notNull().default('initiated'), // initiated, ringing, ongoing, ended, failed
    startedAt: timestamp('started_at'),
    endedAt: timestamp('ended_at'),
    duration: integer('duration'), // em segundos
    
    // Análise
    transcript: jsonb('transcript'),
    recordingUrl: text('recording_url'),
    summary: text('summary'),
    qualityScore: decimal('quality_score', { precision: 5, scale: 2 }),
    sentimentScore: decimal('sentiment_score', { precision: 4, scale: 3 }),
    latencyMs: integer('latency_ms'),
    interruptionsCount: integer('interruptions_count'),
    
    // Custo e Resultado
    cost: decimal('cost', { precision: 10, scale: 4 }),
    resolved: boolean('resolved'),
    disconnectReason: text('disconnect_reason'),
    
    // Metadata
    provider: text('provider').notNull().default('voice-ai-platform'), // vapi, voice-ai-platform
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});
```

#### 1.3 Serviço de Integração

Criar `src/lib/voice-ai-platform.ts`:

```typescript
// Cliente para Voice AI Platform API
export class VoiceAIPlatformClient {
    private baseUrl: string;
    private apiKey: string;
    
    constructor() {
        this.baseUrl = process.env.VOICE_AI_PLATFORM_URL || 'https://plataformai.global';
        this.apiKey = process.env.VOICE_AI_PLATFORM_API_KEY || '';
    }
    
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'X-API-KEY': this.apiKey,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        
        if (!response.ok) {
            throw new Error(`Voice AI Platform Error: ${response.status}`);
        }
        
        return response.json();
    }
    
    // Agentes
    async listAgents() { return this.request('/api/agents'); }
    async createAgent(data: CreateAgentDto) { return this.request('/api/agents', { method: 'POST', body: JSON.stringify(data) }); }
    async getAgent(id: string) { return this.request(`/api/agents/${id}`); }
    async updateAgent(id: string, data: UpdateAgentDto) { return this.request(`/api/agents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
    async deleteAgent(id: string) { return this.request(`/api/agents/${id}`, { method: 'DELETE' }); }
    
    // Chamadas
    async listCalls() { return this.request('/api/calls'); }
    async getCall(id: string) { return this.request(`/api/calls/${id}`); }
    async testCall(data: TestCallDto) { return this.request('/api/calls/test', { method: 'POST', body: JSON.stringify(data) }); }
    async getAnalytics() { return this.request('/api/calls/analytics'); }
    
    // Configuração
    async getConfig() { return this.request('/api/config'); }
    async getStatus() { return this.request('/api/config/status'); }
    async testVoiceProvider() { return this.request('/api/config/test-voice-provider', { method: 'POST' }); }
    async testTelephonyProvider() { return this.request('/api/config/test-telephony-provider', { method: 'POST' }); }
    
    // Health
    async health() { return this.request('/health'); }
}

export const voiceAIPlatform = new VoiceAIPlatformClient();
```

---

### FASE 2: APIs de Backend (2-3 dias)

#### 2.1 Estrutura de Rotas

```
src/app/api/v1/voice/
├── agents/
│   ├── route.ts              # GET (list), POST (create)
│   └── [id]/
│       └── route.ts          # GET, PATCH, DELETE
├── calls/
│   ├── route.ts              # GET (list)
│   ├── test/
│   │   └── route.ts          # POST (iniciar chamada teste)
│   ├── analytics/
│   │   └── route.ts          # GET
│   └── [id]/
│       └── route.ts          # GET
├── config/
│   ├── route.ts              # GET (status)
│   └── test/
│       └── route.ts          # POST (testar conexões)
└── webhooks/
    ├── retell/
    │   └── route.ts          # POST (eventos Retell)
    ├── twilio/
    │   ├── status/
    │   │   └── route.ts      # POST (status chamada)
    │   └── incoming/
    │       └── route.ts      # POST (chamada recebida)
    └── custom/
        └── [orgId]/
            └── route.ts      # POST (webhook customizado)
```

#### 2.2 Exemplo de API de Agentes

```typescript
// src/app/api/v1/voice/agents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { voiceAgents } from '@/lib/db/schema';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const session = await requireAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Buscar agentes locais
    const agents = await db.select().from(voiceAgents)
        .where(eq(voiceAgents.companyId, session.companyId));
    
    return NextResponse.json({ agents });
}

export async function POST(request: NextRequest) {
    const session = await requireAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await request.json();
    
    // 1. Criar agente na plataforma externa
    const externalAgent = await voiceAIPlatform.createAgent({
        name: body.name,
        type: body.type,
        systemPrompt: body.systemPrompt,
        firstMessage: body.firstMessage,
        voiceId: body.voiceId,
        llmModel: body.llmModel,
        temperature: body.temperature,
    });
    
    // 2. Salvar localmente com referência
    const [agent] = await db.insert(voiceAgents).values({
        companyId: session.companyId,
        externalId: externalAgent.id,
        ...body,
    }).returning();
    
    return NextResponse.json({ agent }, { status: 201 });
}
```

---

### FASE 3: Interface do Usuário (3-4 dias)

#### 3.1 Componentes a Criar/Adaptar

| Componente | Ação | Descrição |
|------------|------|-----------|
| `VoiceAgentsList` | Criar | Lista de agentes com CRUD |
| `VoiceAgentForm` | Criar | Formulário de criação/edição |
| `VoiceAgentCard` | Criar | Card individual do agente |
| `CallHistoryTable` | Adaptar | Suporte a novo schema |
| `VoiceCallsAnalytics` | Adaptar | Métricas expandidas |
| `VoiceConfigPanel` | Criar | Status e teste de integrações |

#### 3.2 Páginas

```
src/app/(main)/voice-calls/
├── page.tsx                  # Dashboard principal
├── agents/
│   ├── page.tsx              # Lista de agentes
│   ├── new/
│   │   └── page.tsx          # Criar agente
│   └── [id]/
│       ├── page.tsx          # Detalhes do agente
│       └── edit/
│           └── page.tsx      # Editar agente
└── settings/
    └── page.tsx              # Configurações Voice AI
```

---

### FASE 4: Webhooks e Sincronização (2 dias)

#### 4.1 Webhooks Receptores

| Webhook | Endpoint Local | Função |
|---------|----------------|--------|
| Retell Events | `/api/v1/voice/webhooks/retell` | call_started, call_ended, call_analyzed |
| Twilio Status | `/api/v1/voice/webhooks/twilio/status` | Status da chamada |
| Twilio Incoming | `/api/v1/voice/webhooks/twilio/incoming` | Chamada recebida |
| Custom | `/api/v1/voice/webhooks/custom/[orgId]` | Eventos personalizados |

#### 4.2 Payload de Webhook (Retell)

```typescript
interface RetellWebhookPayload {
    event: 'call_started' | 'call_ended' | 'call_analyzed';
    call_id: string;
    agent_id: string;
    from_number: string;
    to_number: string;
    direction: 'inbound' | 'outbound';
    start_timestamp?: number;
    end_timestamp?: number;
    duration_ms?: number;
    transcript?: Array<{ role: string; content: string; timestamp: number }>;
    recording_url?: string;
    call_analysis?: {
        call_summary: string;
        user_sentiment: string;
        call_successful: boolean;
        custom_analysis_data?: Record<string, any>;
    };
}
```

---

### FASE 5: Migração e Testes (2-3 dias)

#### 5.1 Migração de Dados

1. **Manter tabela `vapiCalls` existente** (compatibilidade)
2. **Criar nova tabela `voiceCalls`** (unificada)
3. **Migração gradual** de dados históricos

#### 5.2 Testes E2E

```typescript
// tests/e2e/voice-ai-platform.test.ts
describe('Voice AI Platform Integration', () => {
    it('should create agent via API', async () => {
        const response = await fetch(`${BASE_URL}/api/v1/voice/agents`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                name: 'Agente Teste',
                type: 'inbound',
                systemPrompt: 'Você é um assistente de testes.',
            }),
        });
        expect(response.status).toBe(201);
    });
    
    it('should initiate test call', async () => {
        const response = await fetch(`${BASE_URL}/api/v1/voice/calls/test`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                agentId: 'agent-uuid',
                toNumber: '+5511999999999',
            }),
        });
        expect(response.status).toBe(200);
    });
    
    it('should receive webhook and update call', async () => {
        const response = await fetch(`${BASE_URL}/api/v1/voice/webhooks/retell`, {
            method: 'POST',
            body: JSON.stringify({
                event: 'call_ended',
                call_id: 'retell-call-id',
                duration_ms: 120000,
            }),
        });
        expect(response.status).toBe(200);
    });
});
```

---

## 4. Cronograma Estimado

| Fase | Duração | Dependências |
|------|---------|--------------|
| Fase 1: Infraestrutura | 2-3 dias | - |
| Fase 2: APIs Backend | 2-3 dias | Fase 1 |
| Fase 3: Interface UI | 3-4 dias | Fase 2 |
| Fase 4: Webhooks | 2 dias | Fase 2 |
| Fase 5: Testes | 2-3 dias | Todas |
| **Total** | **11-15 dias** | - |

---

## 5. Requisitos de Ambiente

### 5.1 Variáveis de Ambiente Necessárias

```env
# Voice AI Platform (plataformai.global)
VOICE_AI_PLATFORM_URL=https://plataformai.global
VOICE_AI_PLATFORM_API_KEY=sua_chave_api

# Webhooks (URLs públicas para receber eventos)
VOICE_WEBHOOK_BASE_URL=https://seu-master-ia.replit.app

# Opcional - se usar Twilio diretamente
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Opcional - se usar Retell.ai diretamente
RETELL_API_KEY=
```

### 5.2 Dependências de Pacotes

```json
{
  "dependencies": {
    // Já existentes no projeto - nenhuma nova necessária
  }
}
```

---

## 6. Considerações de Segurança

1. **API Key**: Armazenar como secret, nunca expor no frontend
2. **Webhooks**: Validar origem das requisições (IP whitelist ou assinatura)
3. **Rate Limiting**: Aplicar nos endpoints de chamada
4. **Logs**: Não registrar números de telefone completos em logs públicos
5. **Criptografia**: Dados sensíveis em trânsito (HTTPS) e em repouso (AES-256)

---

## 7. Próximos Passos Recomendados

1. **Obter API Key** da plataformai.global
2. **Configurar variáveis de ambiente**
3. **Iniciar Fase 1** - Schema e serviço de integração
4. **Testar conexão** com `/health` endpoint
5. **Implementar progressivamente** as demais fases

---

## 8. Contatos e Recursos

| Recurso | URL |
|---------|-----|
| Documentação API | https://plataformai.global/doc-setup |
| Swagger UI | https://plataformai.global/api |
| Health Check | https://plataformai.global/health |
