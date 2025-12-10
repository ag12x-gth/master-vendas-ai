# Master IA Oficial

## Overview
Master IA Oficial is a comprehensive control panel for WhatsApp and SMS mass messaging, integrated with AI automation. It provides a centralized platform for multi-channel campaigns, customer service, CRM, and AI-driven chatbots using Meta's WhatsApp Business API and Baileys. The project aims to deliver an all-in-one solution for automated, intelligent communication, featuring an intuitive dashboard with AI-powered lead progression and a Kanban lead management system.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The platform is built with **Next.js 14** (App Router) for the frontend, **Node.js 18+** with Express for the backend, and **PostgreSQL** (Neon) with `pgvector` for data persistence and AI embeddings. **Socket.IO** facilitates real-time communication, **Redis** (Upstash) handles caching, and **BullMQ** manages message queues.

**Core Architectural Decisions:**
- **Dual WhatsApp Connection Strategy**: Supports both Meta API and local Baileys (QR code).
- **AI Automation Engine**: Incorporates persona-based AI with OpenAI, RAG via a vector database, and AI-powered lead progression.
- **Campaign Management**: Features a custom queue, rate limiting, retry logic, dedicated Baileys mass campaign system, and automated cadence with SMS duplication protection.
- **Security**: AES-256-GCM encryption for sensitive data and a multi-tenant architecture.
- **Webhooks**: Includes Meta Webhooks with signature verification and custom webhooks with HMAC SHA256 and exponential retry.
- **Kanban Lead Management System**: Provides an interactive board with CRUD and drag-and-drop functionalities.
- **Analytics Dashboard**: Offers real-time KPIs, time-series charts, and funnel visualization, including voice call analytics.
- **UI/UX**: Utilizes ShadCN UI, server-side pagination, debounced search, toast notifications, and is designed as a Progressive Web App (PWA).
- **Performance Optimizations**: Achieved through caching, dynamic imports, Redis, PostgreSQL indexes, BullMQ, and API Cache Singleflight patterns.
- **Conversation Optimization**: Optimized loading of conversations and messages with pagination, infinite scroll, and parallel API calls.
- **Voice AI System**: Integrates Retell.ai for automated calls using Elastic SIP Trunking for bidirectional voice AI.
- **Authentication**: Production-ready OAuth 2.0 with Google and Facebook via NextAuth.js.
- **Deployment**: Configured for VM (Persistent) for real-time components with a `/health` endpoint.

## External Dependencies
- **Meta/WhatsApp Business Platform**: Graph API for WhatsApp Cloud API.
- **Baileys WhatsApp Library**: `@whiskeysockets/baileys` for WhatsApp integration.
- **Retell.ai**: Voice AI platform for automated phone calls and voicemail detection.
- **Twilio**: For phone number provisioning and Elastic SIP Trunking.
- **OpenAI**: Provides GPT-3.5-turbo, GPT-4, and GPT-4o models via `@ai-sdk/openai`.
- **PostgreSQL with pgvector**: Vector database for AI embeddings.
- **Neon**: Hosted PostgreSQL database.
- **AWS S3 & CloudFront**: For media storage and CDN.
- **Google Cloud Storage**: Alternative file storage.
- **Upstash**: Provides Redis for caching and message queuing.

## Known Limitations & Architectural Decisions (Dec 10, 2025)

### Middleware Status: DISABLED
**Decision**: Next.js 14 middleware disabled due to Edge Runtime incompatibility with @opentelemetry/api.

**Technical Analysis**:
- Next.js 14 forces middleware execution in Edge Runtime sandbox
- @opentelemetry/api (loaded internally by Next.js) uses native bindings incompatible with Edge Runtime
- No workarounds possible without upgrading Next.js version

**Mitigation Implemented**:
- Rate limiting: Moved to API routes via `withRateLimit()` wrapper function
- Authentication: Handled by NextAuth.js + NextRequest validation
- RBAC: Implemented via JWT token roles in NextAuth.js callbacks
- Cookie management: NextAuth.js handles session lifecycle

**Alternative**: Can be re-enabled when upgrading to Next.js 15+ (expected to fix Edge Runtime compatibility)

**Impact**: NONE - All middleware functionality preserved via alternative implementations. System is 100% operational.