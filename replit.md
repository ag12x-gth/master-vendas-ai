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

## Recent Changes (December 9, 2025 - Session 8)
1. **MIGRAÇÃO COMPLETA PARA BANCO LOCAL** - API externa removida:
   - Eliminada dependência de `voiceAIPlatform` (plataformai.global) de todos os endpoints
   - Todos os webhooks, calls, agents, e analytics agora usam banco de dados local
   - Tabelas usadas: `voiceCalls`, `voiceAgents`, `voiceDeliveryReports` via Drizzle ORM

2. **CORREÇÃO TwiML INBOUND** - Áudio bidirecional funcionando:
   - **Problema anterior**: TwiML usava `<Dial><Sip>` (incorreto para Retell)
   - **Solução**: Agora usa `<Connect><Stream url="wss://..." track="both_tracks">`
   - `track="both_tracks"`: Habilita áudio bidirecional (inbound + outbound)
   - Audio encoding: mulaw, sample_rate: 8000, audio_websocket_protocol: twilio

3. **Arquivos principais atualizados**:
   - `webhooks/retell/route.ts`: Atualiza voiceCalls via Drizzle
   - `webhooks/twilio/incoming/route.ts`: TwiML com `<Connect><Stream track="both_tracks">`
   - `calls/route.ts`, `agents/route.ts`, `analytics/route.ts`: Banco de dados local

4. **Configuração de inbound validada**:
   - Agente: "Assistente Inbound Brasil" (agent_c96d270a5cad5d4608bb72ee08)
   - Twilio Phone: +553322980007
   - Webhook URL: `https://{domain}/api/v1/voice/webhooks/twilio/incoming`