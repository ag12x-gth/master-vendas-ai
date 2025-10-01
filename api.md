# Documentação da API - Sistema de Agentes IA

## Visão Geral

A API do Sistema de Agentes IA é construída com FastAPI e fornece endpoints para interação com agentes especializados e sistema de personas.

**Base URL**: `https://multidesk-master-ia-agentes.vs1kre.easypanel.host/`

**Formato**: JSON

**Autenticação**: Não implementada (em desenvolvimento)

## Endpoints Principais

### Sistema MCP (Model Context Protocol)

#### POST /mcp/validate

Valida uma URL MCP e retorna informações sobre o servidor e ferramentas disponíveis.

**URL**: `/mcp/validate`

**Método**: `POST`

**Headers**:
```
Content-Type: application/json
```

**Body Parameters**:

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|----------|
| `url` | string | Sim | URL do servidor MCP |
| `timeout` | integer | Não | Timeout em segundos (padrão: 30) |

**Exemplo de Requisição**:
```json
{
  "url": "https://hook.multidesk.io/mcp/075e9725-fa54-4b11-96ef-fca1a76993cf",
  "timeout": 30
}
```

**Exemplo de Resposta (Sucesso)**:
```json
{
  "success": true,
  "url": "https://hook.multidesk.io/mcp/075e9725-fa54-4b11-96ef-fca1a76993cf",
  "is_valid": true,
  "server_info": {
    "protocolVersion": "2025-03-26",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "MCP_Server_Trigger",
      "version": "0.1.0"
    }
  },
  "tools": [
    {
      "name": "Date_Time",
      "description": "Manipulate date and time values",
      "input_schema": {
        "type": "object",
        "properties": {},
        "additionalProperties": true
      }
    },
    {
      "name": "Criar_lead",
      "description": "Append row in sheet in Google Sheets",
      "input_schema": {
        "type": "object",
        "properties": {
          "NOME": {"type": "string"},
          "TELEFONE": {"type": "string"},
          "EMAIL": {"type": "string"}
        },
        "required": ["NOME", "TELEFONE", "EMAIL"]
      }
    }
  ],
  "response_time_ms": 1419,
  "error": null,
  "timestamp": "2025-09-04T09:23:10.576652Z"
}
```

**Códigos de Resposta**:
- `200`: Validação realizada com sucesso
- `400`: Dados de entrada inválidos
- `500`: Erro interno do servidor

#### GET /mcp/tools

Obtém a lista de ferramentas disponíveis em um servidor MCP.

**URL**: `/mcp/tools`

**Método**: `GET`

**Query Parameters**:

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|----------|
| `url` | string | Sim | URL do servidor MCP |
| `timeout` | integer | Não | Timeout em segundos (padrão: 30) |

**Exemplo de Requisição**:
```
GET /mcp/tools?url=https://hook.multidesk.io/mcp/075e9725-fa54-4b11-96ef-fca1a76993cf&timeout=30
```

**Exemplo de Resposta**:
```json
[
  {
    "name": "Date_Time",
    "description": "Manipulate date and time values",
    "input_schema": {
      "type": "object",
      "properties": {},
      "additionalProperties": true
    }
  },
  {
    "name": "Criar_lead",
    "description": "Append row in sheet in Google Sheets",
    "input_schema": {
      "type": "object",
      "properties": {
        "NOME": {"type": "string"},
        "TELEFONE": {"type": "string"},
        "EMAIL": {"type": "string"}
      },
      "required": ["NOME", "TELEFONE", "EMAIL"]
    }
  }
]
```

#### GET /mcp/health

Verifica se o serviço MCP está funcionando corretamente.

**URL**: `/mcp/health`

**Método**: `GET`

**Exemplo de Resposta**:
```json
{
  "status": "healthy",
  "service": "mcp",
  "timestamp": "2025-09-04T09:23:10.576652Z"
}
```

### Sistema de Personas

#### POST /personas/chat

Inicia ou continua uma conversa com uma persona específica.

**URL**: `/personas/chat`

**Método**: `POST`

