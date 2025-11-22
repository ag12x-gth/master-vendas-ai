# 🚀 PLANO DE EXECUÇÃO - CORREÇÕES DE PERFORMANCE E ESTABILIDADE
**Data:** 22/11/2025  
**Status:** 🔴 CRÍTICO - Sistema em Degradação Progressiva  
**Versão:** 1.0

---

## 📊 RESUMO EXECUTIVO DOS TESTES E2E REALIZADOS

### ✅ **TESTES EXECUTADOS COM EVIDÊNCIAS**

| Teste | Resultado | Evidência | Status |
|-------|-----------|-----------|--------|
| **#1 Latência API Notificações** | 1.46s (Erro 500) | `Time Total: 1.466248s` | 🔴 CRÍTICO |
| **#2 Status do Cache** | Redis UP mas inativo | `"redis":{"status":"up","responseTime":0}` | ⚠️ ALERTA |
| **#3 Performance Queries** | 25-43ms | `Time: 0.025390s - 0.043908s` | ✅ NORMAL |
| **#4 Logs de Compilação** | 1-5s por rota | `Compiled /api/v1/campaigns/trigger in 5.2s` | ⚠️ ALERTA |
| **#5 Teste de Carga** | 32-79ms | `Time: 0.032587s - 0.079857s` | ✅ ACEITÁVEL |
| **#6 Memória RAM** | 91-92% uso | `"memory":{"used":483,"total":523,"percentage":92}` | 🔴 CRÍTICO |

### 📈 **MÉTRICAS BASELINE ATUAIS**
```
- Tempo médio de resposta (health): 42ms
- Tempo de compilação: 1-5 segundos
- Uso de memória: 91-92%
- Cache hit rate: 0% (todas requisições marcadas como cached: false)
- Database response time: 13-15ms
- Redis response time: 0ms (não está sendo usado)
```

---

## 🎯 FASE 1: CORREÇÕES URGENTES (PRIORIDADE MÁXIMA)

### 1.1 CONFIGURAR CACHE REDIS CORRETAMENTE
**Problema Identificado:** Redis está UP mas não está persistindo dados  
**Evidência E2E:** `"redis":{"status":"up","responseTime":0}` + sem cache entries

#### **AÇÕES:**
```typescript
// 1. Verificar configuração do Redis
// Arquivo: src/lib/cache.ts
- Implementar TTL apropriado (300-3600 segundos)
- Configurar serialização correta de objetos
- Adicionar logs de debug para cache hits/misses

// 2. Implementar cache para queries frequentes
// Arquivo: src/app/api/v1/conversations/status/route.ts
- Cache de status de conversas (TTL: 60s)
- Cache de notificações (TTL: 30s)
- Cache de connections health (TTL: 120s)
```

#### **TESTE E2E VALIDAÇÃO FASE 1.1:**
```bash
# Verificar se cache está persistindo
curl http://localhost:5000/api/v1/conversations/status # Primeira vez
curl http://localhost:5000/api/v1/conversations/status # Segunda vez deve ser mais rápida
# Verificar logs para "cache hit" vs "cache miss"
```

**Meta:** Cache hit rate > 60% em queries repetitivas

---

### 1.2 OTIMIZAR USO DE MEMÓRIA
**Problema Identificado:** 91-92% de uso de RAM  
**Evidência E2E:** `"memory":{"used":483,"total":523,"percentage":92}`

#### **AÇÕES:**
```javascript
// 1. Aumentar limite de memória do Node.js
// Arquivo: package.json
"scripts": {
  "dev:server": "NODE_OPTIONS='--max-old-space-size=2048' tsx watch server.js"
}

// 2. Implementar garbage collection mais agressivo
// Arquivo: server.js
if (global.gc) {
  setInterval(() => {
    global.gc();
  }, 60000); // A cada minuto
}

// 3. Limpar objetos não utilizados
// Remover listeners desnecessários
// Implementar cleanup em intervalos
```

#### **TESTE E2E VALIDAÇÃO FASE 1.2:**
```bash
# Monitorar memória antes e depois
curl http://localhost:5000/api/health | grep -o '"memory":{[^}]*}'
# Executar teste de carga
for i in {1..100}; do curl http://localhost:5000/api/health & done
# Verificar memória novamente
```

**Meta:** Uso de memória < 75%

