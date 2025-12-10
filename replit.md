# Master IA Oficial

## Overview
Master IA Oficial is a comprehensive control platform for WhatsApp/SMS bulk messaging, integrated with AI automation. It provides a centralized dashboard for multi-channel campaigns, CRM management, and AI-powered chatbots using the Meta WhatsApp Business API and Baileys. The platform offers an all-in-one solution for intelligent and automated communication, empowering businesses to engage with their customers effectively and at scale.

## User Preferences
Comunicação preferida: Linguagem simples e clara.

## System Architecture
The platform is built with **Next.js 14** (App Router) for the frontend, **Node.js 18+** with Express for the backend, and **PostgreSQL** (Neon) with `pgvector` for data persistence. **Socket.IO** facilitates real-time communication, **Redis** (Upstash) manages caching, and **BullMQ** handles message queues.

**Key Architectural Decisions:**
-   **Dual WhatsApp Strategy**: Supports both Meta API and Baileys local (QR code) for WhatsApp integration.
-   **AI Automation**: Leverages OpenAI with Retrieval-Augmented Generation (RAG) using a vector database.
-   **Campaign Management**: Features a custom system with built-in rate limiting and retry logic for message campaigns.
-   **Security**: Employs AES-256-GCM encryption and a multi-tenant architecture to ensure data isolation and protection.
-   **Webhooks**: Supports Meta webhooks with signature verification and custom webhooks with HMAC-SHA256.
-   **Kanban System**: Provides an interactive lead management system with drag-and-drop functionality.
-   **Analytics**: Includes a dashboard with real-time KPIs, graphs, and a sales funnel for performance monitoring.
-   **Voice AI**: Integrates Retell.ai for automated calls coupled with Twilio SIP Trunking.
-   **Authentication**: Implements OAuth 2.0 (Google/Facebook) via NextAuth.js.
-   **Email System**: Resend API for production-grade email delivery with webhooks for tracking.
-   **Deployment**: Real-time components are deployed on a Persistent VM.
-   **Admin Dashboard**: Features granular control over features and permissions for users and companies via a super-admin interface. This includes managing users, companies, feature access, email tracking events, and global analytics.

## External Dependencies
-   Meta/WhatsApp Business Platform (Graph API)
-   @whiskeysockets/baileys (WhatsApp integration)
-   Retell.ai (Voice AI platform)
-   Twilio (SIP Trunking)
-   OpenAI (GPT models)
-   PostgreSQL with pgvector (Vector database)
-   Neon (Hosted PostgreSQL)
-   AWS S3 & CloudFront (Media storage + CDN)
-   Google Cloud Storage (File storage)
-   Upstash (Redis for caching)
-   Resend (Email service with webhooks)