**Headers**:
```
Content-Type: application/json
```

**Body Parameters**:

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|----------|
| `message` | string | Sim | Mensagem do usuário |
| `company_id` | string | Sim | UUID da empresa |
| `persona_id` | string | Sim | UUID da persona |
| `contact_id` | string | Não | ID do contato para histórico |
| `context` | object | Não | Contexto adicional |

**Exemplo de Requisição**:
```json
{
  "message": "Olá, como você pode me ajudar com vendas?",
  "company_id": "d46dc67d-2de5-4bbd-8542-100577cf4e16",
  "persona_id": "ebfa7c1d-5536-445c-9870-f7260d9c6fe6",
  "contact_id": "contact_joao_123",
  "context": {
    "conversation_id": "conv_123",
    "source": "website"
  }
}
```

**Exemplo de Resposta**:
```json
{
  "message": "Olá! Tudo bem com você? Aqui é o Agente SDR, e estou aqui para te apresentar uma solução inovadora que pode transformar a forma como sua empresa lida com atendimento, vendas, suporte e agendamentos.",
  "persona_id": "ebfa7c1d-5536-445c-9870-f7260d9c6fe6",
  "persona_name": "AGENTE DE VENDAS",
  "tokens_used": 252,
  "response_time_ms": 8857,
  "timestamp": "04/09/2025 07:23:22",
  "context": {
    "conversation_id": "conv_123",
    "model_used": "gpt-4o",
    "provider_used": "OPENAI",
    "contact_id": "contact_joao_123"
  }
}
```

**Códigos de Status**:
- `200`: Sucesso
- `400`: Dados inválidos
- `404`: Persona não encontrada
- `500`: Erro interno do servidor

#### GET /personas

Lista todas as personas disponíveis para uma empresa.

**URL**: `/personas`

**Método**: `GET`

**Query Parameters**:

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|----------|
| `company_id` | string | Sim | UUID da empresa |

**Exemplo de Requisição**:
```
GET /personas?company_id=d46dc67d-2de5-4bbd-8542-100577cf4e16
```

**Exemplo de Resposta**:
```json
[
  {
    "id": "ebfa7c1d-5536-445c-9870-f7260d9c6fe6",
    "name": "AGENTE DE VENDAS",
    "description": "Especialista em vendas e prospecção de clientes",
    "company_id": "d46dc67d-2de5-4bbd-8542-100577cf4e16",
    "created_at": "2025-01-04T10:00:00Z",
    "updated_at": "2025-01-04T10:00:00Z"
  },
  {
    "id": "f2b8c3d1-4a5e-4c6d-8e9f-1a2b3c4d5e6f",
    "name": "AGENTE DE SUPORTE",
    "description": "Especialista em atendimento ao cliente",
    "company_id": "d46dc67d-2de5-4bbd-8542-100577cf4e16",
    "created_at": "2025-01-04T10:00:00Z",
    "updated_at": "2025-01-04T10:00:00Z"
  }
]
```

### Sistema de Agentes

#### POST /agents/chat

Interação geral com agentes especializados.

**URL**: `/agents/chat`

**Método**: `POST`

**Body Parameters**:

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|----------|
| `message` | string | Sim | Mensagem do usuário |
| `agent_type` | string | Sim | Tipo do agente (chat, campaign, contacts, etc.) |
| `company_id` | string | Sim | UUID da empresa |
| `context` | object | Não | Contexto adicional |

**Exemplo de Requisição**:
```json
{
  "message": "Analise os dados de vendas do último trimestre",
  "agent_type": "data_analyst",
  "company_id": "d46dc67d-2de5-4bbd-8542-100577cf4e16",
  "context": {
    "period": "Q4_2024",
    "metrics": ["revenue", "conversion_rate"]
  }
}
```

#### POST /agents/orchestrate

Orquestração inteligente de múltiplos agentes.

**URL**: `/agents/orchestrate`

**Método**: `POST`

