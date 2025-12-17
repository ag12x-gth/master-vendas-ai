# Master IA Oficial - Plataforma de Bulk Messaging com Automação AI

## Overview
Master IA é uma plataforma de bulk messaging que integra automação via Inteligência Artificial. O projeto visa otimizar campanhas de comunicação, desde o envio de mensagens em massa até a interação automatizada com usuários, aproveitando o poder da IA para personalização e eficiência.

## Status Atual (v2.9.0) - FASES 1-5 ROADMAP ✅

### 🎯 FASE 1: DB Persistence Logs (v2.9.0) ✅ CONCLUÍDO
- ✅ Webhook automation completo (order_approved)
- ✅ Logs salvos em automation_logs via raw SQL
- ✅ 2 automações disparando por webhook
- ✅ Schema automationLogs funcional
- ✅ Query INSERT otimizada

**Arquivo Modificado:**
- `src/lib/automation-engine.ts` (lines 129-155): logAutomation() com raw SQL

### 📊 Roadmap Completo (v2.9.0+)

| Fase | Objetivo | Status | ETA |
|------|----------|--------|-----|
| **1** | DB Persistence Logs | ✅ DONE | v2.9.0 |
| **2** | Webhooks Reais Grapfy | 🔄 Turno 11 | v2.9.1 |
| **3** | Tipos Adicionais (PIX/LEAD) | ⏳ Turno 12 | v2.9.2 |
| **4** | Retry Logic BullMQ | ⏳ Turno 13 | v2.9.3 |
| **5** | Performance Tuning 1000+ | ⏳ Turno 14 | v2.9.4 |

### 🔧 FASE 2: Webhooks Reais Grapfy (Próxima)
- [ ] Testar com payload real de Grapfy (não test-grapfy)
- [ ] Validar interpolação {{customer_name}}, {{order_value}}, {{pix_value}}
- [ ] Screenshot de automação executada
- [ ] Evidence: Eventos reais em DB + frontend mostrando logs

### 🔧 FASE 3: Tipos Adicionais 
- [ ] Adicionar webhook_pix_created variables
- [ ] Adicionar webhook_lead_created variables
- [ ] Criar 2 automações de teste (PIX + LEAD)
- [ ] Disparar webhooks de cada tipo + validar

### 🔧 FASE 4: Retry Logic
- [ ] Implementar BullMQ retry com exponential backoff
- [ ] Testar falha simulada + retry automático
- [ ] Validar max retries + log de tentativas

### 🔧 FASE 5: Performance Tuning
- [ ] Criar índices em company_id + created_at
- [ ] Cache de rules em Redis
- [ ] Load test 100+ automações simultâneas
- [ ] Validar tempo < 500ms por trigger

---

## Conhecimento Técnico Acumulado

### PROTOCOLO_LOGGING_SQL_RAW_V1
- Problema: Drizzle ORM inserindo com tipos incompatíveis
- Solução: Usar SQL raw com template literals
- Status: ✅ Funcionando em v2.9.0

### PROTOCOLO_WEBHOOK_FULL_CYCLE_V1
```
1. Webhook recebido → stored em incoming_webhook_events
2. Parse + validação → handleGrapfyEvent
3. Contact find/create → DB
4. Trigger automations → find rules by event_type
5. Execute actions → send message / move kanban
6. Log result → automation_logs
```

## Arquitetura Atual (v2.9.0)

```
┌─ WebhookAPI (POST /api/v1/webhooks/incoming/[companySlug])
│  ├─ validateSignature() ✅
│  ├─ parseAndValidatePayload() ✅
│  ├─ storeWebhookEvent() → incoming_webhook_events ✅
│  └─ handleIncomingWebhookEvent() ✅
│     └─ handleGrapfyEvent()
│        ├─ triggerWebhookCampaign()
│        └─ triggerAutomationForWebhook() ✅
│           ├─ Find/Create Contact ✅
│           ├─ Find rules (trigger_event = webhook_*) ✅
│           ├─ Execute actions ✅
│           └─ logAutomation() → automation_logs ✅ (v2.9.0)
│
├─ Frontend Components
│  ├─ AutomationRuleForm (smart fields) ✅
│  ├─ AutomationLogs (display logs) ✅
│  └─ EventHistoryDropdown ✅
│
└─ Database
   ├─ automation_rules ✅
   ├─ incoming_webhook_events ✅
   ├─ automation_logs ✅ (v2.9.0 - now persisting)
   └─ contacts ✅
```

---

**Status Produção:** v2.9.0 ✅ PRONTO PARA FASE 2
**Última Atualização:** 17/12/2025 21:16Z
**Modo Execução:** Fast-Mode com Continuidade Ilimitada (Obrigatório do Usuário)
**Próxima Ação:** Testar webhooks reais de Grapfy (FASE 2)

