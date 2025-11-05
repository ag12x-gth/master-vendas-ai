# Master IA Oficial

## Overview

Master IA Oficial is a comprehensive WhatsApp and SMS mass messaging control panel with AI automation capabilities. The platform enables businesses to manage multi-channel campaigns, customer service conversations, and AI-powered chatbots through an intuitive dashboard.

**Core Purpose**: Centralized platform for managing WhatsApp/SMS campaigns, customer conversations, contact management (CRM), and AI-driven customer service automation using Meta's WhatsApp Business API and Baileys library.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- Meta Cloud API: Official WhatsApp Business API integration
- Baileys Library: @whiskeysockets/baileys 7.0.0-rc.6 for QR code sessions
- Dual Mode: Supports both Cloud API and local QR-based sessions
- Session Management: Filesystem-based auth state persistence in `whatsapp_sessions/`

### Core Architectural Decisions

**1. Dual WhatsApp Connection Strategy**
- **Problem**: Need to support both official Meta API and local WhatsApp connections
- **Solution**: Implemented dual-mode system with `BaileysSessionManager` for QR code sessions and Meta Cloud API handlers
- **Rationale**: Provides flexibility for users without business verification while maintaining official API support
- **Implementation**: Separate service layers with unified connection interface

**2. Real-time Communication Architecture**
- **Problem**: Need instant updates for conversations, campaign status, and AI responses
- **Solution**: Socket.IO integration with custom server.js wrapping Next.js
- **Rationale**: Next.js native WebSocket support is limited; custom server enables full Socket.IO capabilities
- **Trade-offs**: Slight deployment complexity, but essential for real-time features

**3. AI Personas and Automation Engine**
- **Problem**: Multiple AI providers with different conversation contexts
- **Solution**: Persona-based architecture with provider abstraction (OpenAI, Google Gemini)
- **Implementation**: 
  - `ai-personas` table stores AI configurations
  - Automation rules trigger AI responses based on conversation state
  - Vector database for RAG (Retrieval-Augmented Generation) capabilities
- **Providers**: OpenAI GPT models, Google Gemini via AI SDK

**4. Campaign Queue Management**
- **Problem**: Need to process thousands of messages without overwhelming APIs
- **Solution**: Custom queue system with rate limiting and retry logic
- **Implementation**: Database-backed queue with status tracking (pending, sending, sent, failed)
- **Rate Limits**: Configurable per connection to respect provider limits

**5. Encryption Strategy**
- **Problem**: Sensitive data (API keys, tokens) must be encrypted at rest
- **Solution**: AES-256-GCM encryption with environment-based key
- **Implementation**: `src/lib/crypto.ts` with automatic key hashing for compatibility
- **Warning**: Key changes require data re-encryption

**6. Multi-tenant Architecture**
- **Problem**: Support multiple companies/users with data isolation
- **Solution**: Company-based tenant model with user relationships
- **Schema**: `companies` -> `users`, `connections`, `contacts`, `campaigns`
- **Access Control**: JWT tokens include `companyId` for row-level security

### API Architecture

**Webhook System**
- **Meta Webhooks**: `/api/webhooks/meta/[slug]` with signature verification
- **Verification Flow**: Hub challenge-response with verify token
- **Security**: HMAC signature validation using app secret
- **Event Processing**: Asynchronous message processing with automation triggers

**RESTful Endpoints**
- `/api/v1/connections`: WhatsApp connection management
- `/api/v1/campaigns`: Campaign CRUD and execution
- `/api/v1/contacts`: CRM operations
- `/api/v1/conversations`: Conversation and message management
- `/api/v1/ia/personas`: AI agent configuration
- `/api/v1/whatsapp/sessions`: Baileys session control

**Authentication Flow**
1. User login generates JWT with `userId` and `companyId`
2. Token stored in HTTP-only cookie (`__session`)
3. Middleware validates token on protected routes
4. Email verification required for full access

### Data Flow Patterns

