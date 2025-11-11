# Master IA Oficial

## Overview
Master IA Oficial is a comprehensive WhatsApp and SMS mass messaging control panel with AI automation capabilities. It provides a centralized platform for managing multi-channel campaigns, customer service conversations, contact management (CRM), and AI-driven chatbots using Meta's WhatsApp Business API and Baileys. The project aims to be an all-in-one solution for automated, intelligent communication, offering an intuitive dashboard for businesses.

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
- **Hybrid Campaign Messaging** (Nov 11, 2025): Unified wrapper pattern (`sendCampaignMessage`) with provider-specific sub-functions supporting both Meta Cloud API and Baileys connections. Includes template normalization helper (`resolveTemplate`) for legacy and v2 templates, case-insensitive channel routing, and singleton SessionManager access pattern.
- **Baileys Dedicated UI** (Nov 11, 2025): Separate page `/whatsapp-baileys` for Baileys-only messaging with simple text messages, avoiding conflicts with Meta API structured templates in `/templates-v2`. API endpoint `/api/v1/whatsapp-baileys/send` handles Baileys-specific message sending with ownership validation and SessionManager availability checks.
- **Enhanced Diagnostics** (Nov 11, 2025): SessionManager instrumented with `checkAvailability()` method and comprehensive logging throughout message lifecycle (attempt, validation, success/failure with contextual metadata including companyId, connectionId, status, visual emojis).

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
- **Replit**: Development environment.

### Monitoring and Testing
- **Playwright**: End-to-end testing.
- **Socket.IO Client**: For real-time testing.
- **Vitest**: Unit and integration testing framework.

## Recent Enhancements (Nov 11, 2025)

### Baileys Messaging Improvements
1. **Dedicated Baileys UI Page**
   - Route: `/whatsapp-baileys`
   - Features: Connection selector, phone number validation, message composition, character count
   - Separation: Keeps Baileys simple text messaging separate from Meta API structured templates
   - Added to WhatsApp submenu in sidebar navigation

2. **Baileys API Endpoint**
   - Endpoint: `POST /api/v1/whatsapp-baileys/send`
   - Validation: Zod schema for connectionId, recipient, message
   - Security: Company ownership verification, Baileys-only filtering, active connection checks
   - Integration: Uses SessionManager `checkAvailability()` for real-time session status

3. **Enhanced SessionManager Diagnostics**
   - New method: `checkAvailability(connectionId, companyId?)` returns availability status with details
   - Enhanced logging in `getSession()`: warns when session not found with available session list
   - Comprehensive logging in `sendMessage()`: attempt, validation, JID conversion, success/failure with full context
   - Visual indicators: ✅ (success), ❌ (error), ⚠️ (warning) for quick log parsing

### Technical Debt & Future Improvements
- **Test Coverage**: Current routing tests (`tests/campaign-routing.test.ts`) need refactoring to import and exercise real campaign routing logic instead of testing trivial string operations. Should include integration tests with mocked database and SessionManager to validate Meta API vs Baileys routing paths.