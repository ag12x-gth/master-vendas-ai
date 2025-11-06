# Master IA Oficial

## Overview

Master IA Oficial is a comprehensive WhatsApp and SMS mass messaging control panel with AI automation capabilities. The platform enables businesses to manage multi-channel campaigns, customer service conversations, and AI-powered chatbots through an intuitive dashboard. Its core purpose is to provide a centralized platform for managing WhatsApp/SMS campaigns, customer conversations, contact management (CRM), and AI-driven customer service automation using Meta's WhatsApp Business API and Baileys library.

## User Preferences

Preferred communication style: Simple, everyday language.

## Troubleshooting

### Layout/CSS Quebrado (Problema Recorrente)

**Sintoma**: Layout aparece sem CSS, apenas HTML puro (texto e links sem estilo).

**Causa**: Erro EADDRINUSE - Porta 5000 bloqueada impede o servidor Next.js de iniciar e processar Tailwind CSS.

**Solução Rápida**:
1. Clique em "Stop" no workflow Frontend
2. Aguarde 3 segundos
3. Clique em "Run" novamente

**Arquivos Críticos** (não deletar):
- `tailwind.config.js` - Configuração do Tailwind CSS
- `postcss.config.js` - Processador CSS necessário

Se os arquivos acima estiverem faltando, o CSS não funcionará.

## System Architecture

### Technology Stack

**Frontend**
- Framework: Next.js 14 (App Router)
- UI Components: React with ShadCN UI library (Radix UI primitives)
- Styling: Tailwind CSS
- State Management: React hooks with real-time Socket.IO integration
- Type Safety: TypeScript with strict mode enabled

**Backend**
- Runtime: Node.js 18+ with custom Express server
- API: Next.js API Routes (REST architecture)
- Real-time: Socket.IO 4.8.1 for WebSocket connections
- Database ORM: Drizzle ORM with PostgreSQL
- Authentication: JWT-based session management

**Database**
- Primary Database: PostgreSQL (Neon hosted)
- Vector Database: Separate PostgreSQL instance for AI embeddings
- Schema Management: Drizzle Kit for migrations
- Data Models: Companies, users, connections, campaigns, contacts, conversations, messages, AI personas, automation rules

**WhatsApp Integration**
- Meta Cloud API: Official WhatsApp Business API integration (v21.0)
- Baileys Library: @whiskeysockets/baileys 7.0.0-rc.6 for QR code sessions
- Dual Mode: Supports both Cloud API and local QR-based sessions
- **WhatsApp Templates v2**: Complete message template management system with Meta Cloud API v21.0 integration (✅ E2E tested 06/11/2025)

### Core Architectural Decisions

**1. Dual WhatsApp Connection Strategy**
- Supports both official Meta API and local WhatsApp connections (Baileys for QR code sessions).
- Provides flexibility for users without business verification while maintaining official API support.

**2. Real-time Communication Architecture**
- Socket.IO integration for instant updates on conversations, campaign status, and AI responses.
- Uses a custom server.js wrapper for Next.js to leverage full Socket.IO capabilities.

**3. AI Personas and Automation Engine**
- Persona-based architecture with provider abstraction (OpenAI, Google Gemini) for multiple AI providers.
- `ai-personas` table stores AI configurations, and automation rules trigger AI responses.
- Vector database for RAG (Retrieval-Augmented Generation) capabilities.

**4. Campaign Queue Management**
- Custom queue system with rate limiting and retry logic to process messages efficiently without overwhelming APIs.
- Database-backed queue with status tracking.

**5. Encryption Strategy**
- AES-256-GCM encryption with an environment-based key for sensitive data (API keys, tokens) at rest.
- Implemented via `src/lib/crypto.ts`.

**6. Multi-tenant Architecture**
- Company-based tenant model with user relationships for data isolation among multiple companies/users.
- JWT tokens include `companyId` for row-level security.

### API Architecture

**Webhook System**
- Meta Webhooks: `/api/webhooks/meta/[slug]` with signature verification and HMAC validation.
- Asynchronous message processing with automation triggers.

**RESTful Endpoints**
- Provides endpoints for managing connections, campaigns, contacts, conversations, AI personas, and Baileys sessions.

**Authentication Flow**
- JWT-based authentication with `userId` and `companyId` stored in HTTP-only cookies.
- Middleware validates tokens on protected routes, and email verification is required.

### Data Flow Patterns

**Incoming WhatsApp Message**
- Meta webhook receives event, verifies signature, stores message, and links to conversations.
- Automation engine evaluates rules, AI persona processes messages, and responses are sent via Meta API or Baileys.
- Socket.IO broadcasts updates to clients.

**Campaign Execution**
- User creates campaign, queue processor fetches contacts, rate limiter applies delays.
- Messages sent via selected connection, status tracked, and real-time progress via Socket.IO.

### Performance Considerations

**Caching Strategy**
- Custom "Replit Enhanced Cache" for API responses (in-memory + disk persistence).
- Cache invalidation on data mutations.

**Database Optimization**
- Indexed columns (`companyId`, `connectionId`, `phoneNumber`).
- Connection pooling via `pg.Pool`.

**Frontend Optimization**
- Route-based code splitting, lazy loading for dashboard widgets, and tree-shaken ShadCN components.

