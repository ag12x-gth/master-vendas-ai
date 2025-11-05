# Master IA Oficial - Project Setup Documentation

## Overview
Master IA Oficial is a comprehensive Next.js application for managing WhatsApp and SMS campaigns, customer service, and AI automation. It aims to streamline communication, enhance customer engagement, and leverage AI for operational efficiency, targeting significant market potential in AI-powered communication with a scalable, compliant, and feature-rich solution.

## User Preferences
- Language: Portuguese (based on codebase content)
- Framework: Next.js with App Router
- UI: ShadCN UI components with Tailwind CSS
- Database: Drizzle ORM with PostgreSQL

## System Architecture
The application is built on Next.js 14.2.33 with TypeScript, utilizing an App Router for both frontend and backend API Routes.

**UI/UX Decisions:**
- Uses ShadCN UI components and Tailwind CSS for a responsive, mobile-friendly design with intelligent truncation, adaptable elements, and consistent styling.

**Technical Implementations:**
- **Frontend:** Next.js 14.2.33, TypeScript, Tailwind CSS, ShadCN UI.
- **Backend:** Next.js API Routes, Drizzle ORM.
- **AI Integration:** Supports Google Generative AI (`gemini-1.5-flash`) and OpenAI ChatGPT (`gpt-4o-mini`) for various AI tasks and WhatsApp auto-responses. **AI auto-responses exclude group conversations** - only individual chats receive automated responses. **Personalized AI Agents:** Each conversation can be assigned a custom AI persona from the `/agentes-ia` library, allowing per-conversation agent selection with unique system prompts, temperature, and token limits. The system validates multi-tenant security by ensuring personas belong to the correct company. **RAG System with Auto-Parsing:** AI agents support modular prompt sections via RAG (Retrieval Augmented Generation) architecture. When creating or editing agents with RAG enabled, the system automatically parses traditional prompts into semantic sections using GPT-4o-mini, with heuristic fallback. Features include 10 req/min rate limiting per company, atomic transactions, and content preservation.
- **WhatsApp API Strategy:** Integrates Meta Official API for compliance and scalability, alongside Baileys (`@whiskeysockets/baileys`) for WhatsApp Web multi-device protocol with filesystem-based authentication. A global singleton pattern manages sessions.
- **Voice AI Integration:** Vapi AI for voice call escalation from WhatsApp, leveraging traditional telephony (Twilio/Telnyx) and AI assistants.
- **Performance Optimization:** Features an enhanced caching system with disk persistence.
- **Real-time Meeting Analysis:** Integrates Meeting BaaS for Google Meet bot participation, Hume AI for emotion/sentiment analysis, and a multi-modal AI for real-time insights delivered via Socket.IO to the Closer's UI.
- **QR Code Modal Resilience:** SSE stream with client disconnect detection, auto-cleanup, 5-minute timeout, and automatic reconnection (up to 3 attempts).

**Feature Specifications:**
- Landing page and authentication.
- Dashboard with analytics (including Vapi metrics).
- WhatsApp/SMS campaign management.
- Contact Management (CRM) with multi-conversation detection.
- AI integration framework.
- Kanban boards for lead management.
- Template management and media gallery.
- Dedicated Voice Calls page with history, analytics, and bulk campaign functionality.
- Visual indicators for contacts with multiple active conversations across different connections.

**System Design Choices:**
- **Development Environment:** Configured for Replit, runs on port 5000.
- **Database:** Neon PostgreSQL with tables for `vapi_calls`, `vapi_transcripts`, `meetings`, `meeting_analysis_realtime`, `meeting_insights`, `connections`, `contacts`, `conversations`, `messages`.
- **Deployment:** Configured for autoscale deployment.
- **Security & Compliance:** Emphasizes GDPR/LGPD compliance, explicit consent, data minimization, end-to-end encryption, RBAC, encryption at rest/in transit, regular audits, and HMAC authentication for Vapi webhooks.
- **Auto-Recovery System:** Automated port conflict resolution, health monitoring, and auto-fix capabilities ensure high availability.

## External Dependencies
- **Database:** PostgreSQL (Neon-backed)
- **Cache:** Redis (mocked for development, external for production)
- **Cloud Storage:** AWS S3 (Replit Object Storage alternative)
- **Authentication/Analytics:** Firebase (optional)
- **AI Services:**
    - Google Generative AI (`gemini-1.5-flash`)
    - OpenAI ChatGPT (`gpt-4o-mini`)
    - Hume AI (emotion detection for meeting analysis)
- **Messaging APIs:**
    - Meta/Facebook (WhatsApp Official API)
    - Baileys (`@whiskeysockets/baileys`)
- **Voice AI:** Vapi AI (integrates with Twilio/Telnyx for traditional voice calls)
- **Meeting Analysis:** Meeting BaaS (bot for Google Meet participation)
- **Version Control:** GitHub