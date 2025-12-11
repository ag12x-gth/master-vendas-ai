# 🚨 PLANO CORREÇÃO PRIETO - Agentes Não Respondem

## Data: 11/12/2025 | Status: INVESTIGAÇÃO CONCLUÍDA | Next: EXECUÇÃO

---

## 📊 INVESTIGAÇÃO - EVIDÊNCIAS EMPÍRICAS

### Company Data
```
ID: f9772c33-c90a-40be-98d5-a7bf45362433
Name: ANTONIO PRIETO NETO's Company
User: ANTONIO PRIETO NETO (admin)
Email: iacademiadamente@gmail.com
```

### Conexões WhatsApp (Baileys)
| Config | Type | Status | Active | Persona Assigned | Persona Name |
|--------|------|--------|--------|------------------|--------------|
| PRIETO BUSINESS | baileys | ✅ connected | ✅ true | ✅ af5a4f48... | Atendimento Prieto |
| TREINAMENTOS | baileys | ❌ disconnected | ❌ false | ❌ 50fcadb1... | SERAPHIN |

### AI Personas Configuradas
| ID | Name | Provider | Model | Status |
|----|------|----------|-------|--------|
| af5a4f48... | Atendimento Prieto | OPENAI | gpt-4-turbo | ✅ Configurada |
| 073cfea1... | Orion | OPENAI | gpt-4o-mini | ✅ Configurada |
| 50fcadb1... | SERAPHIN | OPENAI | gpt-4o-mini | ✅ Configurada |

### Análise de Conversas
```
Total Conversas: 223
├── AI Ativas: 223 (100%) ✅
├── AI Inativas: 0
├── Com Persona Vinculada: 0 (❌ PROBLEMA CRÍTICO!)
└── Sem Persona: 223 (❌ TODAS SEM PERSONA!)
```

### Análise de Mensagens (Últimos 7 dias)
```
Total: 373 mensagens
├── AI Messages: 0 (❌ NENHUMA!)
├── User Messages: 246 ✅
├── Agent Messages: 0 (❌ NENHUMA!)
└── Conversão: 0% de AI, 0% de Agentes
```

### Credenciais OpenAI
```
Status: ❌ NENHUMA CONFIGURADA
Personas precisam de API Key OpenAI para funcionar
```

---

## 🔴 ROOT CAUSES IDENTIFICADOS

### 1. **Conversas sem Persona Vinculada** (CRÍTICO)
- **Problema**: 223 conversas têm `ai_active=true` MAS `assigned_persona_id=NULL`
- **Impacto**: Agentes IA não conseguem responder (não sabem qual persona usar)
- **Causa**: Personas não foram vinculadas às conversas ao criar

### 2. **Nenhuma Credencial OpenAI** (CRÍTICO)
- **Problema**: Company não tem credencial OpenAI configurada
- **Impacto**: Mesmo que vinculasse personas, não haveria API key para chamar OpenAI
- **Causa**: Admin não configurou durante setup

### 3. **Conexão TREINAMENTOS Desconectada** (MODERADO)
- **Problema**: Uma das conexões está desconectada
- **Impacto**: Reduz capacidade de atendimento (apenas 1 de 2 conexões ativas)
- **Causa**: Número pode ter sido bloqueado ou sessão expirou

---

## ✅ PLANO DE CORREÇÃO (FASES)

### FASE 1: SETUP CREDENCIAIS OpenAI (Pré-requisito)
**Objetivo**: Garantir que Company tenha credencial OpenAI válida

**Passos**:
1. Verificar se user tem credenciais OpenAI válidas (API key)
2. Criar/registrar credencial OpenAI na table `ai_credentials`
3. Linkar credenciais às personas da Company
4. Validar com health check: Fazer test call OpenAI

**Arquivo**: `src/lib/ai/openai-service.ts`
**Query SQL**:
```sql
INSERT INTO ai_credentials (id, company_id, name, provider, api_key, created_at)
VALUES (
  gen_random_uuid(),
  'f9772c33-c90a-40be-98d5-a7bf45362433',
  'OpenAI Default',
  'OPENAI',
  'sk-...',
  NOW()
);
```

---

### FASE 2: VINCULAR PERSONAS ÀS CONVERSAS (CRÍTICO)
**Objetivo**: Todas as 223 conversas precisam ter uma persona vinculada

**Estratégia**:
- Conversa via conexão "PRIETO BUSINESS" → Persona "Atendimento Prieto"
- Conversa via conexão "TREINAMENTOS" → Persona "SERAPHIN"

