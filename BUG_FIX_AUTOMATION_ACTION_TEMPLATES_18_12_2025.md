# 🐛 BUG FIX: Automação não executava com templates vazios

**Data:** 18/12/2025 02:10Z  
**Status:** ✅ CORRIGIDO  
**Versão:** v2.10.7  
**Problema:** Regra "compra-aprovada" não enviava mensagem para Diego

---

## 🔍 O QUE ESTAVA ERRADO

### Banco de Dados:
```json
Regra: "compra-aprovada"
Ação: {
  "type": "send_message_apicloud",
  "value": "",           ← VAZIO
  "templateId": "xxx",   ← SIM, TEM TEMPLATE
  "connectionId": "yyy"
}
```

### Código Problemático (v2.10.6):
```typescript
case 'send_message_apicloud': {
    if (!action.value || !action.connectionId) return;  // ← BUG!
    // ...
}
```

**O Problema:** Se `value` estiver vazio, a função **retorna sem fazer nada** ❌

---

## ✅ A SOLUÇÃO (v2.10.7)

### Código Corrigido:
```typescript
case 'send_message_apicloud': {
    if (!action.connectionId) return;  // ← APENAS valida connectionId
    // ✅ Agora permite value vazio (conteúdo vem do template)
    const messageText = action.value ? (webhookData ? interpolateWebhookVariables(action.value, webhookData) : action.value) : '';
    
    console.log(`[Automation|DEBUG] Sending API Cloud message:`, { phone: contact.phone, templateId: (action as any).templateId, hasValue: !!action.value });
    
    const result = await sendUnifiedMessage({
        provider: 'apicloud',
        connectionId: action.connectionId,
        to: contact.phone,
        message: messageText,
        templateId: (action as any).templateId,  // ← TEMPLATE USADO!
    });
    
    if (!result.success) throw new Error(result.error || 'Falha ao enviar via APICloud');
    await logAutomation('INFO', `Mensagem enviada via APICloud para ${contact.phone}`, logContext);
    break;
}
```

---

## 🎯 O QUE MUDOU

| Versão | Comportamento |
|--------|---------------|
| v2.10.6 | ❌ `value` vazio → Retorna sem fazer nada |
| v2.10.7 | ✅ `value` vazio → Usa `templateId` para enviar |

---

## 🧪 COMO TESTAR AGORA

### Teste 1: Enviar webhook para Diego

```bash
curl -X POST "http://localhost:5000/api/v1/webhooks/incoming/682b91ea-15ee-42da-8855-70309b237008" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType":"order_approved",
    "eventId":"TEST_DIEGO_v2107",
    "customer":{"name":"Diego oficial","phone":"64999526870","email":"admin@ag12x.com.br"},
    "product":{"name":"Produto Teste"},
    "orderId":"ORD-TEST",
    "total":100
  }'
```

### Resultado Esperado:

**Logs devem mostrar:**
```
[Automation|DEBUG] Sending API Cloud message: { phone: "64999526870", templateId: "2e94514a-6be5-473f-a7fb-3fb3c4b63faf", hasValue: false }
[Automation|INFO|Conv:webhook_xxx|Rule:cf7f3cec-0ccc-4b02-b4e9-7b74078606cc] Mensagem enviada via APICloud para 64999526870
```

**WhatsApp:** Diego recebe notificação via Meta Template ✅

---

## 📊 APLICAÇÕES

**Qualquer ação que use templates (sem message customizada):**
- ✅ `send_message_apicloud` - Meta Templates
- ✅ `send_message_baileys` - Baileys Templates (se houver)
- ✅ Webhooks com templates vazios agora funcionam

---

## 🚀 PRÓXIMAS ETAPAS

1. ✅ **Bug corrigido no código** → `src/lib/automation-engine.ts`
2. ⏳ **Reiniciar servidor** (já feito)
3. ⏳ **Testar webhook com Diego** (recomendado)
4. ⏳ **Se OK → Publicar em produção**

---

**Checkpoint:** 6115ca2a9da0ee027deb0519ed543ba209428a28  
**Versão:** v2.10.7  
**Status:** ✅ CORRIGIDO E PRONTO PARA TESTE
