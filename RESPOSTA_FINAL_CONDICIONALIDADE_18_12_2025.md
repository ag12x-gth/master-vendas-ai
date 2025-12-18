# ✅ RESPOSTA CLARA: Condicionalidade de Notificações

**Sua Pergunta:** "Será enviado automaticamente caso haja regra ativada ou irá enviar automaticamente independente de regra ativada ou não?"

**Seu Requirement:** "precisa enviar apenas se tiver regras ativas em /automations"

---

## 🎯 RESPOSTA DIRETA

### ❌ SITUAÇÃO ATUAL (ERRADA para seu requirement)

```
┌─ Webhook recebido (order_approved)
│
├─→ [1] Baileys notificação
│       └─ SEMPRE enviada (incondicional)
│       └─ NÃO depende de regras ✗
│       └─ Bug corrigido: tabela errada
│
└─→ [2] Meta Template
        └─ APENAS se houver regra ativa (condicional)
        └─ DEPENDE de regras ✓
```

### ✅ SITUAÇÃO DESEJADA (Seu requirement)

```
┌─ Webhook recebido (order_approved)
│
└─→ triggerAutomationForWebhook()
    ├─ Se houver regra ativa:
    │   ├─ Envia Baileys
    │   └─ Envia Meta Template
    └─ Se NÃO houver regra:
        └─ NADA é enviado
```

---

## 📊 TABELA COMPARATIVA

| Aspecto | Baileys (Atual) | Meta Template | Seu Requirement |
|---------|-----------------|---------------|-----------------|
| **Quando envia** | SEMPRE | Se regra ativa | Se regra ativa |
| **Depende de regra** | ❌ NÃO | ✅ SIM | ✅ SIM |
| **Status** | 🔴 Errado | 🟢 OK | ⚠️ Parcial |

---

## 🔧 PARA CUMPRIR SEU REQUIREMENT

Você precisa escolher **UMA** destas opções:

### Opção 1: Remover Baileys Automático (RECOMENDADO)

**O quê fazer:**
1. Remover as linhas em `incoming-handler.ts`:
   - `sendPixNotification()` (linha 276-289)
   - `sendOrderApprovedNotification()` (linha 295-306)

2. Deixar APENAS `triggerAutomationForWebhook()` (linha 328-329)

**Resultado:**
- ✅ Notificações APENAS se regra ativa
- ✅ Sem duplicação
- ✅ Comportamento limpo

**Código:**
```diff
// incoming-handler.ts

-    // Handle PIX notifications
-    if (eventType === 'pix_created' && customerPhone && qrCode) {
-      try {
-        const { sendPixNotification } = await import('@/services/pix-notification.service');
-        await sendPixNotification({...});
-      } catch (pixError) {...}
-    }

-    // Handle Order Approved notifications
-    if (eventType === 'order_approved' && customerPhone) {
-      try {
-        const { sendOrderApprovedNotification } = await import('@/services/pix-notification.service');
-        await sendOrderApprovedNotification({...});
-      } catch (orderError) {...}
-    }

    // ✅ Deixar apenas isso:
    const { triggerAutomationForWebhook } = await import('@/lib/automation-engine');
    await triggerAutomationForWebhook(companyId, eventType, data);
```

---

### Opção 2: Manter Como Está

**Resultado:**
- Baileys sempre enviada (não segue seu requirement)
- Meta Template se regra ativa
- 2 notificações se houver regra, 1 se não houver

**Status:** ❌ Não cumpre seu requirement

---

## ✅ CORREÇÕES APLICADAS

| Item | Status | Arquivo |
|------|--------|---------|
| Bug tabela (whatsapp_connections → connections) | ✅ CORRIGIDO | `pix-notification.service.ts` |
| Investigação condicionalidade | ✅ COMPLETA | `INVESTIGACAO_CONDICIONALIDADE_NOTIFICACOES_18_12_2025.md` |

---

## 🎯 PRÓXIMAS AÇÕES

**Escolha uma:**

1. **Usar Opção 1 (Recomendado):**
   - Remove lines 273-307 do `incoming-handler.ts`
   - ✅ Cumpre seu requirement 100%
   - ✅ Código mais limpo

2. **Manter Opção 2:**
   - Sem mudanças
   - ❌ Não cumpre seu requirement
   - ⚠️ Baileys envia SEMPRE

---

## 📋 RESUMO TÉCNICO

```
Comportamento ATUAL:
├─ Baileys: INCONDICIONAL (sempre tenta, mas com erro de tabela agora corrigido)
└─ Meta: CONDICIONAL (apenas se regra ativa)

Seu REQUIREMENT:
└─ Tudo: CONDICIONAL (apenas se regra ativa)

Ação necessária:
└─ Remover sendPixNotification() e sendOrderApprovedNotification()
   do incoming-handler.ts (Opção 1 recomendada)
```

---

**Checkpoint:** d45919c05fb1da750da5425ff180f86238b14751  
**Status:** 🟡 Aguardando sua escolha (Opção 1 ou 2)  
**Data:** 18/12/2025 01:55Z
