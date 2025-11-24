# 🔧 PLANO DE AÇÃO: FIXES CRÍTICOS BASEADO EM ANÁLISE VERDADEIRA
**Data**: 2025-11-24 06:55  
**Base**: Análise com evidências reais dos logs  
**Prioridade**: CRÍTICA

---

## 📋 PROBLEMAS IDENTIFICADOS (Com Evidências)

### 🔴 CRÍTICO #1: EADDRINUSE Error (Root Cause Comprovado)
```
Evidência: Error: listen EADDRINUSE: address already in use 0.0.0.0:8080
Causa: Guard não consegue matar processo anterior (lsof não disponível)
Resultado: Server crash, deployment falha
Solução: Adicionar retry logic + error handling
```

### 🔴 CRÍTICO #2: Inicialização Assíncrona Errada
```
Evidência: Socket.IO initialized ANTES de "Preparing Next.js"
Problema: HTTP server aceita requisições ANTES do Next.js estar pronto
Resultado: Health check passa mas rotas falham
Solução: Aguardar app.prepare() ANTES de iniciar HTTP server
```

### 🔴 CRÍTICO #3: Sem Error Handling
```
Evidência: node:events:502 throw er; // Unhandled 'error' event
Problema: Nenhum uncaughtException, SIGTERM, unhandledRejection
Resultado: Processo morre abrupto sem cleanup
Solução: Adicionar error handlers + graceful shutdown
```

### 🟡 IMPORTANTE #4: Redis Ausente em Produção
```
Evidência: [ioredis] ECONNREFUSED 127.0.0.1:6379 (não nos logs atuais mas esperado)
Problema: Fallback para in-memory não é production-safe
Solução: Configurar Redis_URL no deployment ou usar cache alternativo
```

### 🟡 IMPORTANTE #5: DB Pool Monitoring Passivo
```
Evidência: Pool fica saturado sem alertas (91.38% no deploy anterior)
Problema: app.prepare() deixa conexões abertas
Solução: Monitorar proativamente + fechar conexões após app.prepare()
```

---

## ✅ SOLUÇÕES A IMPLEMENTAR

### SOLUÇÃO #1: Aguardar app.prepare() Antes de HTTP (CRÍTICO)

**Código Atual** (ERRADO):
```javascript
// server.js linhas 120-280
server.listen(port, '0.0.0.0', () => {
  console.log('✅ Server LISTENING...');
});

const io = new SocketIOServer(server);
console.log('✅ Socket.IO initialized');

app.prepare()  // ← Não aguarda!
  .then(() => console.log('✅ Next.js ready!'));
```

**Código Corrigido**:
```javascript
// Reorganizar: Aguardar preparação ANTES de iniciar HTTP

(async () => {
  try {
    // PASSO 1: Preparar Next.js PRIMEIRO
    console.log('🔄 Preparing Next.js...');
    await app.prepare();
    console.log('✅ Next.js ready!');

    // PASSO 2: Depois iniciar HTTP server
    server.listen(port, '0.0.0.0', () => {
      console.log('✅ Server LISTENING on http://0.0.0.0:' + port);
    });

    // PASSO 3: Socket.IO após HTTP pronto
    const io = new SocketIOServer(server);
    console.log('✅ Socket.IO initialized');

    // PASSO 4: Schedulers/Processors depois
    // ... Baileys, Cadence, Campaign
  } catch (error) {
    console.error('❌ Fatal error during initialization:', error);
    process.exit(1);
  }
})();
```

---

### SOLUÇÃO #2: Tratar EADDRINUSE com Retry (CRÍTICO)

**Código Adicionar**:
```javascript
const startServer = (retryCount = 0) => {
  const maxRetries = 3;
  
  server.listen(port, '0.0.0.0', () => {
    console.log('✅ Server LISTENING on http://0.0.0.0:' + port);
    // ... resto do código
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use`);
      
      if (retryCount < maxRetries) {
        const delay = 1000 * (retryCount + 1); // 1s, 2s, 3s
        console.log(`⏳ Retry #${retryCount + 1}/${maxRetries} in ${delay}ms...`);
        
        setTimeout(() => {
          server.close();
          startServer(retryCount + 1);
        }, delay);
      } else {
        console.error(`🔴 Failed to start server after ${maxRetries} retries`);
        process.exit(1);
      }
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });
};

