# 📡 Guia de Sincronização de Histórico - Grapfy

## Endpoint de Sincronização

**POST** `/api/v1/webhooks/sync`

### Objetivo
Buscar eventos históricos do Grapfy e sincronizá-los automaticamente com o banco de dados do Master IA.

### Body da Requisição

```json
{
  "companyId": "682b91ea-15ee-42da-8855-70309b237008",
  "webhookSettingId": "5f3a8f14-28b7-4ea5-815c-a9cddd7a71b3",
  "grapfyApiKey": "sua-api-key-grapfy",
  "limit": 100,
  "daysBack": 30
}
```

### Parâmetros

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `companyId` | string (UUID) | ✅ | ID da empresa no Master IA |
| `webhookSettingId` | string | ✅ | ID da configuração webhook no Grapfy |
| `grapfyApiKey` | string | ❌ | Chave API do Grapfy (usa env var se não enviado) |
| `limit` | number | ❌ | Máximo de eventos a sincronizar (padrão: 100) |
| `daysBack` | number | ❌ | Quantos dias no passado buscar (padrão: 30) |

### Exemplo de Uso

```bash
curl -X POST "http://localhost:5000/api/v1/webhooks/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "682b91ea-15ee-42da-8855-70309b237008",
    "webhookSettingId": "5f3a8f14-28b7-4ea5-815c-a9cddd7a71b3",
    "limit": 100,
    "daysBack": 30
  }'
```

### Resposta (Sucesso)

```json
{
  "success": true,
  "message": "Sincronização concluída",
  "summary": {
    "total": 50,
    "synced": 48,
    "errors": 2,
    "savedEventIds": ["id1", "id2", "id3", ...]
  },
  "timestamp": "2025-12-17T22:52:25.510Z"
}
```

---

## Status da Sincronização

**GET** `/api/v1/webhooks/sync/status?companyId=xxx`

Retorna estatísticas sobre eventos sincronizados.

### Resposta

```json
{
  "companyId": "682b91ea-15ee-42da-8855-70309b237008",
  "totalEvents": 15,
  "syncedFromGrapfy": 8,
  "lastSyncTime": "2025-12-17T22:52:25.510Z",
  "timestamp": "2025-12-17T22:53:00.000Z"
}
```

---

## Como Funciona

### Fluxo de Sincronização

```
1. Requerer sincronização
   ↓
2. Sistema busca eventos do Grapfy (últimos 30 dias, até 100)
   ↓
3. Para cada evento:
   - Valida formato do payload
   - Verifica se já existe no BD
   - Salva como webhook recebido
   - Processa automáticamente
   ↓
4. Retorna relatório com sucesso/erros
```

### Deduplicação

- ✅ Eventos já sincronizados **não são duplicados**
- ✅ Usa `eventId` do Grapfy para identificar únicos
- ✅ Evita processamento duplo

---

## Configuração Obrigatória

### 1. Grapfy API Key

Adicione ao `.env` ou como secret:

```bash
GRAPFY_API_KEY=sua_chave_api_aqui
```

### 2. Webhook Setting ID

Você pode encontrar no painel do Grapfy:
1. Acesse "Integrações" → "Webhooks"
2. Selecione o webhook
3. Copie o "ID da Configuração"

---

## Exemplo: Sincronizar Agora

```bash
# Development
curl -X POST "http://localhost:5000/api/v1/webhooks/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "682b91ea-15ee-42da-8855-70309b237008",
    "webhookSettingId": "5f3a8f14-28b7-4ea5-815c-a9cddd7a71b3",
    "limit": 100,
    "daysBack": 90
  }'

# Production
curl -X POST "https://seu-dominio.replit.dev/api/v1/webhooks/sync" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

---

## Troubleshooting

### ❌ Erro: "Empresa não encontrada"
- Verifique se o `companyId` está correto
- O ID deve ser um UUID válido

### ❌ Erro: "webhookSettingId é obrigatório"
- Copie o ID exato da configuração do Grapfy

### ❌ Nenhum evento sincronizado
- Verifique se o `GRAPFY_API_KEY` está configurado
- Aumente o `daysBack` para buscar períodos maiores
- Verifique se há eventos reais no Grapfy nesse período

---

## Logs do Sistema

Quando sincronizar, verificar logs para:

```
[WEBHOOK-SYNC:xxx] ===== INICIANDO SINCRONIZAÇÃO =====
[WEBHOOK-SYNC:xxx] Empresa: 682b91ea-15ee-42da-8855-70309b237008
[WEBHOOK-SYNC:xxx] Eventos históricos encontrados: 50
[WEBHOOK-SYNC:xxx] ✅ Evento sincronizado: event-id-123
[WEBHOOK-SYNC:xxx] ===== SINCRONIZAÇÃO CONCLUÍDA =====
[WEBHOOK-SYNC:xxx] Sucesso: 48, Erros: 2
```

---

## Automatização (Próxima Fase)

Para sincronizar periodicamente:

```typescript
// src/app/api/v1/admin/scheduler/route.ts
// Adicionar job para chamar /api/v1/webhooks/sync a cada 6 horas
setInterval(() => {
  fetch('/api/v1/webhooks/sync', {
    method: 'POST',
    body: JSON.stringify({
      companyId: COMPANY_ID,
      webhookSettingId: WEBHOOK_ID,
      daysBack: 1 // Apenas último dia
    })
  });
}, 6 * 60 * 60 * 1000);
```

---

**Versão:** 2.10.2  
**Data:** 17/12/2025  
**Status:** ✅ Pronto para uso