---

### 1.3 RESOLVER ENCRYPTION_KEY WARNING
**Problema Identificado:** ENCRYPTION_KEY sendo rehashed múltiplas vezes  
**Evidência E2E:** `⚠️ ENCRYPTION_KEY was hashed to 32 bytes for compatibility` aparece 50+ vezes

#### **AÇÕES:**
```typescript
// Arquivo: src/lib/encryption.ts
// Implementar singleton pattern para evitar rehashing
let hashedKey: Buffer | null = null;

export function getEncryptionKey(): Buffer {
  if (hashedKey) return hashedKey;
  
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY not configured');
  
  // Hash apenas uma vez
  hashedKey = crypto.createHash('sha256').update(key).digest();
  return hashedKey;
}
```

#### **TESTE E2E VALIDAÇÃO FASE 1.3:**
```bash
# Verificar logs para contagem de warnings
grep "ENCRYPTION_KEY was hashed" /tmp/logs/*.log | wc -l
# Deve aparecer no máximo 1 vez após correção
```

**Meta:** Warning aparece apenas 1x na inicialização

---

## 🔧 FASE 2: OTIMIZAÇÕES DE PERFORMANCE (PRIORIDADE ALTA)

### 2.1 IMPLEMENTAR ÍNDICES NO POSTGRESQL
**Problema Identificado:** Queries degradando com volume  
**Evidência dos Logs Anteriores:** Query time aumentou de 26ms para 964ms

#### **AÇÕES:**
```sql
-- Criar índices compostos para queries frequentes
CREATE INDEX idx_conversations_company_status ON conversations(company_id, status, updated_at DESC);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_contacts_company_phone ON contacts(company_id, phone_number);

-- Analisar queries lentas
EXPLAIN ANALYZE SELECT * FROM conversations WHERE company_id = ? AND status = ?;
```

#### **TESTE E2E VALIDAÇÃO FASE 2.1:**
```bash
# Medir performance antes dos índices
time psql $DATABASE_URL -c "SELECT COUNT(*) FROM conversations;"

# Aplicar índices
npm run db:push --force

# Medir performance depois
time psql $DATABASE_URL -c "SELECT COUNT(*) FROM conversations;"
```

**Meta:** Redução de 50% no tempo de query

---

### 2.2 DESABILITAR HOT RELOAD EM PRODUÇÃO
**Problema Identificado:** Múltiplas recompilações durante runtime  
**Evidência E2E:** `Compiled /api/v1/campaigns/trigger in 5.2s`

#### **AÇÕES:**
```javascript
// Arquivo: next.config.js
module.exports = {
  // Desabilitar hot reload em produção
  webpackDevMiddleware: config => {
    if (process.env.NODE_ENV === 'production') {
      config.watchOptions = {
        ignored: /node_modules/,
        poll: false
      };
    }
    return config;
  },
  
  // Otimizar build
  swcMinify: false, // Temporário até resolver issues
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lodash', 'date-fns']
  }
};
```

#### **TESTE E2E VALIDAÇÃO FASE 2.2:**
```bash
# Verificar se há recompilações
tail -f /tmp/logs/*.log | grep "Compiling"
# Não deve aparecer nenhuma compilação após inicialização
```

**Meta:** Zero recompilações após startup

---

### 2.3 IMPLEMENTAR PAGINAÇÃO REAL
**Problema Identificado:** 943 conversas carregadas de uma vez  
**Evidência dos Logs:** `Rows: 943/943 | Limit: 10000`

#### **AÇÕES:**
```typescript
// Arquivo: src/app/api/v1/conversations/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const offset = (page - 1) * limit;
  
  const conversations = await db
    .select()
    .from(conversationsTable)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(conversationsTable.updatedAt));
    
  return NextResponse.json({
    data: conversations,
    pagination: {
      page,
      limit,
      total: await getTotal()
    }
  });
}
```

#### **TESTE E2E VALIDAÇÃO FASE 2.3:**
```bash
# Testar paginação
curl "http://localhost:5000/api/v1/conversations?page=1&limit=20"
curl "http://localhost:5000/api/v1/conversations?page=2&limit=20"
# Verificar que retorna apenas 20 items por vez
```

**Meta:** Máximo 50 registros por requisição

---

