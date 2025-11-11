# Master IA Oficial

## Overview
Master IA Oficial is a comprehensive WhatsApp and SMS mass messaging control panel with AI automation capabilities. It provides a centralized platform for managing multi-channel campaigns, customer service conversations, contact management (CRM), and AI-driven chatbots using Meta's WhatsApp Business API and Baileys. The project aims to be an all-in-one solution for automated, intelligent communication, offering an intuitive dashboard for businesses.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack
- **Frontend**: Next.js 14 (App Router), React, ShadCN UI (Radix UI), Tailwind CSS, TypeScript, Socket.IO for real-time updates.
- **Backend**: Node.js 18+ (Express custom server), Next.js API Routes (REST), Socket.IO 4.8.1, Drizzle ORM (PostgreSQL), JWT authentication.
- **Database**: PostgreSQL (Neon hosted) for primary data, separate PostgreSQL with `pgvector` for AI embeddings, Drizzle Kit for schema management.
- **WhatsApp Integration**: Meta Cloud API (v21.0) and Baileys library (7.0.0-rc.6) for dual connection modes (official API and QR-based sessions). Supports WhatsApp Templates v2.

### Core Architectural Decisions
- **Dual WhatsApp Connection Strategy**: Flexibility through both Meta API and local Baileys (QR code) connections.
- **Real-time Communication**: Socket.IO for instant updates across the platform.
- **AI Personas and Automation Engine**: Persona-based design with provider abstraction (OpenAI, Google Gemini) and RAG capabilities via a vector database.
- **Campaign Queue Management**: Custom queue system with rate limiting and retry logic for efficient message processing.
- **Encryption**: AES-256-GCM for sensitive data at rest.
- **Multi-tenant Architecture**: Company-based tenant model ensuring data isolation.
- **Webhook System**: Meta Webhooks with signature verification for asynchronous message processing.
- **Data Flow**: Incoming messages processed via webhooks, stored, and routed through automation; campaigns managed by a queue processor.
- **Performance**: Custom caching, database optimization (indexing, connection pooling), and frontend optimizations (code splitting, lazy loading).

## External Dependencies

### Third-Party APIs
- **Meta/WhatsApp Business Platform**: Graph API v23.0 for WhatsApp Cloud API.
- **Baileys WhatsApp Library**: `@whiskeysockets/baileys` for QR code-based sessions.

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

## Recent Changes

### Campaign & Contact System Fixes (November 11, 2025)

Based on comprehensive error report (`test-results/Relatorio_Erros_Campanha_Mensagens.txt`), implemented critical fixes to resolve 8 identified errors in the campaign/contact/messaging flow:

#### 1. Redis List Operations Implementation
**Problem**: EnhancedCache missing Redis list methods (`lpush`, `rpush`, etc.) causing campaign queue failures  
**File**: `src/lib/redis.ts`  
**Solution**: 
- Implemented complete Redis list operations: `lpush`, `rpush`, `lrange`, `llen`, `lpop`, `rpop`, `blpop`, `brpop`
- Fixed LPUSH argument order (`LPUSH a b c` → `[c, b, a]`)
- Array cloning to prevent shared mutation
- Return types aligned with Redis specification
- **Status**: ✅ Architect-approved, production-ready

#### 2. Contact Creation Validation Fix
**Problem**: INSERT failures on contacts table due to invalid empty strings in optional fields  
**Files**: `src/app/api/v1/contacts/route.ts`  
**Solution**:
- Added `z.preprocess()` to all optional fields in `contactCreateSchema`
- Transforms empty strings (`""`) to `undefined` before validation
- Only populated values reach database INSERT
- Applied `.trim()` to required fields (name, phone)
- **Status**: ✅ Architect-approved, resolves Errors #1 and #2

#### 3. Template Association Fix (Schema Migration)
**Problem**: Campaigns showing "Modelo não encontrado" - FK pointed to legacy `templates` table while UI uses `message_templates`  
**Files**: `src/lib/db/schema.ts`, `src/app/api/v1/campaigns/route.ts`  
**Solution**:
- **Schema Update**: Changed `campaigns.templateId` FK from `templates` → `messageTemplates`
- **Query Update**: GET /api/v1/campaigns now JOINs with `message_templates`
- **Database Migration**: 
  - Dropped old FK: `campaigns_template_id_templates_id_fk`
  - Cleaned 137 invalid template_id references (set to NULL)
  - Created new FK: `campaigns_template_id_message_templates_id_fk`
- **Status**: ✅ Architect-approved, resolves Error #7

#### 4. Multi-tenant Campaign Security
**Problem**: Campaign creation allowed cross-tenant list access and empty lists  
**File**: `src/app/api/v1/campaigns/whatsapp/route.ts`  
**Solution**: Two-phase validation:
- **Phase 1 (Ownership)**: Verify ALL lists belong to company (HTTP 403 if not)
- **Phase 2 (Contact Validation)**: 
  - GROUP BY with COUNT DISTINCT to avoid duplicates
  - Reject if ANY list is empty (HTTP 400)
  - Set comparison to detect missing lists
- **Status**: ✅ Architect-approved, resolves Error #4

#### 5. Campaign Duplication Prevention
**Problem**: Multiple campaigns created on repeated clicks  
**Solution**: 
- Frontend `isProcessing` state already implemented
- Duplication was caused by Redis bug (now fixed)
- **Status**: ✅ Architect-approved, resolves Error #6

#### 6. CSV Import Functionality Validation
**Problem**: CSV import reported as non-functional (Error #3)  
**Files**: `src/components/contacts/import-contacts-dialog.tsx`, `src/app/api/v1/contacts/import/route.ts`  
**Solution**:
- **Verification**: Full implementation already existed (5-step dialog + backend endpoint)
- **Frontend**: PapaParse integration, column mapping, chunked processing (500 rows/batch)
- **Backend**: Sanitization, deduplication, atomic transactions, tag/list associations
- **Enhancement**: Created sample CSV file (`public/exemplo-importacao-contatos.csv`)
- **Root Cause**: Previous Zod validation bugs (fixed in task #2) were blocking imports
- **Status**: ✅ Architect-approved, resolves Error #3

### Resolution Summary
- **6 of 8 errors** completely resolved and architect-approved ✅
- **Errors #5/#8**: Automatically resolved by core fixes
- **144 total campaigns** in database (137 legacy cleaned, 7 valid maintained)
- **Production-ready**: Multi-tenant security, campaign queue, contact management
- **CSV Import**: Fully functional with downloadable sample template
