# 🔍 INVESTIGAÇÃO: Envio de Mensagens WhatsApp para Compras Aprovadas

## ❓ Pergunta do Usuário
> "Quando os eventos de compra aprovada (pix ou cartão) ocorrerem, o sistema envia mensagem via WhatsApp informando o cliente sobre a compra através das conexões via API Cloud, usando o template da Meta escolhido (ex: 2026_protocolo_compra_aprovada_)?"

---

## ✅ RESPOSTA: SIM + NÃO + PARCIALMENTE

### 1️⃣ **SIM - Sistema ENVIA mensagens quando compras são aprovadas**

Quando eventos `pix_created` ou `order_approved` ocorrem:

```typescript
// src/lib/webhooks/incoming-handler.ts (linha 273-314)

if (eventType === 'pix_created' && customerPhone && qrCode) {
  // ✅ ENVIA notificação PIX
  await sendPixNotification({...});
}

if (eventType === 'order_approved' && customerPhone) {
  // ✅ ENVIA notificação pedido aprovado
  await sendOrderApprovedNotification({...});
}
```

**Status:** ✅ **Funciona**

---

### 2️⃣ **NÃO - Atualmente usa MENSAGENS DE TEXTO, não Meta Templates**

#### Descoberta 1: PIX Notification (Mensagem de Texto)

```typescript
// src/services/pix-notification.service.ts (linha 14-42)

export async function sendPixNotification(data: PixNotificationData): Promise<void> {
  const message = `🎯 *${data.customerName}*, seu PIX foi gerado!\n\n💰 *Valor:* R$ ${data.total.toFixed(2)}\n⏰ *Válido por:* ${hours}h\n📦 *Produto:* ${data.productName || 'Sua compra'}\n\n👇 *Copie e cole o código PIX abaixo:*\n${data.qrCode}...`;

  // ❌ Usa Baileys (texto simples, não Meta Template)
  await sendWhatsappTextMessage({
    connectionId: connection.id,
    to: data.customerPhone,
    text: message,  // ← Mensagem de texto puro
  });
}
```

**Tipo de Envio:** 
- ❌ NÃO usa Meta Templates
- ✅ Usa Baileys (mensagens de texto)
- ❌ Não aproveita templates da Meta como "2026_protocolo_compra_aprovada_"

---

#### Descoberta 2: Order Approved Notification (Mensagem de Texto)

```typescript
// src/services/pix-notification.service.ts (linha 44-75)

export async function sendOrderApprovedNotification(data: {...}): Promise<void> {
  const message = `✅ *Pedido Confirmado!*\n\n🎉 ${data.customerName}, seu pagamento foi confirmado!...`;

  // ❌ Usa Baileys (texto simples, não Meta Template)
  await sendWhatsappTextMessage({
    connectionId: connection.id,
    to: data.customerPhone,
    text: message,  // ← Mensagem de texto puro
  });
}
```

**Tipo de Envio:**
- ❌ NÃO usa Meta Templates
- ✅ Usa Baileys (mensagens de texto)
- ❌ Não usa template "2026_protocolo_compra_aprovada_"

---

### 3️⃣ **PARCIALMENTE - Sistema TEM suporte a Meta Templates**

#### Descoberta 3: Função `sendWhatsappTemplateMessage()` EXISTS

```typescript
// src/lib/facebookApiService.ts (linha 21-105)

export async function sendWhatsappTemplateMessage({
    connectionId,
    connection: providedConnection,
    to,
    templateName,  // ← Aceita nome do template (ex: "2026_protocolo_compra_aprovada_")
    languageCode,
    components,    // ← Componentes para preenchimento
}: SendTemplateArgs): Promise<Record<string, unknown>> {

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,  // ← Envia para Meta API
      language: { code: languageCode },
      components,
    },
  };

  // Envia para: https://graph.facebook.com/v20.0/{phoneNumberId}/messages
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}
```

**Status:** ✅ **Suportado** (mas NÃO usado para pix_created/order_approved)

---

## 📊 Comparação: O Que É Usado vs O Que Está Disponível

