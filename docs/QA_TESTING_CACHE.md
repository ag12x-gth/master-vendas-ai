# QA Testing - Sistema de Cache Redis

## Visão Geral

Este documento define os procedimentos de QA para validar o sistema de cache Redis implementado no Master IA Studio, incluindo cache de mensagens, usuários, contatos e métricas de performance.

## Pré-requisitos

### Ambiente de Teste
- Redis server rodando e acessível
- Banco de dados PostgreSQL configurado
- Aplicação Next.js em modo de desenvolvimento ou produção
- Acesso às variáveis de ambiente necessárias

### Ferramentas Necessárias
- Redis CLI ou Redis Desktop Manager
- Postman ou similar para testes de API
- Browser DevTools para monitoramento de performance
- Logs da aplicação

## Cenários de Teste

### 1. Cache de Mensagens (MessageCache)

#### 1.1 Teste de Cache Hit
**Objetivo:** Verificar se mensagens são armazenadas e recuperadas corretamente do cache

**Passos:**
1. Acesse uma conversa com histórico de mensagens
2. Verifique nos logs se há registro de cache miss na primeira consulta
3. Recarregue a página ou acesse a mesma conversa novamente
4. Verifique nos logs se há registro de cache hit na segunda consulta
5. Confirme que as mensagens são idênticas em ambas as consultas

**Critérios de Aceitação:**
- ✅ Primeira consulta registra cache miss
- ✅ Segunda consulta registra cache hit
- ✅ Dados retornados são idênticos
- ✅ Tempo de resposta da segunda consulta é significativamente menor

#### 1.2 Teste de TTL (Time To Live)
**Objetivo:** Verificar se o cache expira corretamente após 5 minutos

**Passos:**
1. Acesse uma conversa e force um cache hit
2. Aguarde 6 minutos
3. Acesse a mesma conversa novamente
4. Verifique se há cache miss nos logs

**Critérios de Aceitação:**
- ✅ Cache expira após 5 minutos
- ✅ Nova consulta após expiração registra cache miss

#### 1.3 Teste de Invalidação
**Objetivo:** Verificar se o cache é invalidado quando novas mensagens são adicionadas

**Passos:**
1. Acesse uma conversa e force um cache hit
2. Envie uma nova mensagem na conversa
3. Recarregue a conversa
4. Verifique se a nova mensagem aparece no histórico

**Critérios de Aceitação:**
- ✅ Nova mensagem é exibida imediatamente
- ✅ Cache é invalidado automaticamente

### 2. Cache de Usuários (UserCache)

#### 2.1 Teste de Cache de Dados de Usuário
**Objetivo:** Verificar cache de informações de usuário

**Passos:**
1. Faça login com um usuário
2. Acesse o perfil do usuário
3. Verifique logs para cache miss na primeira consulta
4. Navegue para outra página e retorne ao perfil
5. Verifique logs para cache hit na segunda consulta

**Critérios de Aceitação:**
- ✅ Dados do usuário são cacheados corretamente
- ✅ Cache hit ocorre em consultas subsequentes
- ✅ Informações exibidas são consistentes

#### 2.2 Teste de Cache de Dados de Empresa
**Objetivo:** Verificar cache de informações da empresa

**Passos:**
1. Acesse dados da empresa do usuário logado
2. Verifique cache miss inicial
3. Acesse novamente os dados da empresa
4. Verifique cache hit subsequente

**Critérios de Aceitação:**
- ✅ Dados da empresa são cacheados
- ✅ Performance melhora em acessos subsequentes

### 3. Cache de Contatos (ContactCache)

#### 3.1 Teste de Cache de Lista de Contatos
**Objetivo:** Verificar cache de listas de contatos

**Passos:**
1. Acesse a página de contatos
2. Verifique cache miss nos logs
3. Aplique filtros ou paginação
4. Retorne à visualização original
5. Verifique cache hit nos logs

**Critérios de Aceitação:**
- ✅ Lista de contatos é cacheada por filtros
- ✅ Paginação funciona com cache
- ✅ Performance melhora em consultas repetidas

#### 3.2 Teste de Cache de Contato Individual
**Objetivo:** Verificar cache de dados de contato específico

**Passos:**
1. Acesse detalhes de um contato específico
2. Verifique cache miss inicial
3. Navegue para outro contato e retorne
4. Verifique cache hit

**Critérios de Aceitação:**
- ✅ Dados individuais de contato são cacheados
- ✅ Cache funciona independentemente para cada contato

### 4. Sistema de Métricas (CacheMetrics)

#### 4.1 Teste de Coleta de Métricas
**Objetivo:** Verificar se métricas de cache são coletadas corretamente

**Passos:**
1. Acesse o endpoint `/api/v1/cache/metrics`
2. Verifique se retorna dados de métricas
3. Execute algumas operações que geram cache hits e misses
4. Acesse novamente o endpoint de métricas
5. Verifique se os números foram atualizados