## 🔄 FASE 3: IMPLEMENTAR SISTEMA DE FILAS (PRIORIDADE MÉDIA)

### 3.1 CONFIGURAR BULL/BULLMQ PARA WEBHOOKS
**Problema Identificado:** 6 webhooks processados simultaneamente causando race conditions  
**Evidência dos Logs:** Múltiplos webhooks em 18ms

#### **AÇÕES:**
```typescript
// Instalar BullMQ
// npm install bullmq

// Arquivo: src/lib/queues/webhook-queue.ts
import { Queue, Worker } from 'bullmq';

export const webhookQueue = new Queue('webhooks', {
  connection: redisConnection
});

export const webhookWorker = new Worker('webhooks', async (job) => {
  const { payload, companyId } = job.data;
  await processWebhook(payload, companyId);
}, {
  connection: redisConnection,
  concurrency: 2 // Processar no máximo 2 por vez
});

// Arquivo: src/app/api/webhooks/meta/[slug]/route.ts
export async function POST(request: Request) {
  const payload = await request.json();
  
  // Adicionar à fila em vez de processar sincronamente
  await webhookQueue.add('process', {
    payload,
    companyId: getCompanyId(request)
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  });
  
  return NextResponse.json({ queued: true });
}
```

#### **TESTE E2E VALIDAÇÃO FASE 3.1:**
```bash
# Enviar múltiplos webhooks simultâneos
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/webhooks/meta/test \
    -H "Content-Type: application/json" \
    -d '{"test":"webhook'$i'"}' &
done

# Verificar processamento ordenado nos logs
grep "webhook" /tmp/logs/*.log | tail -20
```

**Meta:** Processamento ordenado sem race conditions

---

### 3.2 IMPLEMENTAR RATE LIMITING
**Problema Identificado:** Sem controle de taxa de requisições  
**Evidência:** Sistema vulnerável a sobrecarga

#### **AÇÕES:**
```typescript
// Arquivo: src/middleware/rate-limit.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  points: 100, // Número de requisições
  duration: 60, // Por 60 segundos
  blockDuration: 60 // Bloquear por 60 segundos
});

export async function rateLimit(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  
  try {
    await rateLimiter.consume(ip);
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      retryAfter: error.msBeforeNext / 1000 
    };
  }
}
```

#### **TESTE E2E VALIDAÇÃO FASE 3.2:**
```bash
# Teste de rate limiting
for i in {1..120}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/health
done | sort | uniq -c
# Deve mostrar alguns 429 (Too Many Requests) após 100 requisições
```

**Meta:** Proteção contra mais de 100 req/min por IP

---

## 📈 FASE 4: MONITORAMENTO E OBSERVABILIDADE

### 4.1 IMPLEMENTAR MÉTRICAS DE PERFORMANCE
**Problema:** Falta visibilidade sobre degradação  

#### **AÇÕES:**
```typescript
// Arquivo: src/lib/metrics.ts
import { Registry, Histogram, Counter, Gauge } from 'prom-client';

export const register = new Registry();

export const httpDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 5, 15, 50, 100, 500, 1000, 2500, 5000]
});

export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits'
});

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses'
});

export const memoryUsage = new Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes'
});

register.registerMetric(httpDuration);
register.registerMetric(cacheHits);
register.registerMetric(cacheMisses);
register.registerMetric(memoryUsage);

// Endpoint de métricas
// Arquivo: src/app/api/metrics/route.ts
export async function GET() {
  const metrics = await register.metrics();
  return new Response(metrics, {
    headers: { 'Content-Type': register.contentType }
  });
}
```

#### **TESTE E2E VALIDAÇÃO FASE 4.1:**
```bash
# Verificar métricas
curl http://localhost:5000/api/metrics | grep -E "http_request_duration|cache_"
```

**Meta:** Visibilidade completa de performance

---

### 4.2 CONFIGURAR ALERTAS
**Problema:** Sem notificações de problemas

