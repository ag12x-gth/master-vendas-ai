# Melhorias de Performance com Redis Cache

Este documento descreve as melhorias de performance implementadas no sistema usando Redis como cache distribuído.

## 📊 Resumo das Melhorias

### ✅ Implementações Concluídas

1. **Connection Pooling PostgreSQL**
   - Configuração otimizada com pool de 20 conexões
   - Timeout de conexões inativas: 30s
   - Timeout de estabelecimento: 10s

2. **Cache de Histórico de Mensagens**
   - TTL: 5 minutos
   - Invalidação automática ao inserir novas mensagens
   - Redução estimada: 60-80% nas consultas ao banco

3. **Cache de Dados de Empresa e Usuário**
   - TTL: 30 minutos
   - Cache separado para empresas e usuários
   - Otimização de consultas frequentes de autenticação

4. **Cache de Contatos e Validações**
   - TTL: 1 hora para contatos, 30 min para validações
   - Índice por telefone para busca rápida
   - Pré-carregamento de contatos da empresa
   - Validação em cache para importações em massa

5. **Migração Tool Results Store**
   - Migrado de Map em memória para Redis
   - TTL: 30 minutos
   - Suporte a múltiplas instâncias da aplicação

6. **Sistema de Métricas**
   - Monitoramento de hit/miss rate
   - Métricas de uso de memória Redis
   - Endpoint de monitoramento: `/api/v1/cache/metrics`

## 🚀 Como Usar

### Cache de Mensagens

```typescript
import { MessageCache } from '@/lib/cache/message-cache';

// Buscar mensagens com cache
const messages = await MessageCache.getMessagesWithCache({
  chatId: 'chat-id',
  limit: 100,
  fromDate: '2024-01-01'
});

// Invalidar cache após mudanças
await MessageCache.invalidateChat('chat-id');
```

### Cache de Usuários e Empresas

```typescript
import { UserCache } from '@/lib/cache/user-cache';

// Buscar empresa com cache
const company = await UserCache.getCompanyWithCache('company-id');

// Buscar usuário com cache
const user = await UserCache.getUserWithCache('user-id');

// Invalidar cache após atualizações
await UserCache.invalidateCompany('company-id');
await UserCache.invalidateUser('user-id');
```

### Cache de Contatos

```typescript
import { ContactCache } from '@/lib/cache/contact-cache';

// Validar contato com cache
const validation = await ContactCache.validateContact(
  '+5511999999999',
  'company-id',
  'Nome',
  'email@example.com'
);

// Buscar contato por telefone
const contact = await ContactCache.getContactByPhone(
  '+5511999999999',
  'company-id'
);

// Pré-carregar contatos da empresa
await ContactCache.preloadCompanyContacts('company-id', 1000);
```

### Tool Results Store

```typescript
import { storeToolResult, getLastToolResult } from '@/ai/tool-results-store';

// Armazenar resultado (agora async)
await storeToolResult('chat-id', 'tool-name', 'result');

// Buscar resultado (agora async)
const result = await getLastToolResult('chat-id', 'tool-name');
```

## 📈 Métricas e Monitoramento

### Endpoint de Métricas

```bash
# Buscar métricas de cache
GET /api/v1/cache/metrics

# Resetar métricas
DELETE /api/v1/cache/metrics
```

### Exemplo de Resposta

```json
{
  "cache": {
    "messageCache": {
      "hits": 150,
      "misses": 50,
      "hitRate": 75.0,
      "totalRequests": 200
    },
    "userCache": {
      "hits": 300,
      "misses": 20,
      "hitRate": 93.75,
      "totalRequests": 320
    },
    "overall": {
      "hits": 450,
      "misses": 70,
      "hitRate": 86.54,
      "totalRequests": 520
    }
  },
  "redis": {
    "memory": {
      "usedMemoryHuman": "2.5MB",
      "memoryUsagePercent": 12.5
    },
    "stats": {
      "connectedClients": 3,
      "hitRate": 89.2
    }
  }
}
```

## 🔧 Configuração

### Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas:

```env
# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/database

# Redis
REDIS_URL=redis://localhost:6379
```

### Connection Pooling PostgreSQL

As configurações de pool estão em `src/lib/db/index.ts`:

```typescript
const connectionConfig = {
  max: 20, // Máximo de conexões no pool
  idle_timeout: 30, // Timeout de conexões inativas (segundos)
  connect_timeout: 10, // Timeout para estabelecer conexão (segundos)
  prepare: false, // Desabilita prepared statements
};
```

## 📊 Benefícios Esperados

### Performance
- **60-80% redução** nas consultas ao PostgreSQL
- **Latência reduzida** nas respostas de IA (cache de histórico)
- **Importação de contatos mais rápida** (validações em cache)
- **Polling otimizado** (cache de mensagens recentes)

### Escalabilidade
- **Suporte a múltiplas instâncias** (Redis distribuído)
- **Connection pooling** evita esgotamento de conexões
- **Cache distribuído** entre instâncias da aplicação

### Recursos
- **Menor uso de CPU** do PostgreSQL
- **Redução de I/O** do banco de dados
- **Melhor utilização de memória** (cache inteligente)

## 🔍 Monitoramento

### Métricas Importantes

1. **Hit Rate do Cache**: Deve estar acima de 70%
2. **Uso de Memória Redis**: Monitorar para evitar OOM
3. **Conexões PostgreSQL**: Verificar se o pool está adequado
4. **Latência das Consultas**: Comparar antes/depois

### Alertas Recomendados

- Hit rate abaixo de 60%
- Uso de memória Redis acima de 80%
- Pool de conexões PostgreSQL esgotado
- Tempo de resposta das APIs acima de 2s

## 🚨 Troubleshooting

### Cache Miss Alto
- Verificar TTL adequado para o caso de uso
- Analisar padrões de invalidação
- Considerar pré-carregamento de dados

### Problemas de Memória Redis
- Ajustar TTL dos caches
- Implementar limpeza automática
- Considerar particionamento de dados

### Connection Pool Esgotado
- Aumentar `max` connections
- Verificar vazamentos de conexão
- Analisar queries lentas

## 📝 Próximos Passos

1. **Monitorar métricas** por 1-2 semanas
2. **Ajustar TTLs** baseado nos padrões de uso
3. **Implementar alertas** de performance
4. **Considerar cache de queries complexas** adicionais
5. **Otimizar importação de contatos** com processamento assíncrono

---

**Nota**: Todas as implementações são backward-compatible e incluem fallbacks para casos de falha do Redis.