**Critérios de Aceitação:**
- ✅ Endpoint de métricas responde corretamente
- ✅ Métricas são atualizadas em tempo real
- ✅ Hit rate é calculado corretamente
- ✅ Dados incluem todos os tipos de cache

#### 4.2 Teste de Reset de Métricas
**Objetivo:** Verificar funcionalidade de reset de métricas

**Passos:**
1. Acumule algumas métricas de cache
2. Faça POST para `/api/v1/cache/metrics` com `action: "reset"`
3. Verifique se métricas foram zeradas

**Critérios de Aceitação:**
- ✅ Métricas são resetadas corretamente
- ✅ Contadores voltam a zero

### 5. Testes de Performance

#### 5.1 Teste de Latência
**Objetivo:** Medir melhoria de performance com cache

**Passos:**
1. Meça tempo de resposta de consultas sem cache (primeira consulta)
2. Meça tempo de resposta de consultas com cache (consultas subsequentes)
3. Compare os tempos

**Critérios de Aceitação:**
- ✅ Cache reduz latência em pelo menos 50%
- ✅ Consultas com cache respondem em < 100ms

#### 5.2 Teste de Carga
**Objetivo:** Verificar comportamento do cache sob carga

**Passos:**
1. Simule múltiplas consultas simultâneas
2. Monitore métricas de cache
3. Verifique se hit rate se mantém alto
4. Monitore uso de memória do Redis

**Critérios de Aceitação:**
- ✅ Hit rate > 80% sob carga
- ✅ Sem degradação significativa de performance
- ✅ Uso de memória Redis dentro dos limites

### 6. Testes de Integração

#### 6.1 Teste de Fallback
**Objetivo:** Verificar comportamento quando Redis está indisponível

**Passos:**
1. Pare o serviço Redis
2. Tente acessar funcionalidades que usam cache
3. Verifique se aplicação continua funcionando
4. Verifique logs de erro

**Critérios de Aceitação:**
- ✅ Aplicação não quebra sem Redis
- ✅ Consultas fazem fallback para banco de dados
- ✅ Erros são logados apropriadamente

#### 6.2 Teste de Reconexão
**Objetivo:** Verificar reconexão automática ao Redis

**Passos:**
1. Com aplicação rodando, pare Redis
2. Aguarde alguns minutos
3. Reinicie Redis
4. Teste funcionalidades de cache

**Critérios de Aceitação:**
- ✅ Aplicação reconecta automaticamente
- ✅ Cache volta a funcionar normalmente

## Comandos Úteis para Testes

### Redis CLI
```bash
# Verificar chaves de cache
redis-cli KEYS "*"

# Verificar TTL de uma chave
redis-cli TTL "cache_key"

# Limpar todo o cache
redis-cli FLUSHALL

# Monitorar comandos em tempo real
redis-cli MONITOR

# Verificar informações do servidor
redis-cli INFO
```

### Endpoints de API para Teste
```bash
# Obter métricas de cache
GET /api/v1/cache/metrics

# Resetar métricas
POST /api/v1/cache/metrics
Content-Type: application/json
{"action": "reset"}

# Resetar métricas específicas
POST /api/v1/cache/metrics
Content-Type: application/json
{"action": "reset", "cacheType": "messages"}
```

## Checklist de Validação

### Funcionalidade Básica
- [ ] Cache de mensagens funciona corretamente
- [ ] Cache de usuários funciona corretamente
- [ ] Cache de contatos funciona corretamente
- [ ] TTL é respeitado em todos os caches
- [ ] Invalidação automática funciona

### Performance
- [ ] Melhoria significativa de latência
- [ ] Hit rate > 80% em uso normal
- [ ] Uso de memória Redis controlado
- [ ] Sem vazamentos de memória

### Métricas
- [ ] Coleta de métricas funciona
- [ ] Endpoint de métricas responde
- [ ] Reset de métricas funciona
- [ ] Dados de métricas são precisos

### Robustez
- [ ] Fallback funciona sem Redis
- [ ] Reconexão automática funciona
- [ ] Tratamento de erros adequado
- [ ] Logs informativos

### Integração
- [ ] Cache não interfere em funcionalidades existentes
- [ ] Dados sempre consistentes
- [ ] Sem regressões em funcionalidades

## Relatório de Bugs

Quando encontrar problemas, documente:

1. **Descrição do problema**
2. **Passos para reproduzir**
3. **Comportamento esperado vs atual**
4. **Logs relevantes**
5. **Configuração do ambiente**
6. **Impacto na funcionalidade**

## Notas Importantes

- Sempre teste em ambiente similar à produção
- Monitore logs durante todos os testes
- Verifique métricas antes e depois dos testes
- Documente qualquer comportamento inesperado
- Teste cenários de edge cases (dados vazios, conexões lentas, etc.)

---

**Última atualização:** Janeiro 2025
**Versão:** 1.0
**Responsável:** Equipe de QA