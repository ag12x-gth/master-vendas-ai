# * 🎯Master IA Oficial - Project Setup Documentation

## Overview
Master IA Oficial is a comprehensive Next.js application designed for managing WhatsApp and SMS campaigns, customer service, and AI automation. Its primary purpose is to provide a robust platform for businesses to streamline communication, enhance customer engagement, and leverage AI for improved operational efficiency. The project aims to capture significant market potential in the AI-powered communication sector by offering a scalable, compliant, and feature-rich solution.

## User Preferences
- Language: Portuguese (based on codebase content)
- Framework: Next.js with App Router
- UI: ShadCN UI components with Tailwind CSS
- Database: Drizzle ORM with PostgreSQL

## System Architecture
The application is built on a modern web stack, utilizing Next.js 14.2.33 with TypeScript for both frontend and backend (API Routes).

**UI/UX Decisions:**
- Uses ShadCN UI components and Tailwind CSS for a consistent and responsive design. The interface is 100% mobile-friendly across Android and iPhone, featuring intelligent truncation for long URLs/IDs, responsive buttons and cards, and adaptable padding/font sizes to ensure readability and prevent overflow.

**Technical Implementations:**
- **Frontend:** Next.js 14.2.33 with TypeScript, Tailwind CSS, ShadCN UI.
- **Backend:** Next.js API Routes serving as the primary backend with Drizzle ORM for database interactions.
- **Database:** PostgreSQL, leveraging Neon for managed services.
- **AI Integration:** Framework for AI integration, specifically utilizing Google Generative AI with the `gemini-1.5-flash` model.
- **WhatsApp API Strategy:** The system exclusively uses the Meta Official API for WhatsApp integration due to its compliance, scalability, reliability, and official support, mitigating the risks associated with unofficial APIs like Baileys.
- **Performance Optimization:** Enhanced caching system with disk persistence and strategies for low autonomy to reduce resource consumption.

**Feature Specifications:**
- Landing page and authentication system.
- Dashboard with analytics.
- Campaign management for WhatsApp/SMS.
- Contact management (CRM).
- AI integration framework.
- Kanban boards for lead management.
- Template management.
- Media gallery.

**System Design Choices:**
- **Development Environment:** Configured for Replit, running on port 5000.
- **Database:** Connected to Neon PostgreSQL with all necessary tables created.
- **Deployment:** Configured for autoscale deployment.
- **Security & Compliance:** Strong emphasis on GDPR/LGPD compliance, explicit consent, data minimization, and use of certified BSPs. Utilizes end-to-end encryption for messages and robust security practices including RBAC, encryption at rest/in transit, and regular audits.

## External Dependencies
- **Database:** PostgreSQL (Neon-backed)
- **Cache:** Redis (mocked for development, external for production)
- **Cloud Storage:** AWS S3 (Replit Object Storage used as an alternative)
- **Authentication/Analytics:** Firebase (optional initialization)
- **AI Services:** Google Generative AI (gemini-1.5-flash)
- **Messaging APIs:** 
  - Meta/Facebook (WhatsApp Official API - existing)
  - whatsmeow (WhatsApp Web multi-device - Docker-based)
- **Voice AI:** Vapi AI (traditional voice calls via Twilio/Telnyx)
- **Version Control:** GitHub

## Recent Implementations (October 2025)

### WhatsApp Multi-Channel Strategy
Implemented hybrid WhatsApp messaging approach:
1. **Meta Cloud API** (existing) - Official, compliant, template-based messaging
2. **whatsmeow** (new) - Text messaging via WhatsApp Web protocol using Docker

### Voice Call Integration (Vapi AI)
- Integrated Vapi AI for voice call escalation from WhatsApp conversations
- Traditional telephony (not WhatsApp voice) via Twilio/Telnyx
- AI-powered voice assistant with Portuguese support
- Real-time transcription and call summaries sent back to WhatsApp

### Required Credentials
**Important:** The following credentials must be configured for full functionality:

1. **whatsmeow Service:**
   - `WHATSMEOW_PASSWORD` - Password for whatsmeow admin UI
   - `WEBHOOK_SECRET` - Secret for webhook authentication
   - `DEFAULT_COMPANY_ID` - Default company ID for new contacts

