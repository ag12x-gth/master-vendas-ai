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
- **Messaging APIs:** Meta/Facebook (WhatsApp Official API)
- **Version Control:** GitHub
---------------------
Conversa no chat sobre a solicitação - Base rep