## External Dependencies

### Third-Party APIs

**Meta/WhatsApp Business Platform**
- Graph API v23.0 for WhatsApp Cloud API, requiring Business App ID, App Secret, and Phone Number ID.
- Uses access tokens and webhook subscriptions for real-time events.

**Baileys WhatsApp Library**
- @whiskeysockets/baileys 7.0.0-rc.6 for QR code-based WhatsApp sessions without business verification.
- Auth persistence in JSON files in `whatsapp_sessions/`.

### AI/ML Services

**OpenAI**
- Models: GPT-3.5-turbo, GPT-4 via `@ai-sdk/openai` for AI persona conversations and message generation.

**Google Generative AI**
- Model: Gemini Pro via `@ai-sdk/google`, `@google/generative-ai` as an alternative AI provider.

**Vector Database (pgvector)**
- PostgreSQL with pgvector extension for RAG (Retrieval-Augmented Generation) capabilities.

### Cloud Services

**AWS Services**
- **S3**: Media file storage.
- **CloudFront**: CDN for media delivery.
- **SES v2**: Email notifications and verification.

**Google Cloud Storage**
- Alternative to S3 for file storage.

### Infrastructure

**PostgreSQL (Neon)**
- Hosted database provider, including a separate instance for vector data.

**Firebase (Optional)**
- App Hosting and Secret Manager for environment variables.

**Replit Deployment**
- Development environment with native PostgreSQL and secrets management.

### Monitoring and Testing

**Playwright**
- End-to-end testing framework (v1.55.1).

**Socket.IO Client**
- For real-time testing and connection verification.

### Security Dependencies

**Encryption**
- Node.js built-in `crypto` for AES-256-GCM encryption.

**JWT**
- Custom implementation using `crypto.sign` for JWT tokens.

**CORS and CSRF**
- Next.js built-in CORS handling and CSRF protection.

## Recent System Features

### WhatsApp Templates v2 System (Completed 06/11/2025)

**Status**: ✅ Production-ready, E2E tested

**Components**:
- Interface: `/templates-v2` - Complete template builder with real-time preview
- API Routes: 
  - `GET /api/v1/message-templates` - List templates
  - `POST /api/v1/message-templates` - Create templates
  - `POST /api/v1/message-templates/[id]/submit` - Submit to Meta Cloud API
- Service Layer: `src/lib/metaTemplatesService.ts` - Meta Cloud API v21.0 integration
- Database: `message_templates` table with full template lifecycle tracking

**Features**:
- Template Builder with validation (header 60 chars, body 1024 chars)
- Real-time preview of templates
- Variable detection and validation ({{1}}, {{2}}, etc.)
- Component types: HEADER, BODY, FOOTER, BUTTONS (preserved as UPPERCASE for Meta API)
- Emoji and Unicode validation
- Name validation (lowercase, numbers, underscore only)
- Category support: UTILITY, MARKETING, AUTHENTICATION
- Status tracking: DRAFT → PENDING → APPROVED/REJECTED
- Integration with campaign system for message dispatching

**E2E Test Results** (06/11/2025):
- ✅ Template creation and storage
- ✅ Campaign queue processing
- ✅ Meta Cloud API integration (payload format validated)
- ✅ Delivery report tracking
- ✅ Error handling and logging
- Test infrastructure: 3 test contacts, 1 contact list, 2 templates, 1 campaign executed
- Full documentation: `docs/WHATSAPP_TEMPLATES_V2_E2E_GUIDE.md`

**Critical Technical Notes**:
- Component types MUST be uppercase (HEADER, BODY, FOOTER, BUTTONS) - Meta API requirement
- Template names: lowercase only, no spaces, underscore separator
- Dual table structure: `message_templates` (v2) and `templates` (v1 legacy) - campaigns reference legacy table
- Hook import fix: Changed `@/hooks/use-responsive` to `@/hooks/use-mobile` (correct path)

**Active Meta Connections**:
- roseli-5865-2 (WABA: 399691246563833, Phone: 391262387407327)
- Empresa-0589 (WABA: WABA123456)

**Real Template Submission (06/11/2025)**:
- ✅ REAL template submitted to Meta Cloud API v21.0
- Template Name: `lembrete_consulta_masterial`
- Meta Template ID: `624920360610224`
- Category: UTILITY (transactional, high approval rate)
- Status: ⏳ PENDING (awaiting Meta approval)
- Submitted at: 06/11/2025 05:56
- Learned: Headers cannot contain emojis, formatting, asterisks, or newlines
- First attempt: Rejected (emoji in header)
- Second attempt: SUCCESS - Template accepted, awaiting approval
- Approval time: Typically 5 minutes to 4 hours for UTILITY templates
- Next step: When approved, test real message sending via campaign
- Contacts available for testing: 5 contacts (Marco, Walison, Diego, José, LEAD SOROCABA 4)
- **Fixed**: React Hydration error in MobileMenuButton (server/client mismatch) - Added mounted state to ensure consistent SSR/CSR rendering (06/11/2025 06:05)
- Full documentation: `docs/TEMPLATE_REAL_SUBMISSION_GUIDE.md`, `docs/NEXT_STEPS_AFTER_APPROVAL.md`