# Links de Integracao - Voice AI Platform API

## URL Base

```
https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev
```

---

## Documentacao

| Recurso | URL |
|---------|-----|
| Documentacao Completa | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/doc-setup |
| Swagger UI (Interativo) | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api |
| Health Check | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/health |

---

## Endpoints da API

### Agentes de IA

| Metodo | Endpoint |
|--------|----------|
| GET | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/agents |
| POST | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/agents |
| GET | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/agents/{id} |
| PATCH | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/agents/{id} |
| DELETE | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/agents/{id} |

### Chamadas

| Metodo | Endpoint |
|--------|----------|
| GET | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/calls |
| POST | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/calls/test |
| GET | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/calls/analytics |
| GET | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/calls/{id} |

### Organizacoes

| Metodo | Endpoint |
|--------|----------|
| GET | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/organizations |
| POST | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/organizations |
| GET | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/organizations/{id} |
| POST | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/organizations/{id}/setup-telephony |

### Configuracao

| Metodo | Endpoint |
|--------|----------|
| GET | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/config |
| GET | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/config/status |
| POST | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/config/test-voice-provider |
| POST | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/config/test-telephony-provider |
| POST | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/config/test-llm-provider |
| GET | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/config/twilio/phone-numbers |
| POST | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/config/twilio/configure-webhooks |

### Integracoes Retell

| Metodo | Endpoint |
|--------|----------|
| GET | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/integrations/retell/agents |
| POST | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/integrations/retell/agents |
| GET | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/integrations/retell/agents/{id} |
| DELETE | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/integrations/retell/agents/{id} |
| POST | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/integrations/retell/calls |
| GET | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/integrations/retell/phone-numbers |
| POST | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/integrations/retell/phone-numbers/import |

---

## Webhooks (URLs para configurar no Twilio/Retell)

| Webhook | URL |
|---------|-----|
| Eventos de Voz (Retell) | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/webhooks/voice/call-events |
| Status de Chamada (Twilio) | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/webhooks/telephony/call-status |
| Chamada Recebida (Twilio) | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/webhooks/telephony/incoming-call |
| Webhook Customizado | https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/webhooks/custom/{organizationId} |

---

## Autenticacao

Todos os endpoints (exceto /health e /api/webhooks/*) requerem o header:

```
X-API-KEY: sua_chave_api
```

---

## Configuracao no Seu Sistema

### JavaScript/Node.js

```javascript
const API_URL = 'https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev';
const API_KEY = 'sua_chave_api';

const headers = {
  'X-API-KEY': API_KEY,
  'Content-Type': 'application/json'
};

// Exemplo: Listar agentes
const response = await fetch(`${API_URL}/api/agents`, { headers });
const agents = await response.json();
```

### Python

```python
import requests

API_URL = 'https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev'
API_KEY = 'sua_chave_api'

headers = {
    'X-API-KEY': API_KEY,
    'Content-Type': 'application/json'
}

# Exemplo: Listar agentes
response = requests.get(f'{API_URL}/api/agents', headers=headers)
agents = response.json()
```

### cURL

```bash
# Exemplo: Listar agentes
curl -X GET "https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/agents" \
  -H "X-API-KEY: sua_chave_api"

# Exemplo: Criar agente
curl -X POST "https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/agents" \
  -H "X-API-KEY: sua_chave_api" \
  -H "Content-Type: application/json" \
  -d '{"name": "Meu Agente", "type": "inbound", "systemPrompt": "Voce e um assistente."}'

# Exemplo: Iniciar chamada
curl -X POST "https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev/api/calls/test" \
  -H "X-API-KEY: sua_chave_api" \
  -H "Content-Type: application/json" \
  -d '{"toNumber": "+5511999999999"}'
```

---

## Variaveis de Ambiente Recomendadas

```env
VOICE_API_URL=https://03608fd2-8ea3-495c-b171-af750af99679-00-6lyy4hh468xy.worf.replit.dev
VOICE_API_KEY=sua_chave_api
```

---

## Nota Importante

Esta e a URL de desenvolvimento. Apos publicar o app, voce tera uma URL de producao fixa como:

```
https://seu-projeto.replit.app
```

Substitua todas as URLs acima pela URL de producao apos publicar.