**Incoming WhatsApp Message**
1. Meta webhook receives event → signature verification
2. Message stored in database with conversation linking
3. Automation engine evaluates rules for conversation
4. If AI-enabled: Persona processes message with context
5. Response sent via Meta API or Baileys
6. Socket.IO broadcasts updates to connected clients

**Campaign Execution**
1. User creates campaign with message template
2. Queue processor fetches contacts in batches
3. Rate limiter enforces provider-specific delays
4. Messages sent via selected connection (Meta/Baileys)
5. Status updates tracked per message
6. Real-time progress via Socket.IO

### Performance Considerations

**Caching Strategy**
- Custom "Replit Enhanced Cache" for API responses
- In-memory + disk persistence for session data
- Cache invalidation on data mutations

**Database Optimization**
- Indexed columns: `companyId`, `connectionId`, `phoneNumber`
- Timestamp-based partitioning for messages table (planned)
- Connection pooling via `pg.Pool`

**Frontend Optimization**
- Route-based code splitting (Next.js automatic)
- Lazy loading for dashboard widgets
- ShadCN components tree-shaken by default

## External Dependencies

### Third-Party APIs

**Meta/WhatsApp Business Platform**
- Graph API v23.0 for WhatsApp Cloud API
- Required: Business App ID, App Secret, Phone Number ID
- Authentication: Access tokens (user/system)
- Webhook subscriptions for real-time events
- Rate limits: Tier-based (10k/day default)

**Baileys WhatsApp Library**
- Purpose: QR code-based WhatsApp sessions without business verification
- Version: 7.0.0-rc.6 (release candidate)
- Auth persistence: JSON files in `whatsapp_sessions/`
- Connection lifecycle: QR generation, pairing, session maintenance
- Limitations: Single-device mode, periodic re-authentication needed

### AI/ML Services

**OpenAI**
- Models: GPT-3.5-turbo, GPT-4
- SDK: `@ai-sdk/openai` for streaming responses
- Usage: AI persona conversations, message generation
- API Key: Required via environment variable

**Google Generative AI**
- Model: Gemini Pro
- SDK: `@ai-sdk/google`, `@google/generative-ai`
- Usage: Alternative AI provider for personas
- API Key: GEMINI_API_KEY environment variable

**Vector Database (pgvector)**
- Extension: PostgreSQL with pgvector for embeddings
- Purpose: RAG for AI context enhancement
- Schema: Separate migration in `drizzle/vector/`
- Connection: `VECTOR_DB_URL` environment variable

### Cloud Services

**AWS Services**
- **S3**: Media file storage (images, documents, audio)
- **CloudFront**: CDN for media delivery
- **SES v2**: Email notifications and verification
- Configuration: IAM credentials via environment variables
- Bucket: Specified by `AWS_S3_BUCKET_NAME`

**Google Cloud Storage**
- Alternative to S3 for file storage
- SDK: `@google-cloud/storage`
- Authentication: Service account credentials

### Infrastructure

**PostgreSQL (Neon)**
- Hosted database provider
- Connection: `DATABASE_URL` with SSL
- Separate instance for vector data (`VECTOR_DB_URL`)

**Firebase (Optional)**
- App Hosting for deployment
- Secret Manager for environment variables
- Configuration: `firebase.json` with backend config

**Replit Deployment**
- Development environment with native PostgreSQL
- Secrets management via Replit interface
- Port: 5000 (configurable)

### Monitoring and Testing

**Playwright**
- End-to-end testing framework
- Version: 1.55.1
- Configuration: `playwright.config.ts`
- Screenshot/video capture for failures

**Socket.IO Client**
- Real-time testing and connection verification
- Browser and Node.js compatibility

### Security Dependencies

**Encryption**
- `crypto` (Node.js built-in): AES-256-GCM encryption
- Key derivation: SHA-256 hash of `ENCRYPTION_KEY`
- IV generation: Random 16 bytes per operation

**JWT**
- Library: Custom implementation using `crypto.sign`
- Secret: `JWT_SECRET_KEY` environment variable
- Expiration: Configurable per token type

**CORS and CSRF**
- Next.js built-in CORS handling
- CSRF protection for state-changing operations
- Origin validation for webhooks