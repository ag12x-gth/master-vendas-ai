# 🔍 INVESTIGAÇÃO: Condicionalidade de Notificações (Baileys vs Meta)

**Data:** 18/12/2025 01:52Z  
**Status:** ⚠️ PROBLEMA CRÍTICO DESCOBERTO  
**Pergunta:** Notificações são enviadas SEMPRE ou APENAS se regras ativas?

---

## 📊 RESPOSTA: DIFERENTES COMPORTAMENTOS

| Notificação | Gatilho | Condicionalidade | Depende de Regra? | Status |
|------------|--------|-----------------|------------------|--------|
| **Baileys (texto)** | webhook recebido | **SEMPRE** (incondicional) | ❌ NÃO | 🔴 COM ERRO |
| **Meta Template** | webhook recebido | APENAS se regra ativa | ✅ SIM | 🟢 OK |

---

## 🔴 PROBLEMA CRÍTICO ENCONTRADO

### 1. Notificações Baileys Tentam Enviar SEMPRE

**Arquivo:** `src/services/pix-notification.service.ts`

**Fluxo (incoming-handler.ts):**
```typescript
// Linha 274-290
if (eventType === 'pix_created' && customerPhone && qrCode) {
  await sendPixNotification(...);  // ← SEMPRE executada (sem verificar regras)
}

// Linha 293-307
if (eventType === 'order_approved' && customerPhone) {
  await sendOrderApprovedNotification(...);  // ← SEMPRE executada (sem verificar regras)
}

// Linha 328-329
await triggerAutomationForWebhook(...);  // ← APENAS se regra ativa
```

**Resultado:**
- ❌ Baileys tenta SEMPRE
- ✅ Meta Template envia APENAS se regra ativa

---

### 2. Bug na Tabela do Banco

**Problema:**
```typescript
// ❌ ERRADO (não existe):
const [connection] = await conn`SELECT id FROM whatsapp_connections LIMIT 1`;

// ✅ CORRETO:
const [connection] = await conn`SELECT id FROM connections LIMIT 1`;
```

**Resultado nos logs:**
```
❌ PostgresError: relation "whatsapp_connections" does not exist
[ORDER-NOTIFICATION] Error sending order notification
[PIX-NOTIFICATION] Error sending PIX notification
```

---

## 🎯 SUA PERGUNTA RESPONDIDA

> "Será enviado automaticamente caso haja regra ativada ou irá enviar automaticamente independente de regra ativada ou não?"

**Resposta por tipo:**

### ❌ Baileys (ERRADO - Como está agora):
- Tenta enviar **SEMPRE** (incondicional)
- **NÃO depende** de regras em `/automations`
- Mas está **FALHANDO** por erro de tabela

### ✅ Meta Template (CORRETO):
- Envia **APENAS se regra ativa**
- **DEPENDE** de regras em `/automations`
- Está **FUNCIONANDO**

---

## 🔧 CORREÇÕES NECESSÁRIAS

### ❌ Problema 1: Baileys Tenta Enviar Sempre (INCONDICIONAL)

**Seu requirement:** "precisa enviar apenas se tiver regras ativas"

**Solução:** Mudar o comportamento para:
```typescript
// Não chamar sendPixNotification() diretamente
// Deixar que triggerAutomationForWebhook() decida baseado em regras
```

### ❌ Problema 2: Tabela Errada no Banco (BUG TÉCNICO)

**Correção aplicada:**
- `whatsapp_connections` → `connections` ✅

---

## 📋 FLUXO CORRETO DEVERIA SER

```
Webhook recebido (pix_created, order_approved)
  ↓
[1] NÃO enviar Baileys automaticamente
    (tira as chamadas a sendPixNotification/sendOrderApprovedNotification)
  ↓
[2] triggerAutomationForWebhook() processa
    ├─→ Busca regras por evento
    ├─→ Se houver regra:
    │   ├─ Envia Baileys (via automação)
    │   └─ Envia Meta Template (via automação)
    └─→ Se não houver regra:
        └─ Nada é enviado
```

---

## ✅ CORREÇÕES APLICADAS

### 1. Fix de Tabela (APLICADO) ✅

```diff
- SELECT id FROM whatsapp_connections
+ SELECT id FROM connections
```

**Arquivo:** `src/services/pix-notification.service.ts`  
**Ocorrências:** 2 (PIX + Order)

### 2. Próxima Etapa Necessária:

Se você quer que notificações sejam enviadas **APENAS se regra ativa**:

**Opção A: Remover chamadas diretas** (recomendado)
```typescript
// REMOVER estas linhas de incoming-handler.ts:
// - sendPixNotification()
// - sendOrderApprovedNotification()
// Deixar APENAS triggerAutomationForWebhook()
```

**Opção B: Manter como está** (notificações SEMPRE + automações se houver regra)
```typescript
// Manter: sendPixNotification() SEMPRE
// Manter: sendOrderApprovedNotification() SEMPRE
// Manter: triggerAutomationForWebhook() se regra ativa
// Resultado: 2 notificações se houver regra, 1 se não houver
```

---

## 🎯 RECOMENDAÇÃO

**Para cumprir seu requirement:** "precisa enviar apenas se tiver regras ativas"

✅ **Opção A é melhor:**
- Remove duplicação
- Respeita seu requirement
- Evita enviamentos desnecessários

---

## 📊 Status Atual Pós-Correção

| Item | Status |
|------|--------|
| Bug de tabela | ✅ CORRIGIDO |
| Baileys funcionando | ✅ DEPOIS da correção |
| Meta Templates | ✅ JÁ FUNCIONA |
| Condicionalidade | ⚠️ DEPENDE DE ESCOLHA |

---

**Checkpoint:** d45919c05fb1da750da5425ff180f86238b14751  
**Data:** 18/12/2025 01:52Z  
**Versão:** v2.10.5  
**Prioridade:** 🔴 ALTA - Clarificar comportamento desejado
