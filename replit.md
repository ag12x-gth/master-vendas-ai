# Master IA Oficial

## Overview

Master IA Oficial is a comprehensive WhatsApp and SMS mass messaging control panel with AI automation capabilities. The platform enables businesses to manage multi-channel campaigns, customer service conversations, and AI-powered chatbots through an intuitive dashboard. Its core purpose is to provide a centralized platform for managing WhatsApp/SMS campaigns, customer conversations, contact management (CRM), and AI-driven customer service automation using Meta's WhatsApp Business API and Baileys library. The project's ambition is to offer an all-in-one solution for automated, intelligent communication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack

**Frontend**
- Framework: Next.js 14 (App Router)
- UI Components: React with ShadCN UI library (Radix UI primitives)
- Styling: Tailwind CSS
- State Management: React hooks with real-time Socket.IO integration
- Type Safety: TypeScript

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
- WhatsApp Templates v2: Complete message template management system with Meta Cloud API v21.0 integration.

### Core Architectural Decisions

**1. Dual WhatsApp Connection Strategy**
- Supports both official Meta API and local WhatsApp connections (Baileys for QR code sessions) for flexibility.

**2. Real-time Communication Architecture**
- Socket.IO integration for instant updates on conversations, campaign status, and AI responses.

**3. AI Personas and Automation Engine**
- Persona-based architecture with provider abstraction (OpenAI, Google Gemini) for multiple AI providers.
- Uses a vector database for RAG (Retrieval-Augmented Generation) capabilities.

**4. Campaign Queue Management**
- Custom queue system with rate limiting and retry logic to process messages efficiently.

**5. Encryption Strategy**
- AES-256-GCM encryption with an environment-based key for sensitive data at rest.

**6. Multi-tenant Architecture**
- Company-based tenant model with user relationships for data isolation.

**7. Webhook System**
- Meta Webhooks for asynchronous message processing and automation triggers with signature verification.

**8. Data Flow Patterns**
- **Incoming WhatsApp Message:** Processed via Meta webhook, stored, and routed through the automation engine and AI personas.
- **Campaign Execution:** Managed by a queue processor with rate limiting and real-time status updates via Socket.IO.

**9. Performance Considerations**
- **Caching Strategy:** Custom "Replit Enhanced Cache" for API responses.
- **Database Optimization:** Indexed columns and connection pooling.
- **Frontend Optimization:** Route-based code splitting, lazy loading for dashboard widgets, and tree-shaken components.

## External Dependencies

### Third-Party APIs

**Meta/WhatsApp Business Platform**
- Graph API v23.0 for WhatsApp Cloud API.

**Baileys WhatsApp Library**
- @whiskeysockets/baileys 7.0.0-rc.6 for QR code-based WhatsApp sessions.

### AI/ML Services

**OpenAI**
- Models: GPT-3.5-turbo, GPT-4 via `@ai-sdk/openai`.

**Google Generative AI**
- Model: Gemini Pro via `@ai-sdk/google`, `@google/generative-ai`.

**Vector Database (pgvector)**
- PostgreSQL with pgvector extension for RAG.

### Cloud Services

**AWS Services**
- S3: Media file storage.
- CloudFront: CDN for media delivery.
- SES v2: Email notifications and verification.

**Google Cloud Storage**
- Alternative to S3 for file storage.

### Infrastructure

**PostgreSQL (Neon)**
- Hosted database provider.

**Firebase (Optional)**
- App Hosting and Secret Manager.

**Replit Deployment**
- Development environment.

### Monitoring and Testing

**Playwright**
- End-to-end testing framework.

**Socket.IO Client**
- For real-time testing.

## Recent Corrections (November 2025)

### Hydration Fixes
- **contact-table.tsx**: Added mounted flag pattern (lines 270-278) to prevent SSR/CSR mismatch
- **team-table.tsx**: Added mounted flag pattern (lines 244-251) to prevent SSR/CSR mismatch
- **templates-v2/page.tsx**: Added mounted flag pattern (lines 113-120) to prevent SSR/CSR mismatch
- **Pattern**: `const [mounted, setMounted] = useState(false); const isMobile = mounted ? useIsMobile() : false;`
- **Result**: Zero hydration warnings in production

### Baileys Duplicate Message Fix
- **baileys-session-manager.ts line 321**: Added `onConflictDoNothing({ target: [messages.providerMessageId] })`
- **Problem**: Duplicate messages from WhatsApp reconnections caused DrizzleQueryError
- **Solution**: Silently ignore duplicate messages with same provider_message_id
- **Result**: Zero duplicate key constraint violations

### Bundle Optimization Validated
- **Recharts**: Already optimized with dynamic imports (4.2MB-4.3MB per chunk, lazy loaded)
- **Firebase**: Code split into app (432K) + analytics (680K) chunks
- **VAPI Voice**: Lazy loaded only in MeetingRoomPanel (1.2M)
- **Result**: Main bundle optimized, heavy dependencies isolated

### WhatsApp Media Domains
- **Configured domains**: mmg.whatsapp.net, pps.whatsapp.net, media.whatsapp.net
- **Wildcard pattern**: **.whatsapp.net for future-proofing
- **Result**: Complete image/sticker/audio/video support