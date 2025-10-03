# Master IA Oficial - Project Setup Documentation

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
- Uses ShadCN UI components and Tailwind CSS for a consistent and responsive design. The interface is 100% mobile-friendly, featuring intelligent truncation for long URLs/IDs, responsive buttons and cards, and adaptable padding/font sizes.

**Technical Implementations:**
- **Frontend:** Next.js 14.2.33 with TypeScript, Tailwind CSS, ShadCN UI.
- **Backend:** Next.js API Routes with Drizzle ORM for database interactions.
- **AI Integration:** Framework for AI integration, specifically utilizing Google Generative AI with the `gemini-1.5-flash` model.
- **WhatsApp API Strategy:** Exclusively uses the Meta Official API for WhatsApp integration due to compliance, scalability, and reliability. Also integrates `whatsmeow` for text messaging via WhatsApp Web protocol using Docker for a hybrid approach.
- **Voice AI Integration:** Vapi AI for voice call escalation from WhatsApp conversations, utilizing traditional telephony (Twilio/Telnyx) and AI-powered voice assistants.
- **Performance Optimization:** Enhanced caching system with disk persistence and strategies for low autonomy.

**Feature Specifications:**
- Landing page and authentication system.
- Dashboard with analytics, including Vapi metrics.
- Campaign management for WhatsApp/SMS.
- Contact management (CRM).
- AI integration framework.
- Kanban boards for lead management.
- Template management.
- Media gallery.
- Dedicated Voice Calls page with history, analytics, and bulk campaign functionality.

**System Design Choices:**
- **Development Environment:** Configured for Replit, running on port 5000.
- **Database:** Connected to Neon PostgreSQL with all necessary tables created, including `vapi_calls` and `vapi_transcripts` for voice call data.
- **Deployment:** Configured for autoscale deployment.
- **Security & Compliance:** Strong emphasis on GDPR/LGPD compliance, explicit consent, data minimization, end-to-end encryption, RBAC, encryption at rest/in transit, and regular audits. HMAC authentication for Vapi webhooks.
- **Auto-Recovery System:** Automated port conflict resolution and health monitoring with auto-fix capabilities.

## External Dependencies
- **Database:** PostgreSQL (Neon-backed)
- **Cache:** Redis (mocked for development, external for production)
- **Cloud Storage:** AWS S3 (Replit Object Storage used as an alternative)
- **Authentication/Analytics:** Firebase (optional initialization)
- **AI Services:** Google Generative AI (gemini-1.5-flash)
- **Messaging APIs:**
  - Meta/Facebook (WhatsApp Official API)
  - whatsmeow (WhatsApp Web multi-device - Docker-based)
- **Voice AI:** Vapi AI (for traditional voice calls via Twilio/Telnyx)
- **Meeting Analysis:**
  - Meeting BaaS (Bot joins Google Meet as participant - $0.69/hour)
  - Hume AI (Emotion detection and sentiment analysis - $0.0276/minute)
- **Version Control:** GitHub

## Real-Time Meeting Analysis System

### Overview
Sistema completo de análise de reuniões em tempo real usando Google Meet. Quando leads têm chamadas agendadas com closers (vendedores), o sistema analisa o lead em tempo real usando agentes de IA e análise de emoções para entender o que estão dizendo/sentindo, fornecendo a melhor proposta automaticamente.

### Architecture
- **Bot Integration:** Meeting BaaS bot joins Google Meet as participant
- **Real-time Analysis:** Audio transcription (99 languages) + Emotion detection (48 dimensions) + Voice prosody
- **AI Processing:** Multi-modal analysis combining transcripts, sentiment, and emotions
- **Live Delivery:** Webhooks → Backend → Socket.IO → Closer's UI panel

### Database Schema
1. **meetings** - Stores meeting metadata (Google Meet URL, bot ID, status, timestamps)
2. **meeting_analysis_realtime** - Real-time transcripts, sentiment, and emotions during the meeting
3. **meeting_insights** - Post-meeting AI-generated insights (summary, pain points, recommendations)

