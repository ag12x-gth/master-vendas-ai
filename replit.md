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
- **Campaign Processing**: setInterval-based worker polls every 30s (NOT BullMQ repeatable jobs); campaigns flow QUEUED → SENDING → COMPLETED/FAILED. Worker uses `isProcessing` guard for single execution and database compare-and-swap for multi-instance safety.
- **Retell API Notes**: `/v2/list-calls` requires POST method (not GET).
- **Concurrent Limits**: Retell 20 simultaneous calls (Pay-As-You-Go), Twilio 1 CPS.
- **Important**: `campaign-sender.ts` must NOT have `'use server'` directive (causes silent failures in BullMQ context).
- **CRITICAL - Twilio Caller ID**: Only `+553322980007` is verified for outbound calls. Using unverified numbers causes "dial failed" errors.
- **Recent Calls Pagination**: Server-side with offset/limit; 10 per page; total count calculated up to 10000 calls.
- **Agents Pagination**: Grid view with 6 agents per page; Previous/Next buttons; "Page X of Y" indicator.
- **Agent Deletion**: Trash icon button on each agent card; AlertDialog confirmation; auto-refreshes list after deletion; sets status to 'archived'.
- **Agent Status Toggle**: Power button with loading spinner, toast notifications, automatic list refresh.
- **Agent Status Filter**: Three filter buttons (Todos/Ativos/Inativos) synchronized with pagination.
- **Campanhas de Voz**: PAGINATED display - shows 10 voice campaigns per page with status indicators:
  - Status badges: Enviando (blue pulse), Na fila (yellow), Pausada (orange), Concluída (green), Falha (red), Agendada (purple)
  - Progress bar for "Enviando" campaigns
  - Pause button for SENDING/QUEUED campaigns only
  - Empty state when no campaigns created
  - Sorted by creation date (newest first)
  - Shows creation timestamp
  - Pagination buttons (Previous/Next) with "Page X of Y" indicator
  - Click on campaign to open modal with real call data
  - **Campaign Details Modal** - Shows:
    - Real metrics from Retell: Total calls, Answered, Not answered
    - Detailed call list table with: phone number, status, duration, date/time
    - Status colors: Green (answered), Blue (voicemail), Yellow (no answer), Orange (busy), Red (failed)

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

## Recent Changes (December 8, 2025 - Session 6)
1. **RetellCallButton Component** - New "Ligar" button for contact profiles using Retell API:
   - `src/components/voice/RetellCallButton.tsx`: Button component with confirmation dialog
   - `src/hooks/useRetellCalls.ts`: React hook for managing Retell call state
   - `src/app/api/v1/voice/initiate-call/route.ts`: API endpoint to initiate calls
   - `src/app/api/v1/voice/history/route.ts`: API endpoint for call history by contact
   - Phone number normalization: Properly handles +55 prefix without duplication
   - Creates `voiceDeliveryReport` record for direct calls (non-campaign)

2. **Voice Campaign KPIs Fixed**:
   - Fixed `contacts.phone` field reference (was using non-existent `phone_number`)
   - Removed invalid `.all()` method from Drizzle queries
   - Campaign details modal now displays real call metrics

3. **Schema Change - Nullable campaignId**:
   - `voice_delivery_reports.campaign_id` is now nullable (previously NOT NULL)
   - Allows direct calls from contact profiles without requiring a campaign
   - Applied via SQL: `ALTER TABLE voice_delivery_reports ALTER COLUMN campaign_id DROP NOT NULL`

4. **History API Company Filtering Fix**:
   - Fixed company isolation for non-campaign calls
   - Uses `campaignCompanyId` OR `contactCompanyId` for filtering
   - Ensures calls without campaigns still appear in history

## Previous Changes (December 8, 2025 - Session 5)
1. **🎉 RETELL WEBHOOK REGISTERED** - CRITICAL ISSUE RESOLVED:
   - **Problem**: Voice campaigns initiated successfully, but DB never updated (all records stuck at INITIATED/pending)
   - **Root Cause**: Retell webhook not registered - calls created but no callbacks sent to server
   - **Solution**: Registered webhook URL in Retell agent configuration
   - **Webhook Details**:
     - URL: `https://62863c59-d08b-44f5-a414-d7529041de1a-00-16zuyl87dp7m9.kirk.replit.dev/api/v1/voice/webhooks/retell`
     - Agent: `agent_c96d270a5cad5d4608bb72ee08` (Assistente Brasil, pt-BR)
     - Events: `call_started`, `call_ended`, `call_analyzed`
   - **Impact**: Now Retell will send callbacks to server, which will:
     - Trigger `handleCallEnded` function in webhook handler
     - Call `updateVoiceDeliveryWithOutcome` to update DB with real status
     - Update `call_outcome`, `duration`, `disconnectionReason` fields
     - Schedule retries if needed
   - **Verification**: Webhook confirmed via GET agent endpoint - webhook_url is set
   - **Next Step**: Run test campaign - all call statuses will now update in real-time

## Previous Changes (December 8, 2025 - Session 4)
1. **Removed "Chamadas em Curso" Section** (`src/app/(main)/voice-ai/page.tsx`):
   - Removed redundant active calls section from Voice AI page
   - Removed `fetchActiveCalls` function and polling logic
   - Removed `loadingActiveCalls` state variable
   - Removed `Activity` icon import from lucide-react
   - Campaign details modal now shows all call metrics, making active calls display redundant

2. **Implemented Campaign Pagination (10/page)** (`src/app/(main)/voice-ai/page.tsx`):
   - Added pagination state: `campaignsPage`, `campaignsTotal`
   - Updated `fetchVoiceCampaigns` to use limit/offset parameters
   - Frontend limits to 10 campaigns per page
   - Added Previous/Next pagination buttons at bottom of campaigns list
   - Shows "Page X of Y" indicator
   - Button state disabled at first/last page

3. **Created Voice Report API** (`src/app/api/v1/campaigns/{id}/voice-report/route.ts`):
   - New GET endpoint that returns real voice call data for campaigns
   - Returns metrics: `{ total, answered, notAnswered, failed }`
   - Returns detailed call list with phone number, status, duration, outcome, failure reason
   - Joins `voiceDeliveryReports` with `contacts` table
   - Maps call outcomes to user-friendly status labels
   - Sorted by date (most recent first)

4. **Updated Campaign Details Modal** (`src/components/campaigns/campaign-details-modal.tsx`):
   - Added voice-specific data fetching via new `/voice-report` endpoint
   - Modal now displays real metrics instead of zeros
   - Added detailed calls table showing each phone number and its call status
   - Status badges: Atendida (green), Voicemail (blue), Sem resposta (yellow), Ocupado (orange), Falha (red)
   - Shows call duration and timestamp for each call
   - Separate data fetching for voice vs. WhatsApp/SMS campaigns

## Previous Changes (December 8, 2025 - Session 3)
1. **Archived Agents Filtering**: Added filter to hide deleted agents (status = 'archived') from display.
2. **Agent Status Toggle Enhanced**: Loading spinner, toast notifications, auto-refresh.
3. **Agent Status Filter UI**: Three-button filter (Todos/Ativos/Inativos) with pagination reset.
4. **Chamadas em Curso (Active Calls) - ALWAYS VISIBLE**: Shows active calls with empty state.
5. **Campanhas de Voz - ALWAYS VISIBLE**: Shows ALL voice campaigns with status indicators.