| Recurso | Usado Atualmente | Disponível | Status |
|---------|------------------|-----------|--------|
| **Meta Templates** | ❌ NÃO | ✅ SIM | Não integrado com eventos |
| **Baileys (Texto)** | ✅ SIM | ✅ SIM | Integrado com pix_created/order_approved |
| **Campaigns** | ✅ SIM | ✅ SIM | Opcional (busca por pattern) |
| **Template "2026_protocolo_..."** | ❌ NÃO | ✅ SIM | Não usado automaticamente |

---

## 🔄 Fluxo Atual: O Que Acontece Quando Compra É Aprovada

```
[1] Webhook recebido: pix_created ou order_approved
    ↓
[2] handleGrapfyEvent() chamado
    ↓
[3] DOIS processos em paralelo:

    A) Envio de Notificação (IMEDIATO)
    ├─→ sendPixNotification() OU
    ├─→ sendOrderApprovedNotification()
    └─→ Usa sendWhatsappTextMessage (Baileys)
        └─→ ❌ Mensagem de texto puro, não template

    B) Disparo de Campaign (OPCIONAL)
    ├─→ triggerWebhookCampaign()
    ├─→ Busca campaign com pattern (%pix%, %confirmação%)
    └─→ Envia campaign se encontrada
        └─→ ✅ Pode usar Meta Templates se campaign está configurada

[4] Resultado: Cliente recebe 1 ou 2 mensagens
    - Sempre: Notificação de texto (Baileys)
    - Opcional: Campaign (se configurada)
```

---

## ❌ Problema Identificado

### PIX/Order Approved NÃO usam Meta Templates automaticamente

```typescript
// ATUAL (BAILEYS - TEXTO):
await sendPixNotification({...});  // ← Usa Baileys
// Resultado: Mensagem de texto puro

// DEVERIA SER (META TEMPLATE):
await sendWhatsappTemplateMessage({
  templateName: '2026_protocolo_compra_aprovada_',  // ← Template da Meta
  languageCode: 'pt_BR',
  components: [{...}],
});
// Resultado: Mensagem formatada via Meta API
```

---

## 🛠 Onde Meta Templates SÃO usados

1. **Em Conversas Manuais:**
   ```typescript
   // src/app/api/v1/conversations/[conversationId]/messages/route.ts
   const sentMessageResponse = await sendWhatsappTemplateMessage({
     templateName: template.name,
     languageCode: template.language,
     components,
   });
   ```

2. **Ao Iniciar Conversa com Contact:**
   ```typescript
   // src/app/api/v1/conversations/start/route.ts
   const response = await sendWhatsappTemplateMessage({
     templateName: template.name,
     languageCode: template.language,
     components,
   });
   ```

3. **Em Campaigns (Se Configuradas):**
   ```typescript
   // src/lib/campaign-sender.ts
   // Pode usar Meta Templates se campaign está configurada
   ```

---

## ✅ Onde Mensagens DE TEXTO (Baileys) SÃO usadas

1. **PIX Notification:**
   - Quando: `pix_created` webhook
   - Como: `sendWhatsappTextMessage()`
   - Template: ❌ Nenhum (texto puro)

2. **Order Approved Notification:**
   - Quando: `order_approved` webhook
   - Como: `sendWhatsappTextMessage()`
   - Template: ❌ Nenhum (texto puro)

3. **Mensagens em Atendimentos:**
   - Quando: Usuário envia manualmente
   - Como: `sendWhatsappTextMessage()`
   - Template: ❌ Nenhum (texto puro)

---

## 📋 Código Atual: Fluxo Completo

### Passo 1: Evento Chega
```typescript
// POST /api/v1/webhooks/incoming/[companySlug]
// payload: { eventType: "pix_created", customer: {...}, total: 100, ... }
```

### Passo 2: Parse e Validação
```typescript
// src/lib/webhooks/incoming-handler.ts:90-109
const parsed = JSON.parse(body);
const validated = webhookPayloadSchema.safeParse(parsed);
```

### Passo 3: Armazenamento
```typescript
// Linha 122-127
await conn`
  INSERT INTO incoming_webhook_events 
  (company_id, event_type, payload, ...)
  VALUES (companyId, 'pix_created', payload, ...)
