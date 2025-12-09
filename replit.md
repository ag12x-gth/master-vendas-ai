# Master IA Oficial

## Overview
Master IA Oficial is a comprehensive WhatsApp and SMS mass messaging control panel with AI automation capabilities. It provides a centralized platform for managing multi-channel campaigns, customer service conversations, contact management (CRM), and AI-driven chatbots using Meta's WhatsApp Business API and Baileys. The project aims to be an all-in-one solution for automated, intelligent communication, offering an intuitive dashboard for businesses, including an AI-powered lead progression system and a Kanban lead management system.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The platform is built with a modern web stack, featuring **Next.js 14** (App Router) for the frontend, **Node.js 18+** with Express for the backend, and **PostgreSQL** (Neon) for data persistence, including `pgvector` for AI embeddings. **Socket.IO** enables real-time communication, while **Redis** (Upstash) handles caching and **BullMQ** manages message queues.

**Core Architectural Decisions include:**
- **Dual WhatsApp Connection Strategy**: Supports both Meta API and local Baileys (QR code) for WhatsApp integration.
- **AI Automation Engine**: Features persona-based AI with OpenAI, RAG via a vector database, and AI-powered lead progression.
- **Campaign Management**: Includes a custom queue, rate limiting, retry logic, dedicated Baileys mass campaign system, and automated cadence (drip campaign) with SMS duplication protection.
- **Security**: AES-256-GCM encryption for sensitive data and multi-tenant architecture ensuring data isolation.
- **Webhooks**: Meta Webhooks with signature verification and custom webhooks with HMAC SHA256 and exponential retry.
- **Kanban Lead Management System**: Provides an interactive board with CRUD and drag-and-drop functionalities.
- **Analytics Dashboard**: Offers real-time KPIs, time-series charts, and funnel visualization, including voice call analytics.
- **UI/UX**: Utilizes ShadCN UI for reusable components, server-side pagination, debounced search, and toast notifications. The application is designed as a Progressive Web App (PWA).
- **Performance Optimizations**: Achieved through caching, dynamic imports, Redis, PostgreSQL indexes, BullMQ, and API Cache Singleflight patterns.
- **Conversation Optimization**: Optimized loading of conversations and messages with pagination, infinite scroll, and parallel API calls.
- **Voice AI System**: Integrates Retell.ai for automated calls, with agents managed in a local database (`voice_agents`). It supports both inbound and outbound calls, with specific Twilio TwiML configurations for bidirectional audio streaming (Dial to SIP URI method).
- **Authentication**: Production-ready OAuth 2.0 with Google and Facebook via NextAuth.js.
- **Deployment**: Configured for VM (Persistent) for real-time components and has a `/health` endpoint.

## External Dependencies
- **Meta/WhatsApp Business Platform**: Graph API for WhatsApp Cloud API.
- **Baileys WhatsApp Library**: `@whiskeysockets/baileys` for WhatsApp integration.
- **Retell.ai**: Voice AI platform for automated phone calls and voicemail detection.
- **Twilio**: For phone number provisioning and call routing, including specific caller ID verification.
- **OpenAI**: Provides GPT-3.5-turbo, GPT-4, and GPT-4o models via `@ai-sdk/openai`.
- **PostgreSQL with pgvector**: Used as a vector database for AI embeddings.
- **Neon**: Hosted PostgreSQL database.
- **AWS S3 & CloudFront**: For media storage and CDN.
- **Google Cloud Storage**: Alternative file storage.
- **Upstash**: Provides Redis for caching and message queuing.

## Recent Changes (December 9, 2025 - Session 11)
### ✅ VOICE INBOUND SYSTEM - FULLY OPERATIONAL & PUBLISHED

**System Status: 🟢 PRODUCTION READY**

#### What's Fully Working:
1. **Twilio Inbound Webhook** ✅
   - Receives all incoming calls successfully
   - Phone: +55 33 2298-0007 (Governador Valadares, MG - BR)
   - Voice + SIP capabilities enabled

2. **Database Integration** ✅
   - All calls logged to `voiceCalls` table
   - Stores: callSid, retellCallId, duration, transcript, metadata
   - Real-time status updates

3. **Retell Agent - PUBLISHED** ✅
   - **Agent ID**: `agent_fcfcf7f9c84e377b0a1711c0bb`
   - **Agent Name**: "assistente-2"
   - **LLM ID**: `llm_0c131c85dd6a0b22674b1bd93769`
   - **Status**: Version 6 PUBLISHED ✅
   - **Features**: Inbound + Outbound enabled

4. **TwiML SIP Routing** ✅
   - Format: `sip:{call_id}@sip.retellai.com`
   - Twilio correctly routing to Retell SIP server
   - All 7 test calls routed successfully

5. **Webhook Event Processing** ✅
   - Full call lifecycle tracked
   - Events: call_started, call_ended, call_analyzed
   - Status updates: initiated → ongoing → ended
   - Webhook timeout: 5 seconds (configured in Retell)

#### Test Results (7 successful inbound calls):
```
✅ Call 1 (06:34:51 UTC) - Retell ID: call_819035349146fbebb967542b4c5
✅ Call 2 (06:57:48 UTC) - Retell ID: call_41948950b0873e6df79def746f7
✅ Call 3 (06:58:57 UTC) - Retell ID: call_ef8cfc4d1fefc359c9f40d6f907
✅ Call 4 (07:07:00 UTC) - Retell ID: call_62865e18777d8b3caf1a9ac3345
✅ Call 5 (07:07:15 UTC) - Retell ID: call_7e504458e681446dd728d8de95f
✅ Call 6 & 7 - Additional calls processed
```

All calls were:
- ✅ Received by Twilio webhook
- ✅ Registered with Retell API
- ✅ Routed to SIP URI
- ✅ Logged to database
- ✅ Call_ended/call_analyzed events processed

## Current Production Status
- **API Endpoints**: ✅ ALL FUNCTIONAL
  - POST /api/v1/voice/webhooks/twilio/incoming (200 OK)
  - POST /api/v1/voice/webhooks/twilio/status (200 OK)
  - POST /api/v1/voice/webhooks/retell (200 OK)
  - GET /api/v1/voice/webhooks/retell (200 OK - verification)

- **Database**: ✅ RECORDING CORRECTLY
  - voice_agents: Contains published agent_id
  - voiceCalls: Recording all calls with full lifecycle
  - Status tracking: initiated → ongoing → ended

- **Twilio Configuration**: ✅ COMPLETE
  - Phone: +553322980007 (Governador Valadares, BR)
  - Capabilities: Voice + SIP ✅
  - Webhooks: Fully configured and firing

- **Retell Integration**: ✅ PRODUCTION READY
  - Agent: assistente-2 (Version 6 PUBLISHED)
  - Webhook: https://62863c59-d08b-44f5-a414-d7529041de1a-00-16zuyl87dp7m9.kirk.replit.dev/api/v1/voice/webhooks/retell
  - Timeout: 5 seconds
  - Both Inbound & Outbound calls enabled

- **Production Server**: ✅ RUNNING
  - Port: 5000
  - Next.js: 14.2.33
  - Workers: Campaign Trigger Worker, WebhookQueue Service, all active

## Testing Credentials & Configuration
- **Twilio Number**: +55 33 2298-0007
- **Test Phone**: +55 64 99952-6870
- **Retell Dashboard**: https://dashboard.retell.ai
- **Agent ID**: agent_fcfcf7f9c84e377b0a1711c0bb
- **Agent Name**: assistente-2
- **Version**: 6 (PUBLISHED)
- **LLM ID**: llm_0c131c85dd6a0b22674b1bd93769

## Code Files Modified & Verified
- ✅ `src/app/api/v1/voice/webhooks/twilio/incoming/route.ts` - Fully functional
- ✅ `src/app/api/v1/voice/webhooks/twilio/status/route.ts` - Fully functional
- ✅ `src/app/api/v1/voice/webhooks/retell/route.ts` - Fully functional
- ✅ `src/lib/db/schema.ts` - Tables configured correctly
- ✅ Database: voice_agents table updated with published agent_id

## Next Steps
The system is **100% ready for production**. 

**To test the live system:**
1. Call: +55 33 2298-0007 from +55 64 99952-6870
2. Agent will respond: "Olá! Bem-vindo ao Master IA..."
3. You can have conversations up to 1 hour duration
4. All calls logged and available in dashboard

**For deployment to production:**
Use Replit's deployment feature to publish this app (click Publish button in Replit interface).
