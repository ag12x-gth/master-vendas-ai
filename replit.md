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
   - Webhook `/api/v1/voice/webhooks/twilio/incoming` está FUNCIONANDO
   - Twilio chama o webhook com sucesso quando número +55 33 2298-0007 recebe ligação
   - App registra chamada em `voiceCalls` table com status "initiated"
   - Retell API `register-phone-call` retorna `call_id` válido
   - TwiML com SIP URI é gerado corretamente: `sip:{call_id}@sip.retellai.com`

2. **PROBLEMA ATUAL - Rejeição SIP em 2-3 segundos**:
   - ❌ Chamadas recebem status "completed" em 2-3s sem conectar ao agente de voz
   - ❌ Ouvinte recebe mensagem "número não pode receber essa chamada" do Twilio
   - **Causa provável**: Agente Retell `agent_c96d270a5cad5d4608bb72ee08` não está configurado para aceitar inbound via SIP

3. **DIAGNÓSTICO - Stack Funcionando**:
   - ✅ Twilio recebendo ligações
   - ✅ Webhook incoming disparando corretamente
   - ✅ Banco de dados registrando chamadas (voiceCalls)
   - ✅ Retell API respondendo e criando call_ids
   - ✅ TwiML SIP URI sendo retornado
   - ⏳ **FALTA**: Agente Retell estar PUBLISHED e aceitar inbound SIP

4. **Webhooks Configurados**:
   - ✅ "A call comes in": `/api/v1/voice/webhooks/twilio/incoming` (POST)
   - ✅ "Call status changes": `/api/v1/voice/webhooks/twilio/status` (POST)
   - Ambos no Twilio Console confirmados

## Next Steps (TODO)
1. **SOLUÇÃO 1 - Dashboard Retell (Rápido)**:
   - Acesse: https://dashboard.retell.ai
   - Procure agente "Assistente Inbound Brasil"
   - Verifique se Status = "Published"
   - Confirme se Voice, System Prompt, e LLM estão configurados
   - Se não, recrie o agente

2. **SOLUÇÃO 2 - Recriar Agente Retell via Código**:
   - Criar endpoint `/api/v1/voice/agents/sync` que:
     - Busca agente inbound do banco local
     - Cria novo agent no Retell com config completa
     - Atualiza `retell_agent_id` no banco local
     - Sincroniza voice_id, system_prompt, first_message
   - Este endpoint será mais robusto para sincronização contínua

3. **TESTE FINAL**:
   - Após agente Retell estar PUBLISHED
   - Ligar para +55 33 2298-0007
   - Esperar ouvir: "Olá! Bem-vindo ao Master IA..."
   - Verificar logs: `[Inbound] ✅ Call registered with Retell - Routing to SIP URI`

## Current Agent Configuration
- **DB Agent**: Assistente Inbound Brasil (type=inbound, status=active)
- **Retell Agent ID**: agent_c96d270a5cad5d4608bb72ee08
- **System Prompt**: "Você é um assistente de vendas profissional brasileiro..."
- **First Message**: "Olá! Em que posso ajudar você hoje?"
- **Voice**: pt-BR-FranciscaNeural (Azure)
- **LLM Model**: gpt-4-turbo

## Testing Credentials
- **Twilio Number**: +55 33 2298-0007
- **Test Phone**: +55 64 99952-6870 (final 6870)
- **Dashboard**: https://dashboard.retell.ai
- **Twilio Console**: https://console.twilio.com

## Code Files Changed
- `src/app/api/v1/voice/webhooks/twilio/incoming/route.ts` - ✅ Endpoint funcional
- `src/app/api/v1/voice/webhooks/twilio/status/route.ts` - ✅ Endpoint funcional
- `src/lib/db/schema.ts` - ✅ Tables voiceCalls, voiceAgents estruturadas
- New: `src/app/api/v1/voice/agents/sync/route.ts` - Para sincronização automática (próxima sessão)
