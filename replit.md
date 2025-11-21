# Master IA Oficial

## Overview
Master IA Oficial is a comprehensive WhatsApp and SMS mass messaging control panel with AI automation capabilities. It provides a centralized platform for managing multi-channel campaigns, customer service conversations, contact management (CRM), and AI-driven chatbots using Meta's WhatsApp Business API and Baileys. The project aims to be an all-in-one solution for automated, intelligent communication, offering an intuitive dashboard for businesses, including an AI-powered lead progression system and a Kanban lead management system.

## Recent Changes
### 2025-11-21: Replit Object Storage Integration for Media Gallery
- **Environment Configuration:** Added `NEXT_PUBLIC_BASE_URL` secret for public URL generation in client-side code
- **Public Route Configuration:** Modified `src/middleware.ts` to bypass authentication for `/objects/*` routes, enabling public access to media files
- **Database Cleanup:** Removed 14 legacy media asset records (created before Object Storage migration) that no longer exist in storage
- **Storage Architecture:** Confirmed file path structure - uploads saved to `/bucket/zapmaster/companyId/media/fileId.ext`, served via `/objects/companyId/media/fileId.ext`
- **Impact:** Media gallery now fully functional with Replit Object Storage, all new uploads display correctly
- **Files Modified:** `src/middleware.ts`

### 2025-11-20: Contacts Page Critical Fixes (Data Retrieval + Layout + Pagination)
- **Bug #1 - Empty Contact List:** Fixed `db.execute()` result handling - Drizzle returns array directly, not `{rows: []}` object
  - **Root Cause:** Code assumed incorrect return type from `db.execute()`
  - **Solution:** Proper `Array.isArray()` validation in `src/app/api/v1/contacts/route.ts`
  - **Impact:** 22,782 contacts now visible (was showing empty list)
- **Bug #2 - Layout Broken:** Fixed excessive mobile padding cutting off table content
  - **Root Cause:** 80px bottom padding (`pb-20`) on mobile layout
  - **Solution:** Reduced to 24px (`pb-6`) and added responsive wrapper
  - **Files:** `src/contexts/session-context.tsx`, `src/app/(main)/contacts/page.tsx`
- **Bug #3 - Incorrect Pagination:** Fixed query misalignment between count and data queries
  - **Root Cause:** Count query used Drizzle ORM, data query used raw SQL with different filter logic
  - **Solution:** Aligned both queries to use identical SQL raw logic with `COUNT(DISTINCT c.id)`
  - **Impact:** Pagination now accurate with filters (tags/lists), no more empty pages
- **Prevention:** Added validation logging and comprehensive documentation in `docs/BUG_FIX_CONTACTS_AUTH_20251120.md`

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Technology Stack
- **Frontend**: Next.js 14 (App Router), React, ShadCN UI, Tailwind CSS, TypeScript, Socket.IO.
- **Backend**: Node.js 18+ (Express custom server), Next.js API Routes (REST), Socket.IO 4.8.1, Drizzle ORM (PostgreSQL), JWT authentication.
- **Database**: PostgreSQL (Neon hosted) for primary data, separate PostgreSQL with `pgvector` for AI embeddings.
- **WhatsApp Integration**: Meta Cloud API and Baileys library.

### Core Architectural Decisions
- **Dual WhatsApp Connection Strategy**: Supports both Meta API and local Baileys (QR code) connections with a hybrid messaging system.
- **Real-time Communication**: Socket.IO for instant updates.
- **AI Personas and Automation Engine**: Persona-based design with OpenAI provider and RAG capabilities via a vector database. Includes AI-powered automatic lead progression and humanized AI response delays.
- **Campaign Queue Management**: Custom queue system with rate limiting and retry logic, including a dedicated Baileys mass campaign system and an automated cadence (drip campaign) system.
- **Encryption**: AES-256-GCM for sensitive data at rest.
- **Multi-tenant Architecture**: Company-based tenant model ensuring data isolation.
- **Webhook System**: Meta Webhooks with signature verification and a production-ready custom webhooks integration with HMAC SHA256 and exponential retry logic.
- **Kanban Lead Management System**: Interactive Kanban board with full CRUD operations and drag-and-drop functionality.
- **Analytics Dashboard System**: Comprehensive real-time analytics with KPI metrics, time-series charts, and funnel visualization.
- **Template Management System**: Full CRUD interface for message templates with dynamic variable support.
- **UI/UX Component Library**: Reusable ShadCN-based components, including skeleton loaders, empty states, server-side pagination, debounced search inputs, and a centralized toast notification helper.
- **Progressive Web App (PWA)**: Mobile-first PWA implementation with offline support, app manifest, and standalone display mode.
- **Performance Optimizations**: Caching, dynamic imports, and removal of force-dynamic for improved responsiveness.
- **OAuth Authentication System**: Production-ready OAuth 2.0 with Google and Facebook via NextAuth.js, supporting account linking and multi-tenant compatibility.
- **Atomic Lua Script Rate Limiting**: Atomic rate limiting implementation using Lua scripts in Redis/EnhancedCache for concurrency safety and performance.
- **Campaign Pause/Resume System**: Full pause/resume functionality for WhatsApp (Baileys + Meta Cloud) and SMS campaigns with status verification between batches.
- **Proactive Token Monitoring**: Meta access token expiration monitoring using debug_token API with 7-day warning threshold and visual alerts.
- **Voice Calls Analytics Dashboard**: Comprehensive analytics system for Vapi voice calls with interactive charts, KPIs, trends, and performance metrics.
- **Memory Leak Prevention**: Global listener registration flag preventing MaxListenersExceededWarning in Redis/EnhancedCache initialization.

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