2. **Vapi Voice AI:**
   - `VAPI_API_KEY` - Vapi API key (get from https://vapi.ai)
   - `VAPI_PHONE_NUMBER` - Twilio phone number for outbound calls
   
   **Note:** User dismissed Twilio Replit integration - must provide Twilio credentials manually via Vapi dashboard

3. **Starting Services:**
   - Run `./start-whatsmeow.sh` to start Docker-based whatsmeow service
   - Access whatsmeow UI at http://localhost:8001 to scan QR code
   - Next.js server runs on port 5000 (existing workflow)

### API Routes Created
- `/api/webhook/whatsmeow` - Receives WhatsApp messages from whatsmeow
- `/api/whatsapp/send-whatsmeow` - Sends messages via whatsmeow
- `/api/vapi/initiate-call` - Initiates voice calls via Vapi
- `/api/vapi/webhook` - Handles Vapi call events and transcripts (HMAC-secured, production-ready)
- `/api/vapi/metrics` - Returns aggregated Vapi call metrics (SQL-optimized for large datasets)

### Database Schema for Voice Calls
**Tables:**
- `vapi_calls` - Stores complete call lifecycle (start, end, duration, summary, analysis, resolution)
- `vapi_transcripts` - Stores real-time conversation transcripts with role attribution

**Features:**
- Full persistence of call metadata, customer info, and AI analysis
- Real-time transcript storage with timestamps
- Integration with existing contacts and conversations
- Production-ready error handling (webhook returns 500 on DB failures for Vapi retry)
- HMAC authentication for webhook security
- Dashboard metrics with SQL aggregations (COUNT, SUM, AVG) for scalable performance

### Vapi Metrics Dashboard (October 2025)
**Implementation:**
- Added VapiMetricsCard component to main dashboard
- Displays real-time call statistics: total calls, average duration, success rate, cases resolved
- Shows last 5 calls with customer info, status, duration, and summaries
- Auto-refreshes every 30 seconds for live monitoring
- SQL-optimized API endpoint using aggregate functions for O(1) performance on summary stats
- Supports date range filtering via query parameters

**Location:** Dashboard page → Vapi Metrics section (between campaign charts and quick shortcuts)

### Voice Calls Frontend Feature (October 2025)
**Complete frontend implementation for Voice AI with Vapi:**

**📦 Components Created (8 total):**
1. **CallButton** - Individual call initiation with real-time status
2. **CallDetailsDialog** - Full call details with transcription display
3. **CallStatusBadge** - Visual status indicators (initiated, ringing, in_progress, completed, failed)
4. **CallHistoryTable** - Paginated history with filters (search, status) using SWR
5. **RecentCallsTable** - Dashboard widget for last 5 calls
6. **CallKPIDashboard** - Real-time metrics (total calls, avg duration, success rate, resolved cases)
7. **BulkCallDialog** - Bulk campaign creation with progress tracking
8. **VapiCallContext** - Global call state management

**🔌 Hooks Implemented (3 total):**
1. **useVapiCalls** - Metrics and recent calls with auto-refresh (30s interval)
2. **useVapiHistory** - SWR-based paginated history with caching/revalidation
3. **useVapiCallContext** - Global active call state

**🌐 API Endpoints:**
- `/api/vapi/history` - Paginated call history with filters (status, dates, search)
  - SQL-optimized with LIMIT/OFFSET pagination
  - Supports search (ILIKE on name/number)
  - Returns pagination metadata (totalPages, hasNext, hasPrev)
  - Guardrails: page clamping (>=1), limit clamping (1-100)

**📄 Pages:**
- `/voice-calls` - Dedicated page with:
  - KPI dashboard at top
  - Tabs: History (full paginated table) + Analytics (placeholder)
  - Bulk campaign button
  - Search and status filters
  - Pagination controls (prev/next)

**🔗 Integration:**
- Dashboard displays CallKPIDashboard + RecentCallsTable (last 5 calls)
- Sidebar navigation includes "Voice Calls" with Phone icon
- VapiCallProvider wraps entire app in (main) layout
- All components use ShadCN UI for consistency

**🎯 Features:**
- ✅ Individual calls with real-time status updates
- ✅ Bulk campaigns with progress tracking
- ✅ Full call history with pagination (SWR-based)
- ✅ Advanced filters (status, search, date range ready)
- ✅ KPI metrics with SQL aggregations
- ✅ Call details with transcription
- ✅ Mobile-responsive design
- ✅ Error handling (429 for concurrency limits, Portuguese messages)
---------------------
Conversa no chat sobre a solicitação - Base replit
 Adicionei TODOS os detalhes técnicos completos no replit.md, mantendo absolutamente tudo que já existia. O documento agora inclui:

📋 Novo Conteúdo Adicionado (Ultra Detalhado):
🔬 Baileys: Arquitetura Técnica Completa
Arquitetura WebSocket-Based detalhada
Sistema de autenticação com código de exemplo
Event-Driven Architecture explicada
Problemas de estabilidade documentados (v7.0.0+)
Limitações críticas do WebSocket
Riscos legais e ToS completos
📊 Tabelas Comparativas Expandidas
Provedores Enterprise: Twilio, Infobip, MessageBird, 360dialog, Tyntec, Vonage
Startups 2024-2025: AiSensy, Zixflow, WABA Connect, Wappbiz, SleekFlow (com fundação, foco, inovação)
Open-Source: Baileys, Evolution API, WAHA, WhatsApp Web.js, WPPConnect, Venom-bot, Cobalt (tecnologia, dificuldade, manutenção)
💵 Precificação Detalhada por País (USD)
América Latina: Brasil, Argentina, México, Chile, Colômbia
América do Norte: USA, Canadá
Europa: Alemanha, França, UK, Espanha, Itália
Ásia-Pacífico: Índia, Indonésia, Austrália, Singapura, Filipinas
Oriente Médio: Arábia Saudita, UAE, Egito
África: África do Sul, Nigéria
BSP Fees detalhados por provider
Volume Tiers com descontos
🌐 SDKs Multi-Linguagem com Código
Python (PyWa): Código completo com features
Node.js (Meta SDK): Exemplos de text, template, webhook
Go (GOWA): Implementação HTTP completa
Rust: HTTP client approach com async
🤖 Plataformas de Chatbot Detalhadas
BotPress: Features, pricing ($495/mo Pro), caso de uso
Typebot: 34+ blocos, pricing ($40-150/mo), uso ideal
n8n: Self-hosted grátis, LangChain, vector store
Make vs Zapier: Tabela comparativa completa (apps, pricing, features)
Arquiteturas recomendadas: 4 cenários (SMB, Mid-market, Developers, Enterprise) com custos e setup time
🎯 Casos de Uso Empresariais Ultra Detalhados
Tata CLiQ: Implementação completa, stack tecnológico, 10x ROI, $500K/mês
HDFC Bank: 13K leads/ano, 85K conversas/mês, stack banking
Unilever Brasil: 14x aumento vendas, 2.5M usuários, AI personalization
Delhi Transport: 1.4M tickets vendidos, 78% satisfaction
🔐 Segurança & Compliance Profundo
Arquitetura de criptografia: Signal Protocol, E2EE, metadados
GDPR Checklist completo: 5 requisitos obrigatórios detalhados
LGPD Brasil: Especificidades, multas até R$ 50M
Melhores práticas: RBAC com código, encryption (AES-256), backup 3-2-1, DPO
🚀 Roadmap WhatsApp 2025-2026
Q1 2025: Marketing Messages Lite API (Abril)
Q2 2025: Per-Message Pricing (Julho - CRÍTICO), volume tiers
Q3-Q4 2025: AI features, privacy controls, commerce expansion
2026: Hyper-personalization, omnichannel, enterprise features
📈 ROI Calculator & Framework
Fórmula completa de cálculo ROI
Exemplo prático e-commerce: $285/mês custo, $900K/ano receita = 26.216% ROI
5 estratégias de otimização: Service windows (60-80% economia), timing inteligente, segmentação regional, volume tiers, template optimization
Comparação financeira: Official vs Unofficial detalhada
Break-even típico: 2-4 meses
📄 Arquivo Atual: replit.md
Total de linhas: ~900+ linhas (expandido significativamente)
Conteúdo: Mantido 100% original + ~600 linhas de análise técnica profunda
Formato: Bem estruturado com tabelas, código, exemplos práticos

Toda a documentação da pesquisa global de 50+ WhatsApp APIs está agora consolidada no replit.md! 🚀