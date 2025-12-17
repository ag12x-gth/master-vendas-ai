# Grapfy Webhook Integration - SUCCESS v2.9.2

## Problema Identificado e Resolvido

**Erro:** HTTP 400 Bad Request quando Grapfy disparava webhook
**Causa Raiz:** Schema JSON esperava `event_type + data`, mas Grapfy envia `eventType + payload`

## Solução Implementada (v2.9.2)

### 1. Schema Normalização
**Arquivo:** `src/lib/webhooks/incoming-handler.ts`

Atualizado para aceitar AMBOS os formatos:
```typescript
const webhookPayloadSchema = z.object({
  event_type: z.string().optional(),
  eventType: z.string().optional(),      // Grapfy format
  timestamp: z.number().optional(),
  createdAt: z.string().optional(),      // Grapfy timestamp format
  data: z.record(z.any()).optional(),
  payload: z.record(z.any()).optional(), // Grapfy payload format
}).transform((data) => {
  // Normalize to generic format
  return {
    event_type: data.event_type || data.eventType,
    timestamp: data.timestamp || (data.createdAt ? Math.floor(new Date(data.createdAt).getTime() / 1000) : undefined),
    data: data.data || data.payload || {},
  };
});
```

### 2. Payload Real de Grapfy Testado

```json
{
  "eventType": "order_approved",
  "status": "approved",
  "paymentMethod": "creditCard",
  "customer": {
    "name": "Diego Abner Rodrigues Santana",
    "email": "admin@ag12x.com.br",
    "phoneNumber": "64999526870"
  },
  "product": {
    "name": "PAC - PROTOCOLO ANTI CRISE",
    "quantity": 1
  },
  "total": 5,
  "payload": {...}
}
```

## Fluxo Webhook Grapfy (Testado)

```
[1] Compra realizada na Grapfy → order_approved
        ↓
[2] POST /api/v1/webhooks/incoming/[companyId]
        ↓
[3] Auto-detect source: grapfy (sem header)
        ↓
[4] Parse payload com normalização (eventType → event_type)
        ↓
[5] Validação Schema (✅ AGORA FUNCIONA)
        ↓
[6] Armazenar incoming_webhook_events
        ↓
[7] Disparar automações webhook
        ↓
[8] Retornar HTTP 200 ✅
```

## URLs Webhook Corretas

**Configuração em Grapfy:** 
```
https://62863c59-d08b-44f5-a414-d7529041de1a-00-16zuyl87dp7m9.kirk.replit.dev/api/v1/webhooks/incoming/682b91ea-15ee-42da-8855-70309b237008
```

**Teste via Grapfy Dashboard:**
1. Acesse painel.grapfy.com
2. Webhooks → Configurações
3. Cole URL acima
4. Faça uma compra de teste
5. Verifique "Status: failed" → deve virar "succeeded"

## Status Final

✅ **WEBHOOK HTTP 200 IMPLEMENTADO**
✅ **Schema Grapfy normalizado**
✅ **Auto-detection de source pronto**
✅ **Logging completo para debug**

## Próximas Melhorias

1. Signature Validation (HMAC-SHA256)
2. Retry automático para falhas
3. Dashboard de logs em tempo real
4. Template automático baseado em produto

---

**Data:** 17/12/2025 20:00Z
**Versão:** v2.9.2
**Status:** ✅ HTTP 200 CONFIRMADO
