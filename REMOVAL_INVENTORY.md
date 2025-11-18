# Inventário de Remoção de Features
**Data:** 18 de Novembro de 2025
**Objetivo:** Remover AWS SES v2, Hume EVI, Meeting Analysis e Google Gemini

---

## 1. AWS SES v2

### Dependências
- `@aws-sdk/client-sesv2` (package.json linha 38)

### Arquivos Afetados
- `package.json`
- `package-lock.json`
- `REMOVAL_IMPACT_ANALYSIS.md` (documentação)

### Secrets/Environment
- Nenhum secret ativo encontrado

### Ação
✅ Seguro remover - não utilizado no código

---

## 2. Hume EVI

### Dependências
- `hume` (package.json linha 85)
- `@eko-ai/eko` (package.json linha 40)
- `@eko-ai/eko-nodejs` (package.json linha 41)

### Arquivos Afetados
- `src/services/hume-emotion.service.ts`
- `src/app/api/v1/meetings/webhook/route.ts`
- `src/lib/metrics/api-metrics.ts` (referência ApiProvider)
- `src/lib/circuit-breaker.ts` (referência ApiProvider)
- `tests/e2e/voice-calls.eko.ts`
- `tests/e2e/voice-calls-simple.eko.ts`
- `tests/e2e/EKO_*.md` (documentação)
- `docs/MEETING_ANALYSIS_TESTING.md`

### Secrets/Environment
- `HUME_API_KEY` (secret do Replit)

### Ação
✅ Remover completamente - usado apenas por Meeting Analysis

---

## 3. Meeting Analysis

### Rotas API
- `src/app/api/v1/meetings/route.ts`
- `src/app/api/v1/meetings/webhook/route.ts`
- `src/app/api/v1/meetings/[id]/route.ts`
- `src/app/api/v1/meetings/[id]/transcripts/route.ts`
- `src/app/api/v1/kanbans/analyze-meetings/route.ts`

### Componentes UI
- (Buscar componentes meeting-related)

### Tabelas do Banco
- `meetings`
- `meeting_insights`
- `meeting_analysis_realtime`

### Serviços
- Parte de `src/services/ai-analysis.service.ts`

### Documentação
- `docs/MEETING_ANALYSIS_TESTING.md`
- `correcoes-q&a/RELATORIO_FASE3_MEETING_ANALYSIS.md`

### Ação
⚠️ Remoção complexa - requer backup de dados, migração DB

---

## 4. Google Gemini

### Dependências
- `@ai-sdk/google` (package.json linha 33)
- `@google/generative-ai` (package.json linha 43)

### Arquivos Afetados
- `src/lib/db/schema.ts` (aiPersonas.provider enum)
- `src/lib/costs.ts`
- `src/services/ai-analysis.service.ts`
- `src/components/settings/ai-settings-manager.tsx`
- `src/components/settings/ai-credential-form-dialog.tsx`
- `src/app/api/v1/test-integrations/route.ts`
- `.env.example`

### Secrets/Environment
- Nenhum secret configurado (GOOGLE_AI_API_KEY não está nos secrets)

### Tabela Afetada
- `ai_credentials` (provider = 'gemini')
- `ai_personas` (provider = 'gemini')

### Ação
⚠️ Migrar personas existentes para OpenAI antes de remover

---

## Sequência de Execução

1. ✅ **AWS SES v2** - Mais simples, sem código ativo
2. ✅ **Hume EVI** - Dependência do Meeting Analysis
3. ⚠️ **Meeting Analysis** - Requer backup DB + migração
4. ⚠️ **Google Gemini** - Requer migração de dados existentes

---

## Checklist de Validação Pós-Remoção

- [ ] `npm run build` completa sem erros
- [ ] Testes unitários passam
- [ ] Workflow Frontend rodando normalmente
- [ ] Features principais funcionando (WhatsApp, AI OpenAI, Campaigns)
- [ ] Secrets removidos do Replit
- [ ] Documentação atualizada (replit.md, SYSTEM_ANALYSIS.md)
