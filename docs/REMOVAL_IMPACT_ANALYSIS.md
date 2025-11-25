# 📋 Análise de Impactos - Remoção de Features

**Data:** 18 de Novembro de 2025  
**Status:** Análise Técnica Completa

---

## 🎯 RESUMO EXECUTIVO

Este documento analisa os impactos de remover 5 componentes do sistema Master IA Oficial:

1. ⚠️ **Meeting Analysis** (stub/mock) - IMPACTO MÉDIO
2. ✅ **AWS SES v2** - SEM IMPACTO (não implementado)
3. ⚠️ **Google Gemini** - IMPACTO BAIXO-MÉDIO
4. ⚠️ **Hume EVI** - IMPACTO BAIXO (já é stub)
5. 🔴 **Template Preview Rendering** - IMPACTO ALTO

---

## 1️⃣ MEETING ANALYSIS (STUB/MOCK)

### 📊 **Status Atual**
- **Implementação:** Parcial/Stub (código existe, mas lógica real não implementada)
- **Dependências:** Voice Calls (Vapi), Google Gemini, Socket.IO
- **Uso:** Análise de transcrições e emoções em reuniões de vendas

### 🔍 **Arquivos Afetados**
```
✅ REMOVER:
├── src/services/ai-analysis.service.ts (117 linhas)
├── src/services/hume-emotion.service.ts (76 linhas)
├── src/components/meetings/MeetingRoomPanel.tsx (~400 linhas)
├── src/app/(main)/meetings/[id]/page.tsx
├── src/app/api/v1/meetings/route.ts
├── src/app/api/v1/meetings/[id]/route.ts
├── src/app/api/v1/meetings/[id]/analysis/route.ts
└── src/app/api/v1/meetings/[id]/transcripts/route.ts

⚠️ AJUSTAR (remover referências):
├── src/components/kanban/lead-dialogs.tsx (AddMeetingTimeDialog - manter)
├── src/components/kanban/funnel-toolbar.tsx (AnalyzeMeetingsDialog - remover)
└── src/lib/kanban/move-lead-to-stage.ts (remover triggers de meeting)
```

### 🗄️ **Schema Database**
```sql
-- TABELAS A REMOVER:
DROP TABLE meeting_analysis_realtime;
DROP TABLE meeting_insights;
DROP TABLE meetings;
```

### 📦 **Pacotes NPM**
```bash
# PODEM SER REMOVIDOS (se não usados em outro lugar):
npm uninstall hume
npm uninstall @google/generative-ai  # SE não usar Gemini em AI Personas
```

### 🔗 **Integrações Afetadas**
- **Vapi Voice Calls:** ⚠️ Webhook de meeting analysis será desativado
- **Kanban CRM:** ⚠️ Feature "Analisar Reuniões" será removida
- **Socket.IO:** ⚠️ Events de meeting (transcript, emotion) não serão mais emitidos

### 📱 **Páginas/UI Afetadas**
```
REMOVER:
- /meetings/[id] (página dedicada)

AJUSTAR:
- /voice-calls (remover tab "Analytics" se existir)
- /kanban (remover botão "Analisar Reuniões" do toolbar)
```

### ⚙️ **Background Workers**
- ✅ **Nenhum worker ativo** para meetings (apenas webhook receiver)

### ✅ **Mitigações/Alternativas**
- Voice calls continuarão funcionando normalmente (apenas perderão análise pós-call)
- Substituir por análise manual das transcrições (se Vapi fornecer)
- Usar insights de AI Personas em conversas WhatsApp como alternativa

---

## 2️⃣ AWS SES v2 (EMAIL)

### 📊 **Status Atual**
- **Implementação:** ❌ NÃO IMPLEMENTADO
- **Dependências:** Nenhuma (apenas mencionado em docs)
- **Uso:** Email notifications (teórico)

### 🔍 **Arquivos Afetados**
```
✅ AJUSTAR (remover menção):
└── replit.md (linha 57)

⚠️ VERIFICAR (código usa Replit Mail):
└── src/lib/email.ts (comenta AWS SES mas não implementa)
```

### 📦 **Pacotes NPM**
```bash
# PODEM SER REMOVIDOS:
npm uninstall @aws-sdk/client-sesv2
```

### ✅ **Impacto**
- ✅ **ZERO IMPACTO** - Sistema já usa Replit Mail por padrão
- Apenas remover da documentação e package.json

---

## 3️⃣ GOOGLE GEMINI

