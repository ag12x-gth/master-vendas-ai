# 📘 Deployment Runbook - Redis Upstash Configuration

**Last Updated:** 24 de Novembro de 2025  
**Status:** ✅ Production Ready  
**Redis Provider:** Upstash (vital-sawfish-40850)

---

## 🔐 Upstash Redis Credentials

### Current Production Database
| Field | Value |
|-------|-------|
| **Database Name** | master-replit |
| **Endpoint** | `vital-sawfish-40850.upstash.io` |
| **Port** | `6379` |
| **Protocol** | `rediss://` (TLS enabled) |
| **Region** | AWS São Paulo, Brazil (sa-east-1) |
| **Tier** | Free |
| **Created** | 24 Nov 2025 |

### Environment Variables (Production)
```bash
# REST API (for Upstash SDK)
UPSTASH_REDIS_REST_URL="https://vital-sawfish-40850.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AZ-SAAIncDI0OTQyYWYzODkxMzQ0YTc4YWViYzc4ZDkxMWIyOWE4MnAyNDA4NTA"

# Redis Protocol (auto-generated from above by system)
# System converts REST URL to: rediss://default:${UPSTASH_REDIS_REST_TOKEN}@vital-sawfish-40850.upstash.io:6379

# BullMQ Queue (optional, enables webhook queue with Redis)
ENABLE_BULLMQ_QUEUE="true"
```

⚠️ **Security Note:** Token is masked in logs with `***` to prevent exposure.

---

## 🔄 Previous Database (Deleted)

| Field | Value | Status |
|-------|-------|--------|
| **Endpoint** | `causal-dane-7720.upstash.io` | ❌ DELETED |
| **Issue** | DNS ENOTFOUND errors | ❌ |
| **Replaced** | 24 Nov 2025 | ✅ |

**Migration:** No data migration needed - was deleted/inactive.

---

## 🏗️ System Architecture

### Redis Connection Strategy

The system uses a **hybrid connection strategy** with automatic fallback:

```
Priority Order:
1. Upstash Redis (UPSTASH_REDIS_REST_URL + TOKEN)
2. Standard Redis (REDIS_URL)
3. Localhost (REDIS_HOST:REDIS_PORT) - dev only
4. In-Memory Cache (fallback when Redis unavailable)
```

### Files Using Redis

| File | Purpose | Connection Type |
|------|---------|-----------------|
| `src/lib/redis.ts` | Main cache (HybridRedisClient) | Upstash REST → Redis Protocol |
| `src/lib/redis-connection.ts` | BullMQ connections | Redis Protocol (TLS) |
| `src/services/webhook-queue.service.ts` | Webhook queue (BullMQ) | Via redis-connection.ts |
| `server.js` | Eager loading (production) | Triggers redis.ts initialization |

---

## 🧪 Testing & Verification

### 1. Test Redis Connection

**Manual Test (CLI):**
```bash
redis-cli --tls -u redis://default:TOKEN@vital-sawfish-40850.upstash.io:6379 ping
```
**Expected:** `PONG`

**Application Test (Node.js):**
```bash
# Check startup logs for:
✅ Redis connected successfully - Using distributed Redis cache
📡 Redis endpoint: rediss://default:***@vital-sawfish-40850.upstash.io:6379
```

### 2. Test BullMQ Integration

**Run Test Script:**
```bash
npx tsx src/scripts/test-webhook-queue.ts
```

**Expected Output:**
```
✅ [WebhookQueue] BullMQ Worker started with concurrency: 10
✅ [WebhookQueue] BullMQ service initialized with Redis-backed queue
==================================================
✅ All webhook queue tests completed successfully!
==================================================
```

**Warning (Non-Critical):**
```
IMPORTANT! Eviction policy is optimistic-volatile. It should be "noeviction"
```
This is a BullMQ recommendation but not required for basic functionality.

### 3. Test Production Server

**Check Production Logs:**
```bash
# Look for these indicators in workflow logs:
✅ Server LISTENING on http://0.0.0.0:5000
🧠 Node.js Heap Limit: 4144.00 MB
✅ Redis connected successfully
✅ Cadence Scheduler ready
✅ Campaign Processor ready
```

---

## 🚨 Troubleshooting

### Issue: DNS ENOTFOUND

**Symptom:**
```
[ioredis] Unhandled error event: Error: getaddrinfo ENOTFOUND xxx.upstash.io
⚠️ Redis connection failed, falling back to in-memory cache
```

**Solutions:**
1. **Verify endpoint exists** - Check Upstash dashboard
2. **Verify credentials** - Ensure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
3. **Check database status** - Database may be deleted/inactive
4. **Restore or create new** - Follow steps in "Database Recovery" section

### Issue: ECONNREFUSED / EACCES

**Symptom:**
```
[ioredis] Error: connect ECONNREFUSED / 
[ioredis] Error: connect EACCES /
```

**Cause:** BullMQ trying to connect to localhost socket instead of Upstash.

