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

### Baileys Mass Campaign System (Nov 11, 2025)
**Complete end-to-end implementation for direct message campaigns without templates**

1. **UI Components**
   - Route: `/campaigns-baileys` - Dedicated page for Baileys campaigns
   - Component: `CreateBaileysCampaignDialog` - 4-step wizard (Info → Message → Audience → Review)
   - Component: `BaileysCampaignTable` - Filters template-less campaigns (`templateId === null`)
   - Features: Numeric variables ({{1}}, {{2}}), message preview, scheduling, connection validation
   - Menu: Added "Campanhas Baileys" under WhatsApp section in sidebar
   - Separation: Clean isolation from Meta API campaigns to prevent confusion

2. **Backend API**
   - Endpoint: `POST /api/v1/campaigns/baileys`
   - Payload: `{ name, connectionId, messageText, variableMappings, contactListIds, schedule? }`
   - Validations: Connection ownership + Baileys type enforcement, contact list ownership, non-empty lists
   - Storage: Stores campaigns with `message` field populated, `templateId` as null
   - Queue: Enqueues to `whatsapp_campaign_queue` (same as Meta API) for unified processing

3. **Dual-Path Campaign Sender**
   - File: `src/lib/campaign-sender.ts`
   - Guard: `if (!templateId && !message) throw error` prevents invalid campaigns
   - Path A (Template-based): Existing flow for Meta API + legacy Baileys with templates
   - Path B (Direct message): Pseudo-template approach for Baileys template-less campaigns
   - Pseudo-template: `{ name: 'direct_message', language: 'und', bodyText: campaign.message, hasMedia: false }`
   - Runtime guard: Baileys campaigns cannot have `mediaAssetId` (enforced at API + sender levels)
   - Variable substitution: Reuses existing logic in `sendViaBaileys()` - no code changes needed

4. **Architecture Highlights**
   - Zero changes to `sendViaBaileys()` or `sendViaMetaApi()` - only wrapper modified
   - Backward compatible: Template-based campaigns (Meta API + Baileys) work unchanged
   - Early connection detection: Fetches connection before template resolution for type-aware branching
   - Delivery reports: Both paths create `whatsapp_delivery_reports` records identically

### Previous Baileys Messaging Improvements
1. **Individual Message Sending**
   - Route: `/whatsapp-baileys` - Single message sending (not campaigns)
   - Endpoint: `POST /api/v1/whatsapp-baileys/send`
   - Use case: Quick one-off messages without campaign orchestration

2. **Enhanced SessionManager Diagnostics**
   - New method: `checkAvailability(connectionId, companyId?)` returns availability status with details
   - Enhanced logging in `getSession()`: warns when session not found with available session list
   - Comprehensive logging in `sendMessage()`: attempt, validation, JID conversion, success/failure with full context
   - Visual indicators: ✅ (success), ❌ (error), ⚠️ (warning) for quick log parsing

### Technical Debt & Future Improvements

#### Integration Test Gap (Priority: Medium)
**Status**: Current tests (20/20 passing) validate routing patterns but don't call `sendWhatsappCampaign`

**Missing Coverage:**
- End-to-end test calling `sendWhatsappCampaign` with full fixtures
- Mock harness for database (Drizzle), SessionManager, and Meta API
- Validation that media blocking actually prevents Baileys+media campaigns
- Template resolution integration with both legacy and v2 schemas

**Proposed Solution:**
```typescript
// Future test structure
describe('sendWhatsappCampaign - Integration', () => {
  beforeEach(() => {
    // Seed minimal campaign with Drizzle mock adapter
    // Stub db.select/update/insert responses
    // Mock sessionManager with test doubles
    // Mock sendWhatsappTemplateMessage
  });
  
  it('should route Baileys campaign to SessionManager', async () => {
    const campaign = createBaileysTestCampaign();
    await sendWhatsappCampaign(campaign);
    expect(sessionManager.sendMessage).toHaveBeenCalled();
    expect(sendWhatsappTemplateMessage).not.toHaveBeenCalled();
  });
  
  it('should block Baileys campaign with media', async () => {
    const campaign = createBaileysMediaCampaign();
    await expect(sendWhatsappCampaign(campaign)).rejects.toThrow('mídia não são suportadas');
  });
});
```

**Acceptance Criteria:**
- Tests call actual `sendWhatsappCampaign` function
- Mocks cover database queries, SessionManager, Meta API
- Tests fail if routing logic regresses
- Coverage includes media blocking, template resolution, delivery reports

**Risk**: Low (production traffic validates both paths daily)

**Next Steps**: Schedule for next test improvement cycle after Baileys campaign UI is complete.