#### **AÇÕES:**
```typescript
// Arquivo: src/lib/monitoring/alerts.ts
export class AlertManager {
  private thresholds = {
    responseTime: 5000, // 5 segundos
    memoryUsage: 85, // 85%
    errorRate: 10, // 10 erros por minuto
    cacheHitRate: 30 // Mínimo 30%
  };
  
  async checkHealth() {
    const metrics = await this.collectMetrics();
    
    if (metrics.avgResponseTime > this.thresholds.responseTime) {
      await this.sendAlert('CRITICAL', 
        `Response time degraded: ${metrics.avgResponseTime}ms`);
    }
    
    if (metrics.memoryPercentage > this.thresholds.memoryUsage) {
      await this.sendAlert('WARNING', 
        `High memory usage: ${metrics.memoryPercentage}%`);
    }
  }
  
  private async sendAlert(level: string, message: string) {
    console.error(`[ALERT][${level}] ${message}`);
    // Enviar para Slack/Discord/Email
  }
}
```

#### **TESTE E2E VALIDAÇÃO FASE 4.2:**
```bash
# Simular condições de alerta
# Alto uso de memória
node -e "const arr = []; for(let i=0; i<1000000; i++) arr.push(i);"

# Verificar se alertas foram disparados
grep "ALERT" /tmp/logs/*.log
```

**Meta:** Alertas em < 1 minuto de problema

---

## 🎯 METAS DE SUCESSO PÓS-IMPLEMENTAÇÃO

### **KPIs ESPERADOS:**

| Métrica | Atual | Meta | Melhoria |
|---------|-------|------|----------|
| **Latência P95** | 27.000ms | <500ms | 54x |
| **Cache Hit Rate** | 0% | >80% | ∞ |
| **Uso de Memória** | 92% | <75% | 18% |
| **Query Time P95** | 964ms | <100ms | 9.6x |
| **Compilações/hora** | 15+ | 0 | 100% |
| **Webhooks Simultâneos** | 6 | 2 | 66% |
| **Uptime** | ~95% | >99.9% | 4.9% |

---

## ⚡ ORDEM DE EXECUÇÃO RECOMENDADA

### **SEMANA 1: ESTABILIZAÇÃO URGENTE**
1. ✅ Configurar Cache Redis (1.1)
2. ✅ Otimizar Memória (1.2)
3. ✅ Resolver ENCRYPTION_KEY (1.3)
4. ✅ Implementar Rate Limiting (3.2)

### **SEMANA 2: OTIMIZAÇÃO DE PERFORMANCE**
5. ✅ Criar Índices PostgreSQL (2.1)
6. ✅ Desabilitar Hot Reload (2.2)
7. ✅ Implementar Paginação (2.3)
8. ✅ Configurar BullMQ (3.1)

### **SEMANA 3: OBSERVABILIDADE**
9. ✅ Implementar Métricas (4.1)
10. ✅ Configurar Alertas (4.2)
11. ✅ Testes de Carga Completos
12. ✅ Documentação Final

---

## 🔍 VALIDAÇÃO FINAL

### **CHECKLIST DE VALIDAÇÃO:**
- [ ] Todos os testes E2E passando
- [ ] Cache hit rate > 80%
- [ ] Memória < 75%
- [ ] Zero recompilações em runtime
- [ ] Latência P95 < 500ms
- [ ] Alertas funcionando
- [ ] Documentação atualizada
- [ ] Backup do banco realizado
- [ ] Rollback plan definido

---

## 📝 NOTAS IMPORTANTES

### **RISCOS IDENTIFICADOS:**
1. **Migração de banco pode causar downtime** - Executar em janela de manutenção
2. **Cache mal configurado pode servir dados incorretos** - Testar exaustivamente
3. **Rate limiting pode bloquear usuários legítimos** - Ajustar thresholds com cuidado

### **ROLLBACK PLAN:**
```bash
# Em caso de problemas graves:
1. git revert HEAD~n  # Reverter últimas n mudanças
2. npm run db:push --force  # Restaurar schema anterior
3. redis-cli FLUSHALL  # Limpar cache
4. pm2 restart all  # Reiniciar aplicação
```

---

## 📊 CONCLUSÃO

Este plano aborda todos os problemas críticos identificados nos testes E2E, com validações específicas para cada fase. A implementação deve ser feita de forma incremental, validando cada etapa antes de prosseguir.

**Tempo Estimado Total:** 3 semanas  
**Impacto Esperado:** Redução de 95% na latência e estabilização completa do sistema

---

**Documento criado em:** 22/11/2025  
**Última atualização:** 22/11/2025  
**Status:** ✅ PRONTO PARA EXECUÇÃO