**Solution:**
1. Verify `src/lib/redis-connection.ts` includes Upstash detection:
```typescript
if (upstashUrl && upstashToken) {
  const upstashHost = upstashUrl.replace('https://', '').replace(/\/$/, '').split(':')[0];
  connectionUrl = `rediss://default:${upstashToken}@${upstashHost}:6379`;
}
```

### Issue: In-Memory Fallback in Production

**Symptom:**
```
📋 [WebhookQueue] BullMQ disabled, using in-memory queue
⏸️ [WebhookQueue] In-memory queue does not support pausing
```

**Solutions:**
1. **Enable BullMQ:**
```bash
ENABLE_BULLMQ_QUEUE="true"
```
2. **Verify Redis connected** - Check logs for "✅ Redis connected successfully"
3. **Restart workflow** - Changes to env vars require restart

---

## 📊 Database Recovery

### Restore Deleted Database

1. Access Upstash Console: https://console.upstash.com/redis
2. Navigate to **Inactive** section
3. Find deleted database (e.g., "causal-dane")
4. Click **"Restore"** button
5. Wait for activation (~30 seconds)
6. Copy new connection details
7. Update environment variables

### Create New Database

1. Access Upstash Console: https://console.upstash.com/redis
2. Click **"+ Create Database"**
3. Configure:
   - **Name:** `master-replit` (or your choice)
   - **Type:** Regional
   - **Region:** AWS São Paulo (sa-east-1) - closest to Replit
   - **TLS:** Enabled (default)
   - **Eviction:** Recommended `noeviction` for BullMQ
4. Click **"Create"**
5. Copy credentials:
   - Go to **"Details"** tab
   - Copy **REST URL** → `UPSTASH_REDIS_REST_URL`
   - Copy **REST Token** → `UPSTASH_REDIS_REST_TOKEN`
6. Update environment variables in Replit
7. Restart production server

---

## 🔧 Maintenance

### Monitoring

**Key Metrics to Monitor:**
- Connection status: "✅ Redis connected successfully"
- Endpoint logged correctly: Shows `vital-sawfish-40850.upstash.io`
- No DNS errors in logs
- BullMQ initialized (if enabled)

**Health Check:**
```bash
# Application health endpoint
curl https://your-domain.replit.app/health

# Expected response includes:
{
  "status": "ok",
  "redis": "connected",
  ...
}
```

### Backup Strategy

**Upstash Backups:**
- Upstash Free tier: Daily automatic backups (last 1 day)
- Paid tier: Configurable backup retention

**Application Data:**
- Primary data: PostgreSQL (Neon) - separate backup strategy
- Redis: Cache only (ephemeral, can be regenerated)
- BullMQ jobs: Persisted in Redis, backed up with Upstash

### Rotation/Updates

**When to Update Credentials:**
1. Security breach suspected
2. Token accidentally exposed
3. Migrating to new database
4. Upgrading Upstash plan

**Update Process:**
1. Create new database OR regenerate token
2. Update environment variables (parallel deployment)
3. Test connection with new credentials
4. Deploy to production
5. Verify all services connected
6. Delete old database (after 24h grace period)

---

## 📈 Performance Tuning

### Current Configuration

**Connection Pool:**
```typescript
// src/lib/redis.ts (HybridRedisClient)
{
  maxRetriesPerRequest: 3,
  enableOfflineQueue: true,
  connectTimeout: 5000,
  retryStrategy: (times) => Math.min(times * 100, 1000)
}

// src/lib/redis-connection.ts (BullMQ)
{
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  retryStrategy: (times) => Math.min(times * 50, 2000)
}
```

**BullMQ Workers:**
- Concurrency: 10 workers
- Max Retries: 3 attempts
- Backoff: Exponential (2000ms base)

### Optimization Recommendations

**For High Load (>1000 jobs/min):**
1. Upgrade Upstash plan (more connections)
2. Increase worker concurrency (20+)
3. Enable Redis pipelining
4. Consider Redis Cluster for horizontal scaling

**For Low Latency (<100ms):**
1. Choose region closest to Replit deployment
2. Enable connection pooling
3. Use Redis pipeline for batch operations
4. Monitor network latency (Upstash dashboard)

---

## 🔗 Related Documentation

- **Upstash Console:** https://console.upstash.com/redis
- **Upstash Redis Docs:** https://upstash.com/docs/redis
- **BullMQ Documentation:** https://docs.bullmq.io/
- **Replit Deployment:** https://docs.replit.com/hosting/deployments

---

## ✅ Deployment Checklist

Before deploying to production:

- [ ] Upstash database created and active
- [ ] Environment variables set (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)
- [ ] BullMQ enabled if needed (`ENABLE_BULLMQ_QUEUE=true`)
- [ ] Connection tested manually (redis-cli)
- [ ] Application logs show "✅ Redis connected successfully"
- [ ] Endpoint logged shows correct hostname (vital-sawfish-40850)
- [ ] BullMQ test passed (if enabled)
- [ ] No DNS errors in startup logs
- [ ] Workflow restarted after env var changes
- [ ] Health check endpoint returns Redis connected
- [ ] Backup strategy documented

---

**Document Ownership:** DevOps / Platform Team  
**Review Cycle:** Monthly or after major changes  
**Emergency Contact:** Replit Support + Upstash Support
