# Runbook: Teste de Produção Grapfy

## Objetivo
Validar que webhooks da Grapfy estão sendo recebidos, processados e disparando automações corretamente em produção.

---

## Pre-requisitos

### 1. Configuração Webhook na Grapfy
```
URL: https://62863c59-d08b-44f5-a414-d7529041de1a-00-16zuyl87dp7m9.kirk.replit.dev/api/v1/webhooks/incoming/682b91ea-15ee-42da-8855-70309b237008
```

### 2. Secret Configurado
```
source: grapfy
secret: 9be9d45cf5da63335666534596c688c1628bb6fd12facb3ded8231ec7fb6ebd4
is_active: true
```

### 3. Automações Ativas
- "Teste Validação - Compra Aprovada" (webhook_order_approved)
- Outras automações configuradas para event_type desejado

---

## Passos do Teste

### PASSO 1: Verificar Estado Inicial
```bash
# Contar eventos atuais
curl -s "https://[domain]/api/v1/webhooks/metrics?companyId=682b91ea-15ee-42da-8855-70309b237008" | jq '.stats'
```

**Anotar:** Número de eventos `order_approved` antes do teste

### PASSO 2: Realizar Compra de Teste na Grapfy
1. Acesse o checkout do produto de teste
2. Complete a compra com cartão de teste ou PIX
3. Aguarde confirmação de pagamento

### PASSO 3: Verificar Webhook Recebido (máx 30 segundos)
```bash
# Verificar novos eventos
curl -s "https://[domain]/api/v1/webhooks/metrics?companyId=682b91ea-15ee-42da-8855-70309b237008" | jq '.recentEvents[0]'
```

**Esperado:**
```json
{
  "id": "xxx-xxx-xxx",
  "source": "grapfy",
  "event_type": "order_approved",
  "signature_valid": true,
  "created_at": "2025-12-17T...",
  "processed_at": "2025-12-17T..."
}
```

### PASSO 4: Verificar Automação Disparada
```bash
# Verificar logs do servidor
grep "Automations triggered for webhook event: order_approved" /tmp/logs/Production_Server*.log | tail -1
```

**Esperado:** Log mostrando automação executada

### PASSO 5: Verificar Dashboard Visual
1. Acesse: `https://[domain]/webhooks/dashboard`
2. Verifique card "grapfy - order_approved" com +1 evento
3. Verifique evento na lista "Eventos Recentes"

---

## Checklist de Validação

| Item | Status | Observação |
|------|--------|------------|
| Webhook recebido (HTTP 200) | ⬜ | |
| Evento armazenado no DB | ⬜ | |
| source = "grapfy" | ⬜ | |
| event_type = "order_approved" | ⬜ | |
| signature_valid = true | ⬜ | |
| processed_at preenchido | ⬜ | |
| Automação disparada | ⬜ | |
| Dashboard atualizado | ⬜ | |

---

## Troubleshooting

### Webhook não chegou
1. Verifique URL no painel Grapfy
2. Verifique status do servidor (workflow running)
3. Teste com curl manual:
```bash
curl -X POST "https://[domain]/api/v1/webhooks/incoming/682b91ea-15ee-42da-8855-70309b237008" \
  -H "Content-Type: application/json" \
  -d '{"eventType":"order_approved","status":"approved","payload":{"test":true}}'
```

### Signature inválida
1. Verifique secret no DB: `incoming_webhook_configs`
2. Verifique headers x-webhook-signature e x-webhook-timestamp
3. Em DEV mode, signature é opcional

### Automação não disparou
1. Verifique automações ativas para webhook_order_approved
2. Verifique logs de erro no servidor
3. Teste manualmente via API de retry

---

## Rollback
Se algo der errado:
1. Desative webhook no painel Grapfy
2. Verifique logs para identificar erro
3. Corrija configuração
4. Reative webhook

---

## Métricas de Sucesso
- ✅ Webhook processado em < 2 segundos
- ✅ Automação disparada em < 1 segundo
- ✅ Taxa de sucesso > 95%
- ✅ Nenhum evento em deadletter

---

**Data:** 17/12/2025
**Versão:** v2.9.3
**Autor:** Sistema
