# 📋 PLANO: Credenciais por Empresa (Aguardando Aprovação)

**Data**: 12/12/2025 | **Status**: 🟡 AGUARDANDO OK
**Modo**: BUILD MODE Fast Mode | **Etapa**: INVESTIGAÇÃO + PLANEJAMENTO CONCLUÍDO

---

## 🎯 OBJETIVO

Permitir que cada empresa cadastre suas **próprias chaves/credenciais** para:
- ✅ WhatsApp/ligação (Twilio, RetellAI, API Cloud)
- ✅ Email (Resend, Gmail)
- ✅ OpenAI (chave própria)

**Situação Atual**:
- 225 credenciais universais (1 set para todas as 45 empresas)
- Novo requisito: Cada empresa pode ter suas próprias credenciais

---

## 📊 INVESTIGAÇÃO REALIZADA

### 1️⃣ Estrutura Atual do Banco

```sql
Tabela: ai_credentials
├─ id (UUID) - identificador único
├─ company_id (TEXT) - empresa proprietária
├─ name (TEXT) - nome amigável
├─ provider (TEXT) - tipo: OPENAI, TWILIO, RETELL, RESEND, GMAIL
├─ api_key (TEXT) - chave encriptada
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

STATUS ATUAL: ✅ Suporta múltiplas credenciais por empresa
(Não precisa mudar schema)
```

### 2️⃣ Endpoints Existentes

```
✅ GET  /api/v1/ia/credentials        → Lista credenciais da empresa
✅ POST /api/v1/ia/credentials        → Cria nova credencial
✅ PUT  /api/v1/ia/credentials/[id]   → Atualiza credencial
✅ DEL  /api/v1/ia/credentials/[id]   → Deleta credencial

STATUS: ✅ Todos existem, suportam company_id
```

### 3️⃣ Validação Atual do POST

```typescript
// Arquivo: src/app/api/v1/ia/credentials/route.ts:13
credentialSchema = z.enum(['GEMINI', 'OPENAI'])

PROBLEMA: ❌ Só aceita GEMINI e OPENAI
SOLUÇÃO: Adicionar TWILIO, RETELL, RESEND, GMAIL, API_CLOUD
```

### 4️⃣ Componentes UI Existentes

```
src/app/(main)/settings/page.tsx
├─ Configurações gerais da empresa
└─ Pode reutilizar para credenciais

BUSCAR: Formulário para cadastro de credenciais
```

---

## 🔧 PLANO DE EXECUÇÃO (5 FASES)

### FASE 1: Expandir Schema de Validação ⏱️ ~5 min

**Arquivo**: `src/app/api/v1/ia/credentials/route.ts`

```typescript
// ANTES (linha 13):
provider: z.enum(['GEMINI', 'OPENAI']),

// DEPOIS:
provider: z.enum([
  'GEMINI', 
  'OPENAI',      // IA
  'TWILIO',      // SMS + Ligação
  'RETELL',      // Ligação AI
  'RESEND',      // Email
  'GMAIL',       // Gmail API
  'API_CLOUD'    // WhatsApp
]),

apiKey: z.string().min(1, 'A chave de API é obrigatória.'),
// + adicionar campos opcionais conforme provider
```

**Ações**:
- ✅ Adicionar 5 novos providers ao enum
- ✅ Manter compatibilidade backward-compatible

---

### FASE 2: Criar Componente UI de Configuração ⏱️ ~10 min

**Novo arquivo**: `src/components/credentials/credential-form.tsx`

```typescript
// Componente para formulário de credenciais
// Renderizar campos diferentes conforme provider:

IF provider === 'TWILIO':
  └─ Campos: Account SID, Auth Token, From Number
  
IF provider === 'RETELL':
  └─ Campos: API Key, Workspace ID
  
IF provider === 'RESEND':
  └─ Campos: API Key
  
IF provider === 'GMAIL':
  └─ Campos: Service Account JSON
  
IF provider === 'API_CLOUD':
  └─ Campos: Business Account ID, Phone Number ID, etc
```

**Componente UI**:
- Select para escolher provider
- Campos dinâmicos por provider
- Validação por provider
- Máscara para API keys (mostrar últimos 4 dígitos)
- Botão Testar Conexão (opcional)

---

### FASE 3: Criar Página Settings para Credenciais ⏱️ ~10 min

**Novo arquivo**: `src/app/(main)/settings/credentials/page.tsx`

```typescript
// Layout:
┌─────────────────────────────────────┐
│ 🔐 Minha Credenciais                │
├─────────────────────────────────────┤
│                                     │
│ Lista de Credenciais Existentes:    │
│ ┌─────────────────────────────────┐ │
│ │ Name: OpenAI Universal          │ │
│ │ Provider: OPENAI                │ │
│ │ Key: sk-...xxxx                 │ │
│ │ [Editar] [Deletar]              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Adicionar Nova Credencial ─────┐ │
│ │ [Formulário com CredentialForm] │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

### FASE 4: Atualizar Lógica de Uso de Credenciais ⏱️ ~15 min

**Arquivos afetados**:
- `src/lib/campaign-sender.ts` - Buscar credenciais por provider
- `src/lib/retell-service.ts` - Usar credenciais da empresa
- `src/lib/twilio-service.ts` - Usar credenciais da empresa
- `src/services/voice-retry.service.ts` - Usar credenciais da empresa

**Padrão**:
```typescript
// ANTES: Usar env vars globais
const apiKey = process.env.RETELL_API_KEY || '';

// DEPOIS: Buscar credenciais da empresa
const credentials = await getCompanyCredential(companyId, 'RETELL');
if (!credentials) {
  throw new Error('Credenciais RETELL não configuradas para empresa');
}
const apiKey = decrypt(credentials.api_key);
```

---

### FASE 5: Testes e Validação ⏱️ ~10 min

```
✅ Teste 1: POST credencial TWILIO
├─ Criar: POST /api/v1/ia/credentials
├─ Body: {provider: 'TWILIO', apiKey: '...', ...}
└─ Resultado: 201 com ID da credencial

✅ Teste 2: GET credenciais
├─ GET /api/v1/ia/credentials
└─ Resultado: Lista com mix de OPENAI + TWILIO + RETELL

✅ Teste 3: Usar credencial em campanha
├─ Campanha Twilio dispara com credencial da empresa
└─ Resultado: SMS enviado com a conta da empresa

✅ Teste 4: Fallback
├─ Empresa sem credencial TWILIO
└─ Resultado: Erro claro + opção de configurar
```

---

## 📌 DECISÕES DE DESIGN

### 1. Credenciais Universais vs. Por-Empresa

```
ESTRATÉGIA PROPOSTA: HÍBRIDA

┌─ Ordem de Prioridade ──────────────────────┐
│ 1. Credenciais da Empresa (se existir)     │
│ 2. Credenciais Universais (fallback)       │
│ 3. Env vars (fallback final)               │
└────────────────────────────────────────────┘

BENEFÍCIO:
- Empresas antigas continuam funcionando (universais)
- Empresas novas podem usar próprias credenciais
- Gradualmente migram para credenciais próprias
```

### 2. Campos por Provider

```
TWILIO:
├─ account_sid (obrigatório)
├─ auth_token (obrigatório)
└─ from_number (opcional - pode vir da config)

RETELL:
├─ api_key (obrigatório)
└─ workspace_id (opcional)

RESEND:
└─ api_key (obrigatório)

GMAIL:
├─ service_account_json (obrigatório)
└─ scopes (opcional)

API_CLOUD (WhatsApp):
├─ business_account_id (obrigatório)
├─ access_token (obrigatório)
├─ phone_number_id (opcional)
└─ wa_business_account_id (opcional)
```

### 3. Segurança

```
✅ API Keys criptografadas em repouso
✅ Mascaradas no frontend (mostrar últimos 4 dígitos)
✅ Apenas empresa proprietária pode acessar suas credenciais
✅ Deletar credencial não afeta campanhas antigas (soft delete?)
```

---

## 🚀 LISTA DE TAREFAS

### Fase 1: Expandir Validação
- [ ] Editar `src/app/api/v1/ia/credentials/route.ts`
- [ ] Adicionar 5 novos providers ao enum
- [ ] Testes de validação

### Fase 2: Componente UI
- [ ] Criar `src/components/credentials/credential-form.tsx`
- [ ] Campos dinâmicos por provider
- [ ] Validação por provider

### Fase 3: Página Settings
- [ ] Criar `src/app/(main)/settings/credentials/page.tsx`
- [ ] Listar credenciais existentes
- [ ] Integrar CredentialForm
- [ ] Botões editar/deletar

### Fase 4: Lógica de Uso
- [ ] Atualizar `campaign-sender.ts`
- [ ] Atualizar `retell-service.ts`
- [ ] Atualizar `twilio-service.ts`
- [ ] Atualizar `voice-retry.service.ts`
- [ ] Ordem: Credencial empresa → Universal → Env var

### Fase 5: Testes
- [ ] POST nova credencial
- [ ] GET lista de credenciais
- [ ] USE credenciais em campanha
- [ ] Validar fallback

---

## ⏱️ ESTIMATIVA

```
Total: ~50 minutos para implementação completa

Breakdown:
├─ Fase 1 (Validação):        5 min
├─ Fase 2 (Componente UI):   10 min
├─ Fase 3 (Página Settings): 10 min
├─ Fase 4 (Lógica):          15 min
└─ Fase 5 (Testes):          10 min
```

---

## ✅ OBRIGAÇÕES IMUTÁVEIS RESPEITADAS

| # | Obrigação | Status |
|----|-----------|--------|
| 1 | Seguir pasted-obrigatoriedades... | ✅ Lido completo |
| 2 | Investigação profunda | ✅ Realizada |
| 7 | Verificar fase anterior | ✅ Credenciais universais OK |
| 12 | Zero dados fabricados | ✅ Análise do código real |

---

## 🎯 PRÓXIMO PASSO

**AGUARDANDO APROVAÇÃO DO USER**

Responda com:
- [ ] **APROVADO** - Execute plano completo (Fases 1-5)
- [ ] **MODIFICAÇÕES** - Quais mudanças?
- [ ] **PARCIAL** - Execute apenas quais fases?

---

**Status**: 🟡 BLOQUEADO AGUARDANDO OK
**Tempo de Planejamento**: ~10 minutos
**Pronto para Execução**: SIM ✅