startServer();
```

---

### SOLUÇÃO #3: Graceful Shutdown Handlers (CRÍTICO)

**Código Adicionar**:
```javascript
const gracefulShutdown = (signal) => {
  console.log(`⏳ ${signal} received, shutting down gracefully...`);
  
  server.close(async () => {
    console.log('✅ Server closed');
    
    // Fechar conexões críticas
    try {
      // Se tiver conexão DB:
      // await db.disconnect();
      
      // Se tiver Redis:
      // await redis.quit();
      
      console.log('✅ All connections closed');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
    
    process.exit(0);
  });

  // Force shutdown depois de 10 segundos
  setTimeout(() => {
    console.error('🔴 Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🔴 Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔴 Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});
```

---

### SOLUÇÃO #4: Configurar Redis Properly (IMPORTANTE)

**Código em Redis Config** (src/lib/redis-client.ts ou similar):
```typescript
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
console.log('🔴 REDIS_URL:', process.env.REDIS_URL ? '✅ Set' : '❌ Using default 127.0.0.1:6379');

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: false,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => {
  console.warn(`⚠️ Redis error: ${err.message}`);
  console.log('ℹ️ Falling back to in-memory cache');
});

redis.on('close', () => console.log('ℹ️ Redis disconnected'));

export default redis;
```

---

### SOLUÇÃO #5: Pool Monitoring + Cleanup (IMPORTANTE)

**Código Adicionar após app.prepare()**:
```javascript
// Monitorar pool e limpar conexões
const monitorPoolHealth = () => {
  setInterval(async () => {
    try {
      // Check if pool has stale connections
      const poolStats = await getPoolStats(); // Implement based on your DB client
      const usage = poolStats.current / poolStats.max * 100;
      
      if (usage > 80) {
        console.warn(`⚠️ DB Pool usage: ${usage.toFixed(2)}%`);
      }
      
      if (usage > 95) {
        console.error(`🔴 DB Pool CRITICAL: ${usage.toFixed(2)}%`);
        // TODO: Implement pool recycling or reject new queries
      }
    } catch (error) {
      // Silently ignore monitoring errors
    }
  }, 30000); // Check every 30 seconds
};

// Chamar após Next.js pronto
if (process.env.NODE_ENV === 'production') {
  monitorPoolHealth();
}
```

---

## 📊 IMPLEMENTAÇÃO ROADMAP

### FASE 1: Reordenar Inicialização (15 min)
- [ ] Mover `app.prepare()` para ANTES de `server.listen()`
- [ ] Aguardar `app.prepare()` com `await`
- [ ] Testar que Socket.IO inicia DEPOIS de Next.js pronto

### FASE 2: Adicionar Error Handling (15 min)
- [ ] Adicionar `server.on('error', ...)` com retry logic
- [ ] Adicionar `process.on('uncaughtException', ...)`
- [ ] Adicionar `process.on('unhandledRejection', ...)`
- [ ] Adicionar `process.on('SIGTERM', ...)` graceful shutdown

### FASE 3: Validar Redis (10 min)
- [ ] Verificar REDIS_URL em produção
- [ ] Adicionar better error logging
- [ ] Testar fallback

### FASE 4: Monitorar Pool (10 min)
- [ ] Adicionar monitoring loop
- [ ] Implementar pool cleanup se necessário

### FASE 5: Testar (15 min)
- [ ] 5x health checks local
- [ ] Deploy em produção
- [ ] Monitorar 5+ minutos

**Tempo Total**: ~65 minutos (incluindo testes e deploy)

---

## 🚀 IMPACTO ESPERADO

### Antes (Atual - FALHA)
```
Deploy → EADDRINUSE → Retry falha → Processo ghost
→ Health check timeout 5 min → Deployment FALHA
```

### Depois (Com Fixes - SUCESSO)
```
Deploy → Guard falha? Sem problema
→ Server.on('error') detecta EADDRINUSE
→ Retry em 1s automático → Sucesso
→ Health checks passam
→ Deployment OK
```

---

## ✅ CRITÉRIOS DE SUCESSO

1. ✅ Deploy não falha com EADDRINUSE
2. ✅ Nenhum "unhandled error" nos logs
3. ✅ Socket.IO inicializa DEPOIS de Next.js
4. ✅ Health checks passam em < 2 minutos
5. ✅ Graceful shutdown em SIGTERM
6. ✅ Nenhum processo "ghost" deixado

---

## 🎯 PRÓXIMO PASSO

Você quer que eu implemente TODAS ESSAS SOLUÇÕES AGORA?

**Será feito em server.js**:
- Reordenar inicialização (async/await)
- Adicionar error handlers
- Adicionar graceful shutdown
- Adicionar pool monitoring

**Tempo estimado**: ~15 minutos implementação + 10 minutos testes

**Confirmação**: Pronto para começar?
