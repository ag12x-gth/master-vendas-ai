# 🚨 AÇÕES IMEDIATAS DE ESTABILIZAÇÃO - SISTEMA CRÍTICO
**Data:** 22/11/2025  
**Severity:** 🔴 CRÍTICO - Sistema em Estado Degradado  
**Architect Review:** FAIL - Gaps críticos de confiabilidade não resolvidos

---

## 🎯 TOP 3 AÇÕES URGENTES (EXECUTAR AGORA)

### 1️⃣ **ESTABILIZAR RECURSOS DE RUNTIME** (0-4 horas)

#### A. FIX SESSION HANDLING PARA NOTIFICATIONS
```typescript
// PROBLEMA: API retornando 500 - "Não autorizado: ID do utilizador não pôde ser obtido da sessão"
// ARQUIVO: src/app/api/v1/notifications/route.ts

// SOLUÇÃO IMEDIATA:
export async function GET(request: Request) {
  try {
    // Adicionar fallback para desenvolvimento/testes
    const userId = await getUserIdFromSession(request).catch(() => {
      // Em desenvolvimento, usar ID padrão se não houver sessão
      if (process.env.NODE_ENV === 'development') {
        return process.env.DEFAULT_USER_ID || null;
      }
      throw new Error('Unauthorized');
    });
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Continuar processamento...
  } catch (error) {
    console.error('[Notifications] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
```

#### B. REDUZIR PRESSÃO DE MEMÓRIA (91-92%)
```bash
# AÇÃO IMEDIATA 1: Aumentar limite de memória
# Arquivo: package.json
{
  "scripts": {
    "dev:server": "NODE_OPTIONS='--max-old-space-size=2048 --expose-gc' tsx watch server.js"
  }
}

# AÇÃO IMEDIATA 2: Forçar garbage collection
# Arquivo: server.js
if (global.gc) {
  console.log('🧹 Garbage collection enabled');
  setInterval(() => {
    const before = process.memoryUsage().heapUsed / 1024 / 1024;
    global.gc();
    const after = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`🧹 GC: Freed ${(before - after).toFixed(2)}MB`);
  }, 30000); // A cada 30 segundos
}

# AÇÃO IMEDIATA 3: Limpar módulos não utilizados
npm prune --production
```

#### C. GARANTIR PERSISTÊNCIA DO CACHE COM INSTRUMENTAÇÃO
```typescript
// ARQUIVO: src/lib/cache.ts
import Redis from 'ioredis';

class EnhancedCache {
  private redis: Redis;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });
    
    // Log connection status
    this.redis.on('connect', () => console.log('✅ Redis connected'));
    this.redis.on('error', (err) => console.error('❌ Redis error:', err));
    
    // Report stats every minute
    setInterval(() => this.reportStats(), 60000);
  }
  
  async get(key: string): Promise<any> {
    try {
      const data = await this.redis.get(key);
      if (data) {
        this.stats.hits++;
        console.log(`📊 Cache HIT: ${key}`);
        return JSON.parse(data);
      }
      this.stats.misses++;
      console.log(`📊 Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error(`❌ Cache GET error for ${key}:`, error);
      return null;
    }
  }
  
  async set(key: string, value: any, ttl = 300): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      this.stats.sets++;
      console.log(`📊 Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error(`❌ Cache SET error for ${key}:`, error);
    }
  }
  
  private reportStats() {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) * 100 || 0;
    console.log(`📊 Cache Stats - Hit Rate: ${hitRate.toFixed(2)}%, Hits: ${this.stats.hits}, Misses: ${this.stats.misses}, Sets: ${this.stats.sets}`);
  }
}

export const cache = new EnhancedCache();
```

---

### 2️⃣ **IMPLEMENTAR BUFFERING DURÁVEL PARA WEBHOOKS** (4-8 horas)

#### INSTALAÇÃO E CONFIGURAÇÃO
```bash
# Instalar dependências
npm install bullmq ioredis
```

#### IMPLEMENTAÇÃO DO QUEUE SYSTEM
```typescript
// ARQUIVO: src/lib/queues/webhook-queue.ts
import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null
});

// Criar fila
export const webhookQueue = new Queue('meta-webhooks', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,
    removeOnFail: 500
  }
});

// Criar worker
const webhookWorker = new Worker('meta-webhooks', 
  async (job) => {
    const { payload, companyId, slug } = job.data;
    console.log(`⚡ Processing webhook ${job.id} for company ${companyId}`);
    
    try {
      // Processar webhook aqui
      await processWebhookPayload(payload, companyId);
      console.log(`✅ Webhook ${job.id} processed successfully`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Webhook ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2, // Processar no máximo 2 webhooks simultaneamente
    limiter: {
      max: 10,
      duration: 1000 // Máximo 10 webhooks por segundo
    }
  }
);

// Monitor events
const queueEvents = new QueueEvents('meta-webhooks', { connection });

queueEvents.on('completed', ({ jobId }) => {
  console.log(`✅ Job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`❌ Job ${jobId} failed: ${failedReason}`);
});