### 📊 **Status Atual**
- **Implementação:** ✅ FUNCIONAL
- **Dependências:** AI Personas, Meeting Analysis (insights generation)
- **Uso:** Provider alternativo ao OpenAI em chatbots

### 🔍 **Arquivos Afetados**
```
⚠️ AJUSTAR (remover provider):
├── src/lib/db/schema.ts (aiPersonas.provider enum - remover 'GEMINI')
├── src/components/ia/behavior-settings.tsx (remover modelos Gemini)
├── src/lib/prompt-utils.ts (remover mapeamento 'google')
└── src/services/ai-analysis.service.ts (migrar para OpenAI ou remover)

⚠️ VERIFICAR DEPENDÊNCIAS:
└── src/lib/automation-engine.ts (usa AI, verificar se suporta apenas OpenAI)
```

### 📦 **Pacotes NPM**
```bash
# REMOVER:
npm uninstall @ai-sdk/google
npm uninstall @google/generative-ai
```

### 🗄️ **Schema Database**
```sql
-- AJUSTAR enum (PostgreSQL):
ALTER TYPE ai_provider RENAME TO ai_provider_old;
CREATE TYPE ai_provider AS ENUM ('OPENAI'); -- apenas OpenAI
ALTER TABLE ai_personas 
  ALTER COLUMN provider TYPE ai_provider 
  USING provider::text::ai_provider;
DROP TYPE ai_provider_old;

-- OU migrar personas Gemini existentes para OpenAI:
UPDATE ai_personas SET provider = 'OPENAI' WHERE provider = 'GEMINI';
UPDATE ai_credentials SET provider = 'OPENAI' WHERE provider = 'GEMINI';
```

### ⚙️ **Secrets Afetados**
- Remover referências a `GOOGLE_AI_API_KEY` (se existir)
- Manter apenas `OPENAI_API_KEY`

### ✅ **Mitigações/Alternativas**
- Migrar todas AI Personas Gemini para OpenAI (GPT-4o, GPT-4o-mini)
- Atualizar UI para remover seleção de modelos Gemini
- Garantir que todos AI agents usem apenas OpenAI

### ⚠️ **Atenção**
- Se Meeting Analysis for removido, remover Gemini tem **ZERO IMPACTO adicional**
- Se Meeting Analysis for mantido, será necessário migrar para OpenAI

---

## 4️⃣ HUME EVI (EMOTION ANALYSIS)

### 📊 **Status Atual**
- **Implementação:** ⚠️ STUB/MOCK (código existe, mas retorna dados fake)
- **Dependências:** Meeting Analysis (MeetingRoomPanel)
- **Uso:** Análise de emoções em video frames e áudio

### 🔍 **Arquivos Afetados**
```
✅ REMOVER:
├── src/services/hume-emotion.service.ts (76 linhas)
└── src/components/meetings/MeetingRoomPanel.tsx (analyzeVideoFrame calls)

⚠️ SE MEETING ANALYSIS FOR REMOVIDO:
- Remoção automática junto com Meeting Analysis
```

### 📦 **Pacotes NPM**
```bash
# REMOVER:
npm uninstall hume
npm uninstall @eko-ai/eko  # Usado apenas em testes E2E
npm uninstall @eko-ai/eko-nodejs
```

### ⚙️ **Secrets Afetados**
- Remover `HUME_API_KEY` (atualmente configurado)

### 📊 **Impacto nos Testes E2E**
```
⚠️ TESTES E2E AFETADOS:
├── tests/e2e/voice-calls.eko.ts (usa @eko-ai)
├── tests/e2e/voice-calls.spec.ts (Playwright puro - não afetado)
└── tests/e2e/run-eko-tests.sh
```

### ✅ **Mitigações/Alternativas**
- Emotion analysis já é stub (retorna dados fake)
- Remover não impacta funcionalidade real
- Manter testes Playwright, remover testes Eko

---

## 5️⃣ TEMPLATE PREVIEW RENDERING

### 📊 **Status Atual**
- **Implementação:** ✅ FUNCIONAL E CRÍTICO
- **Dependências:** Campanhas WhatsApp, Template Management
- **Uso:** Preview de templates com variáveis dinâmicas ({{name}}, {{phone}})

### 🔍 **Arquivos Afetados**
```
🔴 IMPACTO ALTO - FEATURE CRÍTICA:
├── src/components/campaigns/create-whatsapp-campaign-dialog.tsx
│   ├── templateParts (extração de variáveis)
│   ├── variableNames (lista de variáveis detectadas)
│   └── renderização de preview com substituição
├── src/components/templates/template-builder.tsx (se existir)
└── src/lib/template-utils.ts (se existir)
```

