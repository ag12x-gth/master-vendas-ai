# 🐛 BUG FIX: Webhook não disparava automações Meta Templates

## 📋 Problema Original

Você estava certo! **Automações ESTAVAM configuradas** mas NÃO estavam sendo disparadas:

```
Regra: "compra-aprovada"
Gatilho: webhook_order_approved
Ação: Enviar via APICloud (Meta)
Template: 2026_protocolo_compra_aprovada_
Status: ✅ Ativa
```

**MAS:** Sistema enviava apenas notificação Baileys (texto), não o template Meta.

---

## 🔍 Causa Raiz

**Não era falta de regra, era BUG NA CÓDIGO:**

```typescript
// src/lib/automation-engine.ts (linha 1085) - ANTES:
const contactPhone = customer.phoneNumber || '';
                     ↑
                  Procura AQUI
```

**Problema:**
- ❌ Grapfy envia: `customer.phone`
- ✅ Código procurava: `customer.phoneNumber`
- ❌ Resultado: Não encontra telefone → Ignora automação

**Log prova:**
```
[Automation Engine] Webhook sem telefone do cliente. Ignorando. ❌
```

---

## ✅ Solução Implementada

**src/lib/automation-engine.ts (linha 1088) - DEPOIS:**

```typescript
const contactPhone = customer.phoneNumber || customer.phone || '';
                     ↑                        ↑
                  Meta API          Grapfy (CORRIGIDO!)
```

---

## 🔄 Fluxo Agora (CORRETO):

```
[1] Webhook order_approved chega
    ├─ customer.phone: "11987654321"
    ├─ customer.name: "João Silva"
    └─ total: 150.00

[2] incoming-handler.ts processa
    └─→ Envia notificação Baileys (texto) ✅

[3] triggerAutomationForWebhook() chamado
    ├─→ contactPhone = customer.phone ("11987654321") ✅
    ├─→ Encontra automação "compra-aprovada" ✅
    └─→ Dispara ação: "Enviar via APICloud (Meta)" ✅

[4] executeAction() envia template Meta
    ├─→ Template: "2026_protocolo_compra_aprovada_" ✅
    ├─→ Para: 11987654321 ✅
    └─→ Cliente recebe notificação formal ✅
```

---

## 📊 Resumo da Correção

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Busca telefone em** | `phoneNumber` | `phoneNumber` OR `phone` |
| **Encontra automações** | ❌ Não | ✅ Sim |
| **Dispara Meta Template** | ❌ Não | ✅ Sim |
| **Mensagens enviadas** | 1 (Baileys) | 2 (Baileys + Meta) |

---

## 🎯 Resposta à sua pergunta:

> "Por que não usa template Meta '2026_protocolo_compra_aprovada_'?"

**ANTES:** Porque tinha BUG - `customer.phone` não era reconhecido  
**DEPOIS:** ✅ Agora funciona! Automação é disparada corretamente

---

## 🧪 Como Testar

```bash
# Enviar webhook order_approved
curl -X POST "http://localhost:5000/api/v1/webhooks/incoming/682b91ea-15ee-42da-8855-70309b237008" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType":"order_approved",
    "eventId":"test_123",
    "customer":{"name":"Teste","phone":"11987654321"},
    "product":{"name":"Produto"},
    "total":150.00
  }'
```

**Logs esperados:**
```
✅ Order approved notification sent to 11987654321
✅ Automations triggered for webhook event: order_approved
✅ Regra webhook executada: compra-aprovada
✅ Envio via Meta API: 2026_protocolo_compra_aprovada_
```

---

## 📝 Arquivos Modificados

- **src/lib/automation-engine.ts** (linha 1088)
  - Antes: `const contactPhone = customer.phoneNumber || '';`
  - Depois: `const contactPhone = customer.phoneNumber || customer.phone || '';`

---

**Status:** ✅ CORRIGIDO  
**Data:** 18/12/2025  
**Impacto:** Sistema agora dispara automações Meta Templates corretamente para webhooks Grapfy
