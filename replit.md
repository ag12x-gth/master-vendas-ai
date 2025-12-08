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
- **Cache/Queue**: Redis (Upstash) for real-time caching and BullMQ message queue.

### Core Architectural Decisions
- **Dual WhatsApp Connection Strategy**: Supports both Meta API and local Baileys (QR code) connections.
- **Real-time Communication**: Socket.IO for instant updates.
- **AI Personas and Automation Engine**: Persona-based design with OpenAI provider, RAG via vector database, and AI-powered lead progression.
- **Campaign Management**: Custom queue system with rate limiting, retry logic, dedicated Baileys mass campaign system, and automated cadence (drip campaign) system with pause/resume functionality. Includes SMS duplication protection.
- **Encryption**: AES-256-GCM for sensitive data at rest.
- **Multi-tenant Architecture**: Company-based tenant model ensuring data isolation.
- **Webhook System**: Meta Webhooks with signature verification and custom webhooks with HMAC SHA256 and exponential retry.
- **Kanban Lead Management System**: Interactive Kanban board with CRUD, drag-and-drop, and automatic appointment notifications.
- **Analytics Dashboard System**: Real-time analytics with KPI metrics, time-series charts, funnel visualization, and voice call analytics.
- **Template Management System**: CRUD interface for message templates with dynamic variable support.
- **UI/UX Component Library**: Reusable ShadCN-based components, including skeleton loaders, empty states, server-side pagination, debounced search, and toast notifications.
- **Progressive Web App (PWA)**: Mobile-first PWA with offline support.
- **Performance Optimizations**: Caching, dynamic imports, Redis cache, PostgreSQL indexes, BullMQ for queuing, rate limiting middleware.
- **Conversation Optimization**: Optimized conversation and message loading with pagination, infinite scroll, parallel API calls, and cursor-based message pagination.
- **API Cache Singleflight Pattern**: Prevents cache stampede for concurrent requests.
- **Parallel Query Execution**: Dashboard stats, campaigns, and connection health APIs use `Promise.all`.
- **Tiered Cache TTLs**: For different data freshness requirements.
- **Memory Leak Prevention**: Global listener registration flag.
- **Singleton Implementations**: For key services like `HybridRedisClient`, `WebhookQueueService`, `BaileysSessionManager`.
- **OAuth Authentication System**: Production-ready OAuth 2.0 with Google and Facebook via NextAuth.js.
- **Atomic Lua Script Rate Limiting**: Using Redis/EnhancedCache.
- **Proactive Token Monitoring**: Meta access token expiration monitoring.
- **Deployment Configuration**: VM (Persistent) for Socket.IO, BullMQ, and Baileys; `/health` endpoint; Port 5000.
- **Voice AI Recent Calls Pagination**: Server-side pagination with offset/limit on `/api/v1/voice/calls` endpoint.
- **Voice Agents Management**: Grid view with agent cards, pagination (6 per page), status filter (Todos/Ativos/Inativos), and delete functionality with confirmation dialog.
- **Agent Status Toggle**: Improved toggle with visual feedback (loading spinner), toast notifications, and automatic list refresh.

## External Dependencies
### Third-Party APIs
- **Meta/WhatsApp Business Platform**: Graph API for WhatsApp Cloud API.
- **Baileys WhatsApp Library**: `@whiskeysockets/baileys`.
- **Retell.ai**: Voice AI platform for automated phone calls with voicemail detection.
- **Twilio**: Phone number provisioning and call routing.

### Voice AI System (December 8, 2025)
- **Agent Management**: Voice agents stored in `voice_agents` table with Retell integration.
- **Agent Lookup Priority**: 1) Local DB `voice_agents`, 2) External Voice AI Platform, 3) Retell auto-discovery.
- **Campaign Processing**: BullMQ worker polls every 30s; campaigns flow QUEUED → SENDING → COMPLETED/FAILED.
- **Retell API Notes**: `/v2/list-calls` requires POST method (not GET).
- **Concurrent Limits**: Retell 20 simultaneous calls (Pay-As-You-Go), Twilio 1 CPS.
- **Important**: `campaign-sender.ts` must NOT have `'use server'` directive (causes silent failures in BullMQ context).
- **Recent Calls Pagination**: Server-side with offset/limit; 10 per page; total count calculated up to 10000 calls.
- **Agents Pagination**: Grid view with 6 agents per page; Previous/Next buttons; "Page X of Y" indicator.
- **Agent Deletion**: Trash icon button on each agent card; AlertDialog confirmation; auto-refreshes list after deletion; sets status to 'archived'.
- **Agent Status Toggle**: Power button with:
  - Real-time visual feedback (loading spinner during update)
  - Toast success/error notifications
  - Automatic list refresh after status change
  - Properly syncs with filters (shows/hides based on active/inactive filter)
- **Agent Status Filter** (NEW - December 8, 2025): 
  - Three filter buttons: "Todos" (all non-archived), "Ativos" (only active), "Inativos" (only inactive)
  - Filter state resets pagination to page 1
  - Paginação (6 agents per page) synchronized with filter selection
  - Accurate "X de Y agentes" count based on current filter

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

## Recent Changes (December 8, 2025)
1. **Login Page Hydration Fix**: Added `suppressHydrationWarning` wrapper to `VersionBadge` component.
2. **Recent Calls Pagination**: Server-side pagination with 10 items per page; Previous/Next buttons.
3. **Voice Agents Grid Pagination**: 6 agents per page with pagination controls.
4. **Delete Agent Feature**: Trash icon button on each agent card with confirmation dialog.
   - Added `deleteAgent` function from hook
   - Confirmation dialog prevents accidental deletion
   - Auto-refreshes agents list after deletion
   - Resets pagination to page 1
   - Sets agent status to 'archived' instead of hard delete
5. **Fixed Archived Agents Filter**: Added `.filter(a => a.status !== 'archived')` to show only active agents, filtering out deleted ones.
6. **Agent Status Toggle (NEW)**: Improved `/voice-ai` page agent management
   - Replaced simple toggle with enhanced `toggleAgentStatus` function
   - Shows loading spinner while updating status
   - Toast notifications for success/error feedback
   - Forces list refresh after status change with `await fetchAgents()`
   - Prevents multiple simultaneous toggle requests via `togglingAgentId` state
7. **Agent Status Filter UI (NEW)**: Three-button filter system in "Meus Agentes" section
   - "Todos" - shows all non-archived agents
   - "Ativos" - shows only active agents  
   - "Inativos" - shows only inactive agents
   - Filter selection resets pagination to page 1 for consistent UX
   - Pagination (6 per page) correctly counts and displays filtered agents