// Health check
export async function getQueueHealth() {
  const waiting = await webhookQueue.getWaitingCount();
  const active = await webhookQueue.getActiveCount();
  const completed = await webhookQueue.getCompletedCount();
  const failed = await webhookQueue.getFailedCount();
  
  return {
    waiting,
    active,
    completed,
    failed,
    healthy: waiting < 1000 && failed < 100
  };
}
```

#### MODIFICAR WEBHOOK HANDLER
```typescript
// ARQUIVO: src/app/api/webhooks/meta/[slug]/route.ts
import { webhookQueue } from '@/lib/queues/webhook-queue';

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const startTime = Date.now();
  
  try {
    // Validação básica
    const signature = request.headers.get('x-hub-signature-256');
    const body = await request.text();
    
    // Adicionar à fila em vez de processar sincronamente
    const job = await webhookQueue.add('process-webhook', {
      payload: JSON.parse(body),
      companyId: params.slug,
      signature,
      timestamp: new Date().toISOString()
    }, {
      priority: 1,
      delay: 0
    });
    
    console.log(`📥 Webhook queued: ${job.id} in ${Date.now() - startTime}ms`);
    
    // Retornar imediatamente (importante para o Meta)
    return new Response('OK', { status: 200 });
    
  } catch (error) {
    console.error('❌ Webhook queue error:', error);
    return new Response('Server Error', { status: 500 });
  }
}
```

---

### 3️⃣ **VALIDAR PADRÕES DE ACESSO AO BANCO** (2-4 horas)

#### A. FORÇAR PAGINAÇÃO EM TODAS AS QUERIES
```typescript
// ARQUIVO: src/app/api/v1/conversations/route.ts
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Forçar paginação
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const requestedLimit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT));
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const offset = (page - 1) * limit;
    
    console.log(`📄 Fetching conversations: page ${page}, limit ${limit}`);
    
    // Query com paginação obrigatória
    const conversations = await db
      .select()
      .from(conversationsTable)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(conversationsTable.updatedAt));
    
    // Contar total apenas se necessário
    const total = page === 1 ? await db.select({ count: count() }).from(conversationsTable) : null;
    
    return NextResponse.json({
      data: conversations,
      pagination: {
        page,
        limit,
        hasMore: conversations.length === limit,
        total: total?.[0]?.count
      }
    });
  } catch (error) {
    console.error('❌ Conversations fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### B. CRIAR ÍNDICES CRÍTICOS IMEDIATAMENTE
```sql
-- ARQUIVO: scripts/create-critical-indexes.sql
-- Executar AGORA no banco de produção

-- Índice para conversations status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_company_status_updated 
ON conversations(company_id, status, updated_at DESC) 
WHERE deleted_at IS NULL;

-- Índice para notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read_created 
ON notifications(user_id, is_read, created_at DESC);

-- Índice para messages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);

-- Índice para contacts search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_company_phone 
ON contacts(company_id, phone_number)
WHERE deleted_at IS NULL;

-- Verificar índices criados
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

#### C. IMPLEMENTAR QUERY MONITORING
```typescript
// ARQUIVO: src/lib/db/monitoring.ts
import { db } from './index';

export async function monitorQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    
    // Log slow queries
    if (duration > 100) {
      console.warn(`⚠️ SLOW QUERY [${queryName}]: ${duration}ms`);
    } else {
      console.log(`⚡ Query [${queryName}]: ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ QUERY ERROR [${queryName}]:`, error);
    throw error;
  }
}

// Uso:
const conversations = await monitorQuery(
  'getConversations',
  () => db.select().from(conversationsTable).limit(20)
);
```

---

## 🚦 VALIDAÇÃO RÁPIDA (Executar após cada ação)

### TESTES DE VALIDAÇÃO
```bash
# 1. Verificar memória
curl http://localhost:5000/api/health | jq '.memory'
# Meta: percentage < 75

# 2. Verificar cache
grep "Cache HIT\|Cache MISS" /tmp/logs/*.log | tail -20
# Meta: Ver mais HITs que MISSes

# 3. Verificar webhooks queue
curl http://localhost:5000/api/admin/queue-health
# Meta: waiting < 100, failed < 10

# 4. Verificar latência
time curl http://localhost:5000/api/v1/conversations/status
# Meta: < 500ms

# 5. Verificar logs de erro
grep "ERROR\|CRITICAL" /tmp/logs/*.log | tail -10
# Meta: Nenhum erro novo
```

---

## ⏰ CRONOGRAMA DE EXECUÇÃO

| Hora | Ação | Responsável | Status |
|------|------|-------------|--------|
| **H+0** | Fix Session Handling | Backend Dev | 🔄 |
| **H+1** | Aumentar Memória + GC | DevOps | 🔄 |
| **H+2** | Implementar Cache Instrumentado | Backend Dev | 🔄 |
| **H+4** | Deploy Queue System | Backend Dev | 🔄 |
| **H+6** | Criar Índices DB | DBA/Backend | 🔄 |
| **H+8** | Validação Completa | QA Team | 🔄 |

---

## 🚨 PLANO DE ROLLBACK

Se qualquer métrica piorar após mudanças:

```bash
# 1. Reverter código
git revert HEAD

# 2. Limpar cache
redis-cli FLUSHALL

# 3. Reiniciar aplicação
pm2 restart all

# 4. Verificar logs
tail -f /tmp/logs/*.log

# 5. Notificar equipe
# Enviar alerta no Slack/Discord
```

---

## 📞 CONTATOS DE EMERGÊNCIA

- **Backend Lead:** [contato]
- **DevOps:** [contato]  
- **DBA:** [contato]
- **On-call:** [contato]

---

**IMPORTANTE:** Este documento contém ações IMEDIATAS para estabilização. O sistema está em estado CRÍTICO e requer ação AGORA.

**Última Atualização:** 22/11/2025  
**Próxima Revisão:** A cada 2 horas até estabilização completa