**Lógica**:
```sql
UPDATE conversations
SET assigned_persona_id = 'af5a4f48-1e4a-4b82-8e73-6f2ef67037e4'
WHERE company_id = 'f9772c33-c90a-40be-98d5-a7bf45362433'
  AND connection_id = '5c78cdd3-2542-4373-8295-72d777414ca7'
  AND assigned_persona_id IS NULL;

UPDATE conversations
SET assigned_persona_id = '50fcadb1-4932-4fad-bf6b-33449b7d728c'
WHERE company_id = 'f9772c33-c90a-40be-98d5-a7bf45362433'
  AND connection_id = '33d0969e-1e00-43af-9e05-40ca9038ab53'
  AND assigned_persona_id IS NULL;
```

**Validação Pós-Execução**:
```sql
SELECT 
  COUNT(*) as total_conversations,
  SUM(CASE WHEN assigned_persona_id IS NOT NULL THEN 1 ELSE 0 END) as conversations_with_persona
FROM conversations
WHERE company_id = 'f9772c33-c90a-40be-98d5-a7bf45362433';
-- Esperado: 223 com persona
```

---

### FASE 3: RECONECTAR "TREINAMENTOS" (MODERATE)
**Objetivo**: Reativar segunda conexão para redundância

**Passos**:
1. Solicitar novo QR Code para connection "TREINAMENTOS"
2. User faz scan no WhatsApp com número +5515988104775
3. Validar: `status = 'connected'` e `is_active = true`
4. Testar envio de mensagem de teste

**Arquivo**: `src/services/baileys-session-manager.ts`

---

### FASE 4: TESTAR RESPOSTA DE AGENTES
**Objetivo**: Validar que agentes agora respondem mensagens

**Teste Funcional**:
1. Enviar mensagem via WhatsApp para PRIETO BUSINESS
2. Aguardar resposta automática (com delays de Baileys 3-8s)
3. Verificar se resposta foi enviada
4. Confirmar log em `ai_agent_executions`

**Validação SQL**:
```sql
SELECT 
  COUNT(*) as new_ai_messages
FROM messages
WHERE sentence_type = 'AI'
  AND sent_at >= NOW() - INTERVAL '1 hour'
  AND conversation_id IN (
    SELECT id FROM conversations 
    WHERE company_id = 'f9772c33-c90a-40be-98d5-a7bf45362433'
  );
-- Esperado: > 0
```

---

### FASE 5: VALIDAÇÃO FINAL
**Checklist**:
- [ ] Credencial OpenAI configurada e testada
- [ ] 223 conversas com persona vinculada
- [ ] PRIETO BUSINESS respondendo mensagens
- [ ] TREINAMENTOS reconectada (opcional, para redundância)
- [ ] Logs de agentes gerando sem erros
- [ ] Performance: resposta em < 10 segundos

---

## 🔧 IMPLEMENTAÇÃO PARALELA

### Arquivo 1: API Route para Setup Credenciais
**Arquivo**: `src/app/api/v1/admin/company-setup/openai-credentials/route.ts`
- POST endpoint: Registrar credencial OpenAI
- Validação: Testar API key antes de salvar
- Response: Success/Error com detalhes

### Arquivo 2: Script SQL de Migração
**Arquivo**: `scripts/migrate-prieto-personas.sql`
- Insert credenciais
- Update conversas com personas
- Validação de integridade

### Arquivo 3: Health Check Endpoint
**Arquivo**: `src/app/api/v1/admin/health/company-agentes/route.ts`
- Check: Credenciais OK?
- Check: Personas vinculadas?
- Check: Conexões ativas?
- Check: Última resposta de AI?

---

## 📋 EVIDÊNCIAS DE SUCESSO

Após execução do plano:

```
✅ ANTES vs DEPOIS

ANTES:
- AI Messages: 0/373 (0%)
- Conversas com Persona: 0/223
- Credenciais OpenAI: 0

DEPOIS:
- AI Messages: >100/400 (25%+)
- Conversas com Persona: 223/223 (100%)
- Credenciais OpenAI: 1 ✅
- Response Time: <10s
```

---

## 🎯 PRÓXIMOS PASSOS

1. **AUTONOMOUS MODE**: Executar fases 1-4 em paralelo
2. **Verificar se User tem OpenAI API Key** (pode estar em outro app)
3. **Se não tiver**: Guiar user para criar em openai.com
4. **Executar script de migração**
5. **Teste end-to-end**: Enviar mensagem e validar resposta
6. **Documentar**: Adicionar ao docs/validations/pasted-obrigatorio-to-agents.md

---

**Status**: Pronto para Execução em Autonomous Mode
**Complexity**: ALTA (4 fases em paralelo)
**Tempo Estimado**: 30-45 minutos
**Risk Level**: BAIXO (operações read-only + updates seguros)