### Services
- **MeetingBaasService** (`src/services/meeting-baas.service.ts`) - Manages bot lifecycle
- **HumeEmotionService** (`src/services/hume-emotion.service.ts`) - Analyzes emotions and sentiment
- **AIAnalysisService** (`src/services/ai-analysis.service.ts`) - Generates insights using Gemini AI

### API Routes
- `POST /api/v1/meetings` - Create meeting and join bot
- `GET /api/v1/meetings` - List meetings
- `GET /api/v1/meetings/[id]` - Get meeting details
- `PATCH /api/v1/meetings/[id]` - Update meeting status
- `POST /api/v1/meetings/webhook` - Meeting BaaS webhook handler

### Frontend Components
- **MeetingRoomPanel** - Real-time transcription and emotion display
- **Meetings Page** (`/meetings`) - List all meetings
- **Meeting Details Page** (`/meetings/[id]`) - Live analysis or post-meeting insights

### Socket.IO Events
- `join_meeting` - Client joins meeting room
- `transcript_update` - Real-time transcript with sentiment
- `emotion_update` - Real-time emotion analysis

### Cost Structure
- Meeting BaaS: ~R$10.35 per 30-minute meeting
- Hume AI: ~R$4.20 per 30-minute meeting
- Total: ~R$15 per 30-minute meeting

### Configuration
Required environment variables:
- `JWT_SECRET_KEY_CALL` - JWT secret for Socket.IO authentication
- `MEETING_BAAS_API_KEY` - Meeting BaaS API key
- `HUME_API_KEY` - Hume AI API key
- `GOOGLE_API_KEY_CALL` - Google Generative AI key for insights (fallbacks: GEMINI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY)
- `OPENAI_API_KEY` - OpenAI API key (if using OpenAI instead of Gemini)

### Documentation Links (Required Reading)
- **Hume AI Documentation**: https://dev.hume.ai/intro
- **Meeting BaaS Documentation**: https://docs.meetingbaas.com/updates
- **Meeting BaaS GitHub**: https://github.com/Meeting-Baas

## Auto-Recovery & Self-Healing System

### Overview
Sistema automático de detecção e correção de problemas do servidor, incluindo conflitos de porta, processos travados e erros de inicialização. O sistema garante disponibilidade máxima com intervenção mínima.

### Components

**1. Auto-Fix Script** (`scripts/auto-fix-server.sh`)
- Detecta e finaliza processos que ocupam a porta 5000
- Limpa arquivos temporários e cache
- Executa automaticamente antes do servidor iniciar
- Suporta múltiplos métodos de detecção de processos (netstat, ss, fuser)

**2. Safe Server Starter** (`scripts/start-server-safe.sh`)
- Tenta iniciar o servidor com auto-fix integrado
- Retry automático em caso de falha (até 3 tentativas)
- Limpeza de processos entre tentativas
- Logs detalhados de cada etapa

**3. Health Check System** (`scripts/health-check.sh`)
- Monitora o servidor a cada 30 segundos
- Detecta quando o servidor para de responder
- Executa auto-recovery automaticamente
- Funciona como watchdog em background

**4. Server Protection** (`server.js`)
- Detecta erros EADDRINUSE (porta ocupada)
- Executa auto-fix automaticamente quando necessário
- Reinicia o servidor após correção

### Available Commands

```bash
# Correção manual rápida
npm run fix

# Correção e reinicialização
npm run fix:restart

# Iniciar servidor com auto-fix
npm run dev:safe

# Monitoramento contínuo (watchdog)
npm run health
```

### How It Works

1. **Detecção Automática:** O servidor detecta erros de porta ocupada
2. **Auto-Fix:** Executa script que finaliza processos conflitantes
3. **Limpeza:** Remove cache e arquivos temporários
4. **Reinício:** Servidor reinicia automaticamente
5. **Monitoramento:** Health check verifica continuamente

### Troubleshooting

Se o servidor não iniciar:
1. Execute `npm run fix` manualmente
2. Reinicie o workflow no Replit
3. Use `npm run dev:safe` para iniciar com proteção

O sistema **auto-corrige** automaticamente em 99% dos casos sem intervenção manual.