### ⚠️ **Impacto Funcional**
```
🔴 CRÍTICO:
- Usuários NÃO conseguirão visualizar como mensagem ficará antes de enviar
- Dificulta mapeamento de variáveis ({{1}}, {{2}}) para campos de contato
- Aumenta risco de erros em campanhas (variáveis incorretas)

⚠️ MÉDIO:
- UI de criação de campanha fica "cega" (sem feedback visual)
- Experiência do usuário degradada significativamente
```

### 📱 **Páginas Afetadas**
```
AFETADAS:
- /campaigns (criação de campanha WhatsApp)
- /templates (gerenciamento de templates)
- /templates-v2 (se existir)
```

### ✅ **Alternativas**
1. **Manter apenas lógica básica:**
   - Regex para extração de variáveis: `/\{\{(\d+)\}\}/g`
   - Mostrar apenas lista de variáveis detectadas (sem preview visual)

2. **Preview simplificado:**
   - Texto puro sem formatação
   - Substituição básica de {{name}} → [Nome do Contato]

3. **Remover completamente:**
   - ❌ NÃO RECOMENDADO - degrada UX crítica

---

## 📊 MATRIZ DE DECISÃO

| Feature | Status | Impacto Remoção | Economia Pacotes | Recomendação |
|---------|--------|-----------------|------------------|--------------|
| **Meeting Analysis** | Stub/Parcial | ⚠️ MÉDIO | ~150 KB | 🟡 OPCIONAL - remover se não usar |
| **AWS SES v2** | Não implementado | ✅ ZERO | ~500 KB | 🟢 REMOVER - não está em uso |
| **Google Gemini** | Funcional | ⚠️ BAIXO-MÉDIO | ~1 MB | 🟡 OPCIONAL - migrar para OpenAI |
| **Hume EVI** | Stub (fake data) | ✅ BAIXO | ~200 KB | 🟢 REMOVER - já é mock |
| **Template Preview** | Funcional | 🔴 ALTO | 0 KB | 🔴 MANTER - crítico para UX |

---

## 🎯 RECOMENDAÇÕES FINAIS

### ✅ **REMOVER COM SEGURANÇA**
1. **AWS SES v2** - Zero impacto (não implementado)
2. **Hume EVI** - Baixo impacto (já é stub, remover com Meeting Analysis)

### 🟡 **AVALIAR NECESSIDADE**
3. **Meeting Analysis** - Decidir se vale manter código stub ou limpar
4. **Google Gemini** - Migrar AI Personas para OpenAI se não usar

### 🔴 **MANTER OBRIGATORIAMENTE**
5. **Template Preview Rendering** - Feature crítica para UX de campanhas

---

## 📋 PLANO DE REMOÇÃO SUGERIDO

### **FASE 1: Remoções Seguras (Zero Impacto)**
```bash
# 1. Remover AWS SES v2
npm uninstall @aws-sdk/client-sesv2
# Atualizar replit.md (remover menção)

# 2. Remover Hume EVI (se Meeting Analysis for removido)
npm uninstall hume
# Remover HUME_API_KEY das secrets
```

### **FASE 2: Remoções Opcionais (Impacto Médio)**
```bash
# 3. Remover Meeting Analysis
# - Remover 8 arquivos (services, components, API routes)
# - DROP 3 tabelas (meetings, meeting_insights, meeting_analysis_realtime)
# - Ajustar Kanban CRM (remover "Analisar Reuniões")

# 4. Remover Google Gemini (se não usar)
npm uninstall @ai-sdk/google @google/generative-ai
# - Migrar AI Personas para OpenAI
# - Atualizar schema (enum ai_provider)
# - Atualizar BehaviorSettings (remover modelos Gemini)
```

### **FASE 3: Manter Template Preview** ✅
```
❌ NÃO REMOVER - Feature crítica para campanhas
```

---

## 💾 **ECONOMIA DE ESPAÇO**

### **Se remover tudo (exceto Template Preview):**
- **Pacotes NPM:** ~1.85 MB
- **Código-fonte:** ~800 linhas
- **Tabelas Database:** 3 tabelas
- **API Endpoints:** 5 endpoints
- **Páginas Frontend:** 1 página (/meetings/[id])

### **Ganhos:**
- ✅ Codebase mais limpo e focado
- ✅ Menos dependências externas
- ✅ Redução de surface de bugs (código stub removido)
- ✅ Menos secrets para gerenciar

---

**Última atualização:** 18 de Novembro de 2025  
**Próxima ação:** Decidir quais features remover baseado em roadmap do produto