`;
```

### Passo 4: Roteamento para Handlers
```typescript
// Linha 179-182
if (eventType === 'pix_created' || eventType === 'order_approved') {
  await handleGrapfyEvent(companyId, eventType, payload);
}
```

### Passo 5: Processamento Grapfy (AQUI ENVIAMOS MENSAGEM)
```typescript
// src/lib/webhooks/incoming-handler.ts:248-314
async function handleGrapfyEvent(companyId, eventType, payload) {
  const data = payload;
  const customer = data.customer;
  const customerPhone = customer.phone || customer.phoneNumber;

  // ❌ PROBLEMA: Usa Baileys, não Meta Template
  if (eventType === 'pix_created' && customerPhone) {
    await sendPixNotification({
      customerPhone,
      customerName: customer.name,
      qrCode: data.qrCode,
      total: data.total,
      orderId: data.orderId,
      productName: data.product?.name,
    });
  }

  // ✅ DEPOIS: Tenta disparo de campaign opcional
  await triggerWebhookCampaign({
    companyId,
    eventType,
    customer,
  });
}
```

---

## 🎯 Resposta Definitiva

### Pergunta 1: "Sistema envia mensagem quando compra é aprovada?"
**✅ SIM** - Envia imediatamente via Baileys

### Pergunta 2: "Usa template da Meta (2026_protocolo_compra_aprovada_)?"
**❌ NÃO** - Usa mensagem de texto puro do Baileys

### Pergunta 3: "Há suporte para templates da Meta?"
**✅ SIM** - Sistema tem função `sendWhatsappTemplateMessage()` mas NÃO está integrada com eventos pix_created/order_approved

---

## 💡 Como Seria Se Usasse Meta Template

Para usar template da Meta automaticamente:

```typescript
// SERIA ASSIM:
export async function sendPixNotificationViaTemplate(data: PixNotificationData): Promise<void> {
  await sendWhatsappTemplateMessage({
    connectionId: connection.id,
    to: data.customerPhone,
    templateName: '2026_protocolo_compra_aprovada_',  // ← Template da Meta
    languageCode: 'pt_BR',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: data.customerName },
          { type: 'text', text: data.total.toFixed(2) },
          { type: 'text', text: data.qrCode },
        ],
      },
    ],
  });
}
```

---

## 📊 Resumo de Evidências

| Aspecto | Evidência | Localização |
|---------|-----------|------------|
| **PIX Notification Enviada** | ✅ Função implementada | `src/services/pix-notification.service.ts:14-42` |
| **Order Approved Notification Enviada** | ✅ Função implementada | `src/services/pix-notification.service.ts:44-75` |
| **Usa Baileys** | ✅ Sim | `sendWhatsappTextMessage()` chamada |
| **Usa Meta Template** | ❌ Não | Usa `sendWhatsappTextMessage()` apenas |
| **Meta Template Support Disponível** | ✅ Sim | `src/lib/facebookApiService.ts:21-105` |
| **Integração com Eventos** | ✅ Sim | `handleGrapfyEvent()` chamada em linha 181 |
| **Campaigns Opcionais** | ✅ Sim | `triggerWebhookCampaign()` em linha 318 |

---

## 🎉 Conclusão Final

```
✅ Sistema ENVIA notificações: SIM
✅ Quando compra aprovada: SIM
✅ Via WhatsApp: SIM
✅ Para cliente: SIM

❌ Usa Meta Template: NÃO (atualmente)
❌ Usa "2026_protocolo_compra_aprovada_": NÃO (atualmente)
✅ Sistema suporta Meta Template: SIM (mas não integrado)

🎯 TIPO DE ENVIO ATUAL: Baileys + Mensagem de Texto
🎯 TIPO DISPONÍVEL: Meta API + Templates
🎯 TIPO SOLICITADO: Meta API + Template específico
```

---

**Versão:** v2.10.4  
**Data:** 18/12/2025  
**Status:** ✅ INVESTIGAÇÃO COMPLETA  
**Recomendação:** Sistema funciona perfeitamente com Baileys, mas pode ser melhorado usando Meta Templates automáticos para maior controle de branding
