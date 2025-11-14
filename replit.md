# Master IA Oficial

## Overview
Master IA Oficial is a comprehensive WhatsApp and SMS mass messaging control panel with AI automation capabilities. It provides a centralized platform for managing multi-channel campaigns, customer service conversations, contact management (CRM), and AI-driven chatbots using Meta's WhatsApp Business API and Baileys. The project aims to be an all-in-one solution for automated, intelligent communication, offering an intuitive dashboard for businesses. The platform includes an AI-powered lead progression system and a complete Kanban lead management system.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Technology Stack
- **Frontend**: Next.js 14 (App Router), React, ShadCN UI (Radix UI), Tailwind CSS, TypeScript, Socket.IO.
- **Backend**: Node.js 18+ (Express custom server), Next.js API Routes (REST), Socket.IO 4.8.1, Drizzle ORM (PostgreSQL), JWT authentication.
- **Database**: PostgreSQL (Neon hosted) for primary data, separate PostgreSQL with `pgvector` for AI embeddings, Drizzle Kit.
- **WhatsApp Integration**: Meta Cloud API (v21.0) and Baileys library (7.0.0-rc.6).

### Core Architectural Decisions
- **Dual WhatsApp Connection Strategy**: Supports both Meta API and local Baileys (QR code) connections.
- **Real-time Communication**: Socket.IO for instant updates.
- **AI Personas and Automation Engine**: Persona-based design with provider abstraction (OpenAI, Google Gemini) and RAG capabilities via a vector database.
- **Campaign Queue Management**: Custom queue system with rate limiting and retry logic.
- **Encryption**: AES-256-GCM for sensitive data at rest.
- **Multi-tenant Architecture**: Company-based tenant model ensuring data isolation.
- **Webhook System**: Meta Webhooks with signature verification.
- **Data Flow**: Incoming messages processed via webhooks, stored, and routed through automation; campaigns managed by a queue processor.
- **Performance**: Custom caching, database optimization, and frontend optimizations.
- **Hybrid Campaign Messaging**: Unified wrapper pattern (`sendCampaignMessage`) with provider-specific sub-functions supporting both Meta Cloud API and Baileys connections, including template normalization.
- **Baileys Dedicated UI**: Separate page (`/whatsapp-baileys`) for Baileys-only messaging, with a dedicated API endpoint (`/api/v1/whatsapp-baileys/send`).
- **Enhanced Diagnostics**: SessionManager with `checkAvailability()` method and comprehensive logging throughout message lifecycle.
- **Automatic Lead Progression System**: AI-powered funnel stage migration using a new `move_to_stage` automation action, intelligent qualification detection with weighted scoring, and automatic stage progression after AI responses.
- **Kanban Lead Management System**: Production-ready interactive Kanban with full CRUD operations, drag-and-drop functionality, and mobile-first responsive design, including interactive lead dialogs, KanbanCard components, and robust API endpoints with state management and security.
- **Singleton Pattern Enforcement**: True singleton implementation for `EnhancedCache` and Redis client to prevent memory leaks.
- **Conversations List Pagination Fix**: Smart `limit=0` support with a 10k safety cap for the `/api/v1/conversations` endpoint.
- **Baileys Mass Campaign System**: End-to-end implementation for direct message campaigns without templates, including dedicated UI components, backend API endpoints, and a dual-path campaign sender for template-based and direct messages.
- **Analytics Dashboard System**: Comprehensive real-time analytics with KPI metrics (conversations, leads, conversion rate, avg response time calculated via SQL CTE), time-series charts (day/week/month granularity), funnel visualization, campaign/notification metrics, and SWR data fetching with 30s auto-refresh.
- **Custom Webhooks Integration**: Production-ready webhook system with CRUD management, 10+ event types, HMAC SHA256 signature verification, exponential retry logic (60s → 2h over 5 attempts), background queue worker (60s interval), and Zapier integration documentation with non-blocking dispatches.
- **Template Management System**: Full CRUD interface for message templates with dynamic variable support ({{name}}, {{phone}}, {{email}}, {{company}}), category organization, usage tracking, predefined system templates with edit/delete protection, and regex-based variable extraction for preview rendering.
- **UI/UX Component Library**: Production-ready reusable components including skeleton loaders (table/card/list variants), empty states with CTAs, server-side pagination controls with keyboard navigation (arrows/home/end/left/right) and ARIA live announcements, debounced search inputs (300ms), text highlighting utilities, and centralized toast notification helper with 4 variants (success/error/warning/info). Toast helper pattern: `const notify = useMemo(() => createToastNotifier(toast), [toast])` (MANDATORY useMemo wrapper to prevent re-renders and loops) with dependency arrays always using `[notify]` instead of `[toast]`. Integrated in 6 components: ContactListsTable, AutomationList, WebhookDialog, CampaignTable (hoisting pattern to CampaignCard), TemplateDialog, ContactTable. Hoisting pattern: parent creates notify once and passes to memoized children via props for shared reference stability.
- **Progressive Web App (PWA)**: Complete mobile-first PWA implementation with offline support via service worker (Stale-While-Revalidate strategy), app manifest with shortcuts/share target, install prompts with localStorage dismissal, 192x192/512x512 icons, Apple PWA meta tags, and standalone display mode for native app experience.
- **Performance Optimizations (Nov 2025)**: React cache() wrapper for getUserSession eliminating 300-800ms blocking fetch on every navigation, dynamic imports with SSR disabled for ConsoleMonitor and InstallBanner reducing initial bundle size, removal of force-dynamic from main layout enabling RSC streaming, ConnectionStatusBadge popover component for discrete connection monitoring replacing full-page alerts.
- **UX Polish (Nov 2025)**: Hybrid page description strategy (removed from simple pages: Campaigns, Lists, Atendimentos, Dashboard, Conexões, Templates; preserved in complex pages: Automations, AI Agents, Settings, Voice Calls, Roadmap), ConversationListItem layout optimized with min-w-0 and shrink-0 for proper text truncation, ConnectionAlerts card removed from dashboard in favor of header badge.

## External Dependencies
### Third-Party APIs
- **Meta/WhatsApp Business Platform**: Graph API v23.0 for WhatsApp Cloud API.
- **Baileys WhatsApp Library**: `@whiskeysockets/baileys`.

### AI/ML Services
- **OpenAI**: GPT-3.5-turbo, GPT-4 via `@ai-sdk/openai`.
- **Google Generative AI**: Gemini Pro via `@ai-sdk/google`, `@google/generative-ai`.
- **Vector Database**: PostgreSQL with `pgvector` extension.

### Cloud Services
- **AWS Services**: S3 (media storage), CloudFront (CDN), SES v2 (email notifications).
- **Google Cloud Storage**: Alternative file storage.

### Infrastructure
- **PostgreSQL**: Neon (hosted database).
- **Firebase**: (Optional) App Hosting and Secret Manager.
- **Replit**: Development environment, Object Storage.