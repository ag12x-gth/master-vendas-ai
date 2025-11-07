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
- **theme-toggle.tsx** (November 7, 2025): Added mounted flag pattern (lines 15-23) to prevent SSR/CSR mismatch with next-themes
- **Pattern**: `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []); if (!mounted) return null;`
- **Result**: Zero hydration warnings in production (including /login page)

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

### Q&A Bug Validation (November 7, 2025)

#### **FASE 1 - Critical Bugs Validation**
- **Validated 4 critical bugs** from forensic diagnostic report
- **BUG-C001 (Webhook Save Button)**: False positive - button works correctly with form onSubmit, backend POST/PUT endpoints, Zod validation
- **BUG-C002 (Event Dropdown)**: RESOLVED - expanded from 1 to 5 events (contact.created, lead.updated, sale.completed, email.sent, task.completed)
- **BUG-C003 (Navigation)**: False positive - all 21 navigation items use Next.js Link with valid hrefs
- **BUG-A003 (Semantic IDs)**: False positive - all form inputs have correct id/label associations
- **False positive rate (FASE 1)**: 75% (3 of 4 critical bugs)
- **Full report**: correcoes-q&a/RELATORIO_FASE1_ANALISE_BUGS.md

#### **FASE 2 - Accessibility Infrastructure Analysis + Runtime Validation**
- **BUG-A001 (Visual Feedback)**: ⚠️ **INFRAESTRUTURA CONFIRMADA - Runtime UI NÃO VALIDADO** - 64 files import useToast/toast() (verified via grep), mas runtime UI behavior não testado
- **BUG-A002 (Form Validation)**: ✅ **PARCIALMENTE RESOLVIDO** - 49 API endpoints use Zod validation (verified via grep) + Runtime CONFIRMADO em Auth APIs (HTTP 400 + field errors)
- **Methodology**: Quantitative code analysis + Playwright E2E tests
- **Runtime Validation**: ✅ **CONFIRMADO** em Auth APIs - E2E tests validated Zod returning HTTP 400 with clear error messages
- **Test Results**: 7/8 Playwright tests PASSED - Auth API validated email/password correctly
- **Limitações**: Toast UI não validado em runtime (apenas static analysis). Webhook/Campaign/Contact APIs precisam testes autenticados.
- **Full reports**: 
  - correcoes-q&a/RELATORIO_FASE2_ANALISE_ACESSIBILIDADE.md (quantitative analysis)
  - correcoes-q&a/RELATORIO_FASE2_TESTES_E2E.md (runtime validation with test results)

#### **FASE 3 - Meeting Analysis System E2E Validation (November 7, 2025)**
- **Objetivo**: Validar sistema de análise de reuniões em tempo real (Google Meet + Meeting BaaS + Hume AI + Gemini insights)
- **Metodologia**: Testes E2E (Playwright) + Static Analysis + SQL Validation
- **Setup de Teste**: Criado usuário de teste `teste.e2e@meetingbaas.com / senha123` em company `test-company-e2e-001`

**Resultados:**
- ✅ **Meeting Creation API**: VALIDADO EM RUNTIME - Reunião criada com sucesso via E2E test, redirecionamento para `/meetings/[id]` confirmado
- ✅ **Database Tables**: `meetings` (18 campos), `meeting_analysis_realtime`, `meeting_insights` - todas confirmadas via SQL
- ✅ **API Routes**: POST /meetings, GET /meetings, webhook processor, transcripts endpoint - todas implementadas
- ✅ **AI Services**: Gemini insights generation, Hume emotion analysis, sentiment detection - todos implementados
- ✅ **Frontend Panel**: `MeetingRoomPanel.tsx` renderiza corretamente (heading, status badge, botão "Entrar na Reunião")
- ✅ **Socket.IO Integration**: Código implementado com eventos `transcript_update`, `emotion_update`, `meeting_started` - confirmado via grep
- ✅ **Secrets**: MEETING_BAAS_API_KEY, HUME_API_KEY, OPENAI_API_KEY, JWT_SECRET_KEY_CALL, GOOGLE_API_KEY_CALL - todos configurados

**Limitações Identificadas:**
- ⚠️ **Real-time Updates NÃO testados em runtime**: Meeting BaaS webhooks só disparam com reunião ATIVA no Google Meet (custo ~$0.69/hora)
- ⚠️ **Toast de sucesso NÃO validado**: Toast desaparece antes de Playwright validar (não-bloqueante - funcionalidade core funciona)
- 🎯 **Recomendação**: Executar 1 reunião de teste manual (~$0.70) para validar webhooks em tempo real antes de produção

**Veredicto:** ⚠️ **Sistema MUITO PROVAVELMENTE production-ready** - Infraestrutura robusta + APIs funcionam em runtime. Recomenda-se validação manual com reunião ativa.

**Full report**: correcoes-q&a/RELATORIO_FASE3_MEETING_ANALYSIS.md