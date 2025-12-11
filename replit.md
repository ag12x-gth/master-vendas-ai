# Master IA Oficial v2.4.2

## Overview
Master IA Oficial is a comprehensive platform for WhatsApp/SMS bulk messaging, integrated with AI automation. The new **Absolute Admin Dashboard** allows SuperAdmins to manage users, companies, and granular control over 11 system-wide features. The project aims to provide a robust, secure, and scalable solution for mass communication with advanced AI capabilities.

## User Preferences
Comunicação preferida: Linguagem simples e clara.

## System Architecture
Built with **Next.js 14** (App Router), **Node.js 18+**, **PostgreSQL** (Neon) with `pgvector`, **Socket.IO**, **Redis** (Upstash), **BullMQ`.

**Key Architectural Decisions:**
- **Dual WhatsApp Strategy**: Utilizes both Meta API and Baileys local (QR code) for flexible WhatsApp integration.
- **AI Automation**: Leverages OpenAI with RAG (Retrieval Augmented Generation) using a vector database for intelligent automation.
- **Campaign Management**: Includes rate limiting and retry logic to ensure reliable message delivery.
- **Security**: Implements AES-256-GCM encryption and a multi-tenant architecture for data isolation and protection.
- **Admin Dashboard**: Features a SuperAdmin interface with granular control over system features and user permissions.
- **Rate Limiting**: Employs an in-memory token bucket for API requests (100 req/min for GET, 50 req/min for mutations).
- **E2E Testing**: Utilizes Playwright for comprehensive end-to-end testing, covering both API and UI.
- **User Cleanup**: Designed for safe cascade deletion of users without breaking Foreign Key constraints.
- **UI/UX Decisions**: The Super-Admin dashboard includes dedicated pages for Dashboard, Users, Companies, Features, Email Tracking, and Analytics. Frontend components feature confirmation dialogs, loading states, and automatic list updates for user actions like deletion.
- **Technical Implementations**: Drizzle ORM is used for database interactions, with a focus on type-safe queries. API endpoints are protected with SuperAdmin validation and rate limiting.
- **Feature Specifications**: The system supports CRUD operations for users and companies, management of 11 core features, and email event tracking via Resend webhooks.

## External Dependencies
- Meta/WhatsApp Business Platform (Graph API)
- @whiskeysockets/baileys (WhatsApp integration)
- Retell.ai (Voice AI platform)
- Twilio (SIP Trunking)
- OpenAI (GPT models)
- PostgreSQL with pgvector
- Neon (Hosted PostgreSQL)
- AWS S3 & CloudFront
- Google Cloud Storage
- Upstash (Redis)
- Resend (Email service with webhooks)
- @playwright/test (E2E testing)