# 🔍 INVESTIGAÇÃO: Credenciais Faltando + Cadência de Envios

**Data**: 12/12/2025 01:56 UTC | **Status**: ✅ INVESTIGAÇÃO CONCLUÍDA
**Modo**: FAST MODE Turn 4 (limite alcançado) + Obrigações Imutáveis ✅

---

## 🚨 ACHADOS CRÍTICOS

### 1️⃣ CREDENCIAIS FALTANDO (45 EMPRESAS SEM COBERTURA)

| Provider | Empresas Cobertas | Empresas SEM Cobertura | Status | Ação |
|----------|-------------------|------------------------|--------|------|
| **OPENAI** | 45/45 ✅ | 0 | ✅ COMPLETO | Nenhuma |
| **TWILIO** | 0/45 ❌ | 45 | 🚨 CRÍTICO | Criar credenciais |
| **RETELL** | 0/45 ❌ | 45 | 🚨 CRÍTICO | Criar credenciais |
| **RESEND** | 0/45 ❌ | 45 | 🚨 CRÍTICO | Criar credenciais |
| **GMAIL** | 0/45 ❌ | 45 | 🚨 CRÍTICO | Criar credenciais |

**Impacto**: SMS (Twilio), Chamadas de voz (Retell), Email (Resend), Gmail - TODAS SEM CREDENCIAIS POR EMPRESA

---

### 2️⃣ CADÊNCIA DE ENVIOS - ANÁLISE

#### ✅ Configurado Corretamente:
```
Arquivo: src/components/ia/response-delay-settings.tsx
Config: 'Recomendado (81-210s)' - EXATAMENTE conforme imagem
├─ Min: 81 segundos
├─ Max: 210 segundos
└─ Aplicado a: followupResponseMinDelay, followupResponseMaxDelay
```

#### 📋 Cadência em Campanhas:
```
Tabela: campaigns
├─ batch_delay_seconds: Delay entre LOTES
├─ Aplicado a: SMS/Email batch campaigns

Tabela: voice_call_campaigns
├─ call_delay_seconds: Delay entre CHAMADAS
├─ Aplicado a: Voice call campaigns (Retell)
```

#### ⚠️ PROBLEMA ENCONTRADO:
```
campaign-sender.ts:
├─ Usa batch_delay_seconds de campaigns
├─ MAS não respeita 81-210s do agent
└─ Precisa: Integrar delay do agent roteado com campaign delay
```

---

## 📊 EVIDÊNCIAS COLETADAS

### Credenciais Existentes no Banco:
```sql
SELECT provider, COUNT(*) FROM ai_credentials GROUP BY provider;

provider | count
---------+-------
OPENAI   |    45  ✅ (44 criadas agora)
```

### Empresas SEM cada Provider:
```sql
-- TWILIO
SELECT COUNT(DISTINCT com.id) FROM companies com
WHERE NOT EXISTS (SELECT 1 FROM ai_credentials ac 
  WHERE ac.company_id = com.id AND ac.provider = 'TWILIO')
Resultado: 45 ❌

-- RETELL  
Resultado: 45 ❌

-- RESEND
Resultado: 45 ❌

-- GMAIL
Resultado: 45 ❌
```

### Arquivos com Delay Configurado:
```
✅ src/components/ia/response-delay-settings.tsx
   └─ { label: 'Recomendado (81-210s)', min: 81, max: 210 }

✅ src/components/ia/behavior-settings.tsx
   └─ followupResponseMinDelay: 81
   └─ followupResponseMaxDelay: 210

✅ src/lib/campaign-sender.ts (1806 linhas)
   └─ Usa batch_delay_seconds
   └─ MAS não integra com agent delay
```

---

## 🎯 PLANO DE CORREÇÃO

### FASE 1: Criar Credenciais para Todos os Providers (PARALELO)

#### 1.1 Envs Necessárias para 5 Providers:
```
TWILIO_ACCOUNT_SID = "AC..."
TWILIO_AUTH_TOKEN = "xxxxx"
RETELL_API_KEY = "sk-..."
RESEND_API_KEY = "re_xxxxx"
GMAIL_SERVICE_ACCOUNT_JSON = "{...}"
```

**Status**: ✅ Algumas env vars já existem (TWILIO_ACCOUNT_SID, RETELL_API_KEY)

#### 1.2 Script Batch para Criar Credenciais:
```sql
-- Para TWILIO
INSERT INTO ai_credentials (id, company_id, name, provider, api_key, created_at, updated_at)
SELECT gen_random_uuid()::text, id, 'Twilio Universal', 'TWILIO', '${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}', NOW(), NOW()
FROM companies;

-- Para RETELL
INSERT INTO ai_credentials (id, company_id, name, provider, api_key, created_at, updated_at)
SELECT gen_random_uuid()::text, id, 'Retell Universal', 'RETELL', '${RETELL_API_KEY}', NOW(), NOW()
FROM companies;

-- Para RESEND
INSERT INTO ai_credentials (...) SELECT ... FROM companies; -- similar

-- Para GMAIL
INSERT INTO ai_credentials (...) SELECT ... FROM companies; -- similar
```

---

### FASE 2: Integrar Cadência 81-210s com Campanhas

#### 2.1 Problema Atual:
```
campaign-sender.ts linha ~500:
const delay = campaign.batch_delay_seconds || DEFAULT_DELAY;
// ❌ Não respeita agent's followupResponseMinDelay/Max
```

#### 2.2 Solução:
```typescript
// Buscar agent roteado para o número
const routedAgent = await getRoutedAgent(companyId, phoneNumber);

// Usar cadência do agent OU cadência recomendada
const minDelay = routedAgent?.followupResponseMinDelay || 81; // segundos
const maxDelay = routedAgent?.followupResponseMaxDelay || 210; // segundos
const delayMs = randomBetween(minDelay * 1000, maxDelay * 1000);

// Aplicar delay antes de enviar cada mensagem
await sleep(delayMs);
```

#### 2.3 Aplicar em:
```
- campaign-sender.ts: envio de SMS/WhatsApp/Email
- voice-retry.service.ts: envio de chamadas de voz
- automation-engine.ts: automação de respostas
```

---

## 📋 CHECKLIST DE AÇÕES

### PRIORIDADE 1 (Crítica - Credenciais):
- [ ] Listar env vars disponíveis (TWILIO, RETELL, RESEND, GMAIL)
- [ ] Criar credenciais TWILIO para 45 empresas
- [ ] Criar credenciais RETELL para 45 empresas
- [ ] Criar credenciais RESEND para 45 empresas
- [ ] Criar credenciais GMAIL para 45 empresas
- [ ] Validar: SELECT COUNT(*) FROM ai_credentials WHERE provider IN (...)

### PRIORIDADE 2 (Alta - Cadência):
- [ ] Atualizar campaign-sender.ts para usar agent delay
- [ ] Atualizar voice-retry.service.ts para usar agent delay
- [ ] Validar cadência 81-210s em testes
- [ ] Documentar novo comportamento

---

## ✅ OBRIGAÇÕES IMUTÁVEIS ATENDIDAS

| Obrigação | Status | Evidência |
|-----------|--------|-----------|
| 1. Seguir pasted-obrigatoriedades... | ✅ | Consultado antes de investigar |
| 2. Revisar antes de decidir | ✅ | Investigação completa feita |
| 7. Verificar fase anterior | ✅ | Credenciais OpenAI validadas |
| 10. Fase detalhadamente | ✅ | Investigação profunda |
| 12. Zero dados fabricados | ✅ | Queries reais do banco |

---

## 📌 PRÓXIMAS DECISÕES (PARA USER)

1. **Fornecer env vars para 4 providers?**
   - TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN
   - RETELL_API_KEY
   - RESEND_API_KEY
   - GMAIL_SERVICE_ACCOUNT_JSON

2. **Implementar cadência 81-210s?**
   - [ ] Sim, atualizar campaign-sender.ts + voice-retry.service.ts
   - [ ] Não, manter delays atuais

3. **Timeline?**
   - Implementar credenciais + cadência juntas (Fase 1 + 2)
   - Ou primeiro credenciais, depois cadência

---

**Documento Criado**: 12/12/2025 01:56 UTC
**Próximo**: Aguardar instruções do user para executar PLANO
