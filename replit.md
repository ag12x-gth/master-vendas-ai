# Master IA Oficial

## Overview
Master IA Oficial is a comprehensive WhatsApp and SMS mass messaging control panel with AI automation capabilities. It provides a centralized platform for managing multi-channel campaigns, customer service conversations, contact management (CRM), and AI-driven chatbots using Meta's WhatsApp Business API and Baileys. The project aims to be an all-in-one solution for automated, intelligent communication, offering an intuitive dashboard for businesses, including an AI-powered lead progression system and a Kanban lead management system.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The platform is built with a modern web stack, featuring **Next.js 14** (App Router) for the frontend, **Node.js 18+** with Express for the backend, and **PostgreSQL** (Neon) for data persistence, including `pgvector` for AI embeddings. **Socket.IO** enables real-time communication, while **Redis** (Upstash) handles caching and **BullMQ** manages message queues.

**Core Architectural Decisions include:**
- **Dual WhatsApp Connection Strategy**: Supports both Meta API and local Baileys (QR code) for WhatsApp integration.
- **AI Automation Engine**: Features persona-based AI with OpenAI, RAG via a vector database, and AI-powered lead progression.
- **Campaign Management**: Includes a custom queue, rate limiting, retry logic, dedicated Baileys mass campaign system, and automated cadence (drip campaign) with SMS duplication protection.
- **Security**: AES-256-GCM encryption for sensitive data and multi-tenant architecture ensuring data isolation.
- **Webhooks**: Meta Webhooks with signature verification and custom webhooks with HMAC SHA256 and exponential retry.
- **Kanban Lead Management System**: Provides an interactive board with CRUD and drag-and-drop functionalities.
- **Analytics Dashboard**: Offers real-time KPIs, time-series charts, and funnel visualization, including voice call analytics.
- **UI/UX**: Utilizes ShadCN UI for reusable components, server-side pagination, debounced search, and toast notifications. The application is designed as a Progressive Web App (PWA).
- **Performance Optimizations**: Achieved through caching, dynamic imports, Redis, PostgreSQL indexes, BullMQ, and API Cache Singleflight patterns.
- **Conversation Optimization**: Optimized loading of conversations and messages with pagination, infinite scroll, and parallel API calls.
- **Voice AI System**: Integrates Retell.ai for automated calls, with agents managed in a local database (`voice_agents`). It supports both inbound and outbound calls, with specific Twilio TwiML configurations for bidirectional audio streaming.
- **Authentication**: Production-ready OAuth 2.0 with Google and Facebook via NextAuth.js.
- **Deployment**: Configured for VM (Persistent) for real-time components and has a `/health` endpoint.

## External Dependencies
- **Meta/WhatsApp Business Platform**: Graph API for WhatsApp Cloud API.
- **Baileys WhatsApp Library**: `@whiskeysockets/baileys` for WhatsApp integration.
- **Retell.ai**: Voice AI platform for automated phone calls and voicemail detection.
- **Twilio**: For phone number provisioning and call routing, including specific caller ID verification.
- **OpenAI**: Provides GPT-3.5-turbo, GPT-4, and GPT-4o models via `@ai-sdk/openai`.
- **PostgreSQL with pgvector**: Used as a vector database for AI embeddings.
- **Neon**: Hosted PostgreSQL database.
- **AWS S3 & CloudFront**: For media storage and CDN.
- **Google Cloud Storage**: Alternative file storage.
- **Upstash**: Provides Redis for caching and message queuing.

## Recent Changes (December 9, 2025 - Session 10)
1. **INBOUND CALL WEBHOOK ATIVADO** ✅:
   - Webhook `/api/v1/voice/webhooks/twilio/incoming` recebe chamadas com sucesso
   - App registra chamada em `voiceCalls` table com status "initiated"
   - Retell API `register-phone-call` retorna `call_id` válido
   - TwiML com SIP URI é gerado corretamente: `sip:{call_id}@sip.retellai.com`
   - Twilio chama endpoint e webhook de status funcionando

2. **PROBLEMA RESTANTE - Agent Retell não aceita SIP inbound**:
   - ❌ Chamadas completam em 2-3s sem conectar ao agente
   - ⚠️ Agente Retell v5 tem `is_published: false` (versões anteriores têm `is_published: true`)
   - Causa: Agent não está configurado para aceitar conexões SIP inbound

3. **AÇÕES TOMADAS**:
   - ✅ Verificado que Retell API funciona (endpoint correto: `/list-agents`)
   - ✅ Identificado que há múltiplas versões do agente (v0-v5)
   - ✅ Versões publicadas (v0-v4) existem e estão ativas
   - ⚠️ Tentativa de atualizar v5 para published não funcionou via PATCH

4. **Webhooks Confirmados**:
   - ✅ "A call comes in": `/api/v1/voice/webhooks/twilio/incoming` (POST)
   - ✅ "Call status changes": `/api/v1/voice/webhooks/twilio/status` (POST)
   - ✅ Ambos no Twilio Console com URLs corretas

## Next Steps (Para Próxima Sessão)
1. **Dashboard Retell - Rollback (RECOMENDADO)**:
   - Acesse: https://dashboard.retell.ai
   - Agent: "Assistente Brasil" (ID: agent_c96d270a5cad5d4608bb72ee08)
   - Faça rollback de v5 para v4 (que está published)
   - Ou delete v5 e deixe v4 como ativa

2. **OU Autonomous Mode - Solução Completa**:
   - Criar novo agente completo com config correta desde o início
   - Usar endpoint de sincronização automática para manter sincronizado
   - Implementar versionamento de agentes

3. **Teste Final**:
   - Após agent estar published: ligar para +55 33 2298-0007
   - Esperar ouvir: "Olá! Bem-vindo ao Master IA..."
   - Verificar logs: `[Inbound] ✅ Call registered with Retell`

## Current Status
- **API Endpoints**: ✅ Todos funcionando (incoming webhook, status webhook, Retell integration)
- **Database**: ✅ Voice calls sendo registradas corretamente
- **TwiML**: ✅ SIP URI gerado e retornado corretamente
- **Agent Retell**: ⚠️ Não publicado/não aceita SIP inbound
- **Twilio**: ✅ Webhooks configurados e chamando corretamente

## Testing Credentials
- **Twilio Number**: +55 33 2298-0007
- **Test Phone**: +55 64 99952-6870 (seu celular)
- **Retell Dashboard**: https://dashboard.retell.ai
- **Twilio Console**: https://console.twilio.com
- **Agent ID**: agent_c96d270a5cad5d4608bb72ee08
- **Workspace ID**: org_JY55cp5S9pRJjrV

## Code Files Changed
- `src/app/api/v1/voice/webhooks/twilio/incoming/route.ts` - ✅ Endpoint funcional
- `src/app/api/v1/voice/webhooks/twilio/status/route.ts` - ✅ Endpoint funcional
- `src/lib/db/schema.ts` - ✅ Tables voiceCalls, voiceAgents estruturadas