**Body Parameters**:

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|----------|
| `task` | string | Sim | Tarefa a ser executada |
| `company_id` | string | Sim | UUID da empresa |
| `priority` | string | Não | Prioridade (low, medium, high) |
| `context` | object | Não | Contexto adicional |

### Sistema LLM

#### POST /llm/generate

Geração direta de texto usando provedores LLM.

**URL**: `/llm/generate`

**Método**: `POST`

**Body Parameters**:

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|----------|
| `prompt` | string | Sim | Prompt para o modelo |
| `provider` | string | Não | Provedor específico (openai, anthropic, gemini) |
| `model` | string | Não | Modelo específico |
| `temperature` | float | Não | Temperatura (0.0-1.0) |
| `max_tokens` | integer | Não | Máximo de tokens |

**Exemplo de Requisição**:
```json
{
  "prompt": "Escreva um email de follow-up para um cliente interessado em nossos serviços de IA",
  "provider": "openai",
  "model": "gpt-4o",
  "temperature": 0.7,
  "max_tokens": 500
}
```

#### GET /llm/providers

Lista provedores LLM disponíveis e seus status.

**URL**: `/llm/providers`

**Método**: `GET`

**Exemplo de Resposta**:
```json
{
  "providers": [
    {
      "name": "openai",
      "status": "active",
      "models": ["gpt-4o", "gpt-3.5-turbo"],
      "rate_limit": {
        "requests_per_minute": 3000,
        "tokens_per_minute": 250000
      }
    },
    {
      "name": "anthropic",
      "status": "active",
      "models": ["claude-3-sonnet", "claude-3-haiku"],
      "rate_limit": {
        "requests_per_minute": 1000,
        "tokens_per_minute": 100000
      }
    }
  ]
}
```

## Códigos de Status HTTP

| Código | Descrição |
|--------|----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Requisição inválida |
| 401 | Não autorizado |
| 403 | Proibido |
| 404 | Não encontrado |
| 422 | Entidade não processável (erro de validação) |
| 429 | Muitas requisições (rate limit) |
| 500 | Erro interno do servidor |
| 502 | Bad Gateway (erro do provedor LLM) |
| 503 | Serviço indisponível |

## Tratamento de Erros

### Formato de Erro Padrão

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados de entrada inválidos",
    "details": {
      "field": "message",
      "issue": "Campo obrigatório não fornecido"
    },
    "timestamp": "2025-01-04T10:30:00Z",
    "request_id": "req_123456789"
  }
}
```

### Tipos de Erro

| Código | Descrição |
|--------|----------|
| `VALIDATION_ERROR` | Erro de validação de dados |
| `PERSONA_NOT_FOUND` | Persona não encontrada |
| `COMPANY_NOT_FOUND` | Empresa não encontrada |
| `LLM_PROVIDER_ERROR` | Erro do provedor LLM |
| `RATE_LIMIT_EXCEEDED` | Limite de requisições excedido |
| `INTERNAL_ERROR` | Erro interno do sistema |
| `REDIS_CONNECTION_ERROR` | Erro de conexão com Redis |
| `DATABASE_ERROR` | Erro de banco de dados |

## Rate Limiting

**Limites Atuais** (por IP):
- 100 requisições por minuto
- 1000 requisições por hora
- 10000 requisições por dia

**Headers de Rate Limit**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641024000
```

## Exemplos de Uso

### Conversa Completa com Persona

```bash
# 1. Primeira mensagem
curl -X POST "http://localhost:8001/personas/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Olá, preciso de ajuda com vendas",
    "company_id": "d46dc67d-2de5-4bbd-8542-100577cf4e16",
    "persona_id": "ebfa7c1d-5536-445c-9870-f7260d9c6fe6",
    "contact_id": "contact_cliente_123"
  }'

# 2. Continuação da conversa
curl -X POST "http://localhost:8001/personas/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Minha empresa é do setor de tecnologia",
    "company_id": "d46dc67d-2de5-4bbd-8542-100577cf4e16",
    "persona_id": "ebfa7c1d-5536-445c-9870-f7260d9c6fe6",
    "contact_id": "contact_cliente_123"
  }'
```

