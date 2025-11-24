# Master IA Oficial

## Overview
Master IA Oficial is a comprehensive WhatsApp and SMS mass messaging control panel with AI automation capabilities. It provides a centralized platform for managing multi-channel campaigns, customer service conversations, contact management (CRM), and AI-driven chatbots using Meta's WhatsApp Business API and Baileys. The project aims to be an all-in-one solution for automated, intelligent communication, offering an intuitive dashboard for businesses, including an AI-powered lead progression system and a Kanban lead management system.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Technology Stack
- **Frontend**: Next.js 14 (App Router), React, ShadCN UI, Tailwind CSS, TypeScript, Socket.IO.
- **Backend**: Node.js 18+ (Express custom server), Next.js API Routes (REST), Socket.IO 4.8.1, Drizzle ORM (PostgreSQL), JWT authentication.
- **Database**: PostgreSQL (Neon hosted) for primary data, separate PostgreSQL with `pgvector` for AI embeddings.
- **WhatsApp Integration**: Meta Cloud API and Baileys library.
- **Cache/Queue**: Redis (Upstash) for real-time caching and BullMQ message queue, with fallback to in-memory cache.

### Production Deployment Fixes (Nov 24, 2025)
**Status**: ✅ COMPLETE - All 4 critical issues fixed (100%)

| Issue | Before | After | Impact | Status |
|-------|--------|-------|--------|--------|
| **Heap Memory** | 92.35% (39.57/42.85MB) | 4144MB (4GB limit) | Removed memory exhaustion crashes | ✅ COMPLETE |
| **Database Pool** | 94.46% usage (max:20) | max:100 connections | 5x capacity for concurrent requests | ✅ COMPLETE |
| **Port Config** | 8080 | 5000 (frontend standard) | Proper Replit deployment | ✅ COMPLETE |
| **Redis Upstash** | DNS ENOTFOUND (deleted DB) | ✅ Connected (vital-sawfish-40850) | Distributed cache operational | ✅ COMPLETE |
| **Node.js GC** | Manual only | Exposed + automatic every 30s | Proactive memory cleanup | ✅ COMPLETE |

**Changes Made:**
1. ✅ `package.json`: Added `--max-old-space-size=4096 --expose-gc` to `start:prod`, port 5000
2. ✅ `server.js`: Port 5000 binding, Redis eager loading, port guard
3. ✅ `src/lib/db/index.ts`: Increased pool max from 20 → 100 connections
4. ✅ `src/lib/redis.ts`: Added Upstash detection with new endpoint (vital-sawfish-40850)
5. ✅ `src/lib/redis-connection.ts`: HybridRedisClient successfully connected to Upstash

**Final Evidence (Production Logs):**
```
✅ Server LISTENING on http://0.0.0.0:5000
🧠 Node.js Heap Limit: 4144.00 MB
✅ Redis connected successfully - Using distributed Redis cache
✅ Cadence Scheduler ready
✅ Campaign Processor ready
```

**All systems operational - Ready for production deployment! 🚀**

### BullMQ Webhook Queue System (Nov 24, 2025)
**Status**: ✅ OPERATIONAL - Connection reuse bug fixed

**Issue Fixed:**
- `webhook-queue.service.ts` was creating multiple Redis connections via `createRedisConnection()`
- Each BullMQ Queue/Worker instance was creating duplicate connections
- Root cause: REDIS_URL secret pointing to deleted Upstash database (causal-dane-7720)

**Solution:**
1. ✅ Updated REDIS_URL secret to new Upstash endpoint (vital-sawfish-40850)
2. ✅ Refactored `webhook-queue.service.ts` to reuse single Redis connection
3. ✅ All BullMQ tests passing (queue status, metrics, pause/resume, retry)

**Evidence (Test Output):**
```bash
✅ All webhook queue tests completed successfully!
✓ BullMQ queue initialization
✓ Queue metrics and monitoring
✓ Webhook dispatch mechanism
✓ Queue pause/resume functionality
✓ Dead letter queue retry capability
```

### Deployment Configuration (Nov 24, 2025)
**Status**: ✅ READY TO PUBLISH

**Deployment Type**: VM (Persistent)
- **Why VM?** Socket.IO WebSocket connections, BullMQ background workers, Baileys sessions
- **Build Command**: `npm run build`
- **Run Command**: `npm run start:prod`
- **Health Check**: `/health` endpoint
- **Port**: 5000 (bound to 0.0.0.0)

**Documentation**: See `DEPLOY_READINESS_CHECKLIST.md` for complete pre-deployment validation.

### Core Architectural Decisions
- **Dual WhatsApp Connection Strategy**: Supports both Meta API and local Baileys (QR code) connections with a hybrid messaging system.
- **Real-time Communication**: Socket.IO for instant updates.
- **AI Personas and Automation Engine**: Persona-based design with OpenAI provider and RAG capabilities via a vector database. Includes AI-powered automatic lead progression and humanized AI response delays.
- **Campaign Management**: Custom queue system with rate limiting, retry logic, dedicated Baileys mass campaign system, and automated cadence (drip campaign) system. Includes full pause/resume functionality for campaigns.
- **Encryption**: AES-256-GCM for sensitive data at rest.
- **Multi-tenant Architecture**: Company-based tenant model ensuring data isolation.
- **Webhook System**: Meta Webhooks with signature verification and a production-ready custom webhooks integration with HMAC SHA256 and exponential retry logic.
- **Kanban Lead Management System**: Interactive Kanban board with full CRUD operations, drag-and-drop functionality, and automatic appointment notifications when leads move to scheduling stages.
- **Automatic Appointment Notifications (Nov 24, 2025)**: When a lead is moved to a Kanban stage with `semanticType='meeting_scheduled'`, the system automatically creates in-app notifications for all company users and dispatches a `meeting_scheduled` webhook event with lead details. Uses separated database enums: `notification_type` for scheduled reports and `user_notification_type` for in-app notifications including the new `new_appointment` type.
- **Analytics Dashboard System**: Comprehensive real-time analytics with KPI metrics, time-series charts, funnel visualization, and voice call analytics.
- **Template Management System**: Full CRUD interface for message templates with dynamic variable support.
- **UI/UX Component Library**: Reusable ShadCN-based components, including skeleton loaders, empty states, server-side pagination, debounced search inputs, and a centralized toast notification helper.
- **Progressive Web App (PWA)**: Mobile-first PWA implementation with offline support, app manifest, and standalone display mode.
- **Performance Optimizations**: Caching, dynamic imports, Redis cache optimization, 245 PostgreSQL indexes, BullMQ for queuing, rate limiting middleware, and Prometheus metrics with alerting.
- **OAuth Authentication System**: Production-ready OAuth 2.0 with Google and Facebook via NextAuth.js, supporting account linking and multi-tenant compatibility.
- **Atomic Lua Script Rate Limiting**: Atomic rate limiting implementation using Lua scripts in Redis/EnhancedCache.
- **Proactive Token Monitoring**: Meta access token expiration monitoring.
- **Memory Leak Prevention**: Global listener registration flag.

## External Dependencies
### Third-Party APIs
- **Meta/WhatsApp Business Platform**: Graph API for WhatsApp Cloud API.
- **Baileys WhatsApp Library**: `@whiskeysockets/baileys`.

### AI/ML Services
- **OpenAI**: GPT-3.5-turbo, GPT-4, GPT-4o via `@ai-sdk/openai`.
- **Vector Database**: PostgreSQL with `pgvector` extension.

### Cloud Services
- **AWS Services**: S3 (media storage), CloudFront (CDN).
- **Google Cloud Storage**: Alternative file storage.

### Infrastructure
- **PostgreSQL**: Neon (hosted database).
- **Firebase**: (Optional) App Hosting and Secret Manager.
- **Replit**: Development environment, Object Storage.