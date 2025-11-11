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