### PowerShell (Windows)

```powershell
# Configurar headers
$headers = @{ 'Content-Type' = 'application/json' }

# Primeira mensagem
$body1 = @{
  message = 'Olá, como você pode me ajudar?'
  company_id = 'd46dc67d-2de5-4bbd-8542-100577cf4e16'
  persona_id = 'ebfa7c1d-5536-445c-9870-f7260d9c6fe6'
  contact_id = 'contact_teste_123'
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri 'http://localhost:8001/personas/chat' -Method POST -Headers $headers -Body $body1

# Segunda mensagem
$body2 = @{
  message = 'Meu nome é João Silva, trabalho na TechCorp'
  company_id = 'd46dc67d-2de5-4bbd-8542-100577cf4e16'
  persona_id = 'ebfa7c1d-5536-445c-9870-f7260d9c6fe6'
  contact_id = 'contact_teste_123'
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri 'http://localhost:8001/personas/chat' -Method POST -Headers $headers -Body $body2
```

### Python

```python
import requests
import json

base_url = "http://localhost:8001"
headers = {"Content-Type": "application/json"}

# Primeira mensagem
data1 = {
    "message": "Olá, como você pode me ajudar?",
    "company_id": "d46dc67d-2de5-4bbd-8542-100577cf4e16",
    "persona_id": "ebfa7c1d-5536-445c-9870-f7260d9c6fe6",
    "contact_id": "contact_python_123"
}

response1 = requests.post(
    f"{base_url}/personas/chat",
    headers=headers,
    json=data1
)

print("Primeira resposta:", response1.json())

# Segunda mensagem
data2 = {
    "message": "Minha empresa é do setor financeiro",
    "company_id": "d46dc67d-2de5-4bbd-8542-100577cf4e16",
    "persona_id": "ebfa7c1d-5536-445c-9870-f7260d9c6fe6",
    "contact_id": "contact_python_123"
}

response2 = requests.post(
    f"{base_url}/personas/chat",
    headers=headers,
    json=data2
)

print("Segunda resposta:", response2.json())
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

const baseURL = 'http://localhost:8001';
const headers = { 'Content-Type': 'application/json' };

async function chatWithPersona() {
  try {
    // Primeira mensagem
    const response1 = await axios.post(`${baseURL}/personas/chat`, {
      message: 'Olá, como você pode me ajudar?',
      company_id: 'd46dc67d-2de5-4bbd-8542-100577cf4e16',
      persona_id: 'ebfa7c1d-5536-445c-9870-f7260d9c6fe6',
      contact_id: 'contact_js_123'
    }, { headers });
    
    console.log('Primeira resposta:', response1.data);
    
    // Segunda mensagem
    const response2 = await axios.post(`${baseURL}/personas/chat`, {
      message: 'Trabalho no setor de e-commerce',
      company_id: 'd46dc67d-2de5-4bbd-8542-100577cf4e16',
      persona_id: 'ebfa7c1d-5536-445c-9870-f7260d9c6fe6',
      contact_id: 'contact_js_123'
    }, { headers });
    
    console.log('Segunda resposta:', response2.data);
    
  } catch (error) {
    console.error('Erro:', error.response?.data || error.message);
  }
}

chatWithPersona();
```

## Monitoramento e Métricas

### Endpoint de Health Check

```
GET /health
```

**Resposta**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-04T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "llm_providers": {
      "openai": "healthy",
      "anthropic": "healthy",
      "gemini": "degraded"
    }
  }
}
```

### Métricas Prometheus

```
GET /metrics
```

Retorna métricas no formato Prometheus para monitoramento.

## Versionamento

A API segue versionamento semântico:
- **Major**: Mudanças incompatíveis
- **Minor**: Novas funcionalidades compatíveis
- **Patch**: Correções de bugs

**Versão Atual**: `1.0.0`

## Suporte

Para suporte técnico ou dúvidas sobre a API:
- Documentação: `/docs` (Swagger UI)
- Redoc: `/redoc`
- Issues: GitHub Issues
- Email: suporte@agentes-ia.com