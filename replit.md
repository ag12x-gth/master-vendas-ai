# Master IA Oficial - Plataforma de Bulk Messaging com Automação AI

## Overview

The "Master IA Oficial" project is a robust bulk messaging platform with integrated AI automation, designed to streamline communication and marketing efforts. Its primary purpose is to enable businesses to send automated messages, particularly via WhatsApp, triggered by various events such as "purchase approved" or "lead created." The platform aims to enhance delivery rates, provide real-time analytics, and ensure high scalability for processing a large volume of events and users. Key capabilities include flexible webhook parsing, message templating, an advanced queueing system, real-time metrics dashboards, and historical data synchronization. The project is positioned to significantly improve customer engagement and operational efficiency through intelligent automation and reliable messaging delivery.

## User Preferences

I want iterative development. Ask before making major changes. I prefer detailed explanations.

## System Architecture

The system is built on a modern, scalable architecture designed for high performance and reliability.

### UI/UX Decisions
-   **Dashboard:** Real-time metrics dashboard using Recharts for visualizations and consolidated campaign aggregation.
-   **Styling:** Utilizes TailwindCSS and Radix UI for a consistent and responsive design.
-   **Webhooks Manager:** Comprehensive interface for managing webhooks (list, add, edit, delete, activate/deactivate) with modal and table components.

### Technical Implementations
-   **Real-time Communication:** Implements WebSockets (Socket.io) for instant updates on campaign reports and delivery statuses, replacing traditional polling methods for lower latency (<100ms).
-   **WhatsApp Integration:** Uses Baileys for WhatsApp messaging, including automatic session restoration and validation of WhatsApp numbers before sending to improve delivery rates (from 50% to ~90%).
-   **Automation Engine:** Triggers WhatsApp notifications (both plain text and Meta Templates) conditionally based on active automation rules.
-   **Queue System:** Leverages BullMQ with Redis for job queuing and scheduling, handling tasks like automatic synchronization and ensuring retries with exponential backoff.
-   **Webhook Processing:** Flexible parsing of incoming webhooks, supporting both flat and nested JSON structures, ensuring 100% preservation of original payload data.
-   **Debugging:** Conditional debug logging controlled by an environment variable (`DEBUG=false` by default) to minimize log pollution in production.
-   **Singleton Pattern:** SessionManager uses `Symbol.for()` for robust singleton implementation.

### Feature Specifications
-   **Webhook Parser:** Processes incoming webhooks from sources like Grapfy.
-   **Message Template:** Supports templated messages for consistent communication.
-   **Webhook Automation:** Automated actions triggered by webhook events.
-   **Queue System:** Manages message sending and other asynchronous tasks.
-   **WhatsApp Integration:** Connects with WhatsApp for message delivery.
-   **HMAC Signature:** Ensures security and authenticity of webhooks.
-   **Deadletter Queue:** Handles failed events for later inspection.
-   **Metrics Dashboard:** Provides real-time insights into system performance and campaign effectiveness.
-   **Event Replay:** Allows re-processing of past events.
-   **Analytics Charts:** Visual representation of key performance indicators.
-   **PIX Automation:** Specific automation flows for PIX transactions.
-   **Historical Sync:** Synchronizes historical data automatically.
-   **Automatic Scheduler:** Automates tasks like data synchronization every 6 hours via BullMQ.
-   **Data Export:** Allows exporting data in CSV and JSON formats with filtering capabilities.
-   **Scalability:** Optimized for handling 100k+ events/day and 1000+ concurrent users with efficient indexing and query performance (<10ms).

### System Design Choices
-   **Database:** PostgreSQL with Drizzle ORM. Utilizes multiple indexes (e.g., `idx_incoming_events_company_id`, `idx_incoming_events_created_at`, `idx_webhook_payload_eventid` using GIN) for optimal query performance on large datasets.
-   **Data Integrity:** Ensures complete preservation of all incoming webhook payload data in a `JSONB` column.
-   **Error Handling:** Implements mechanisms to prevent system blockage due to foreign key constraints in notifications and handles `MaxListenersExceededWarning`.

## External Dependencies

-   **Backend Framework:** Node.js 20 + Next.js 14
-   **Database:** PostgreSQL (managed via Drizzle ORM)
-   **Queue & Cache:** BullMQ, Redis (Upstash)
-   **Messaging APIs:** Meta WhatsApp API, Baileys (WhatsApp library)
-   **Third-party Integrations:** Grapfy API
-   **Frontend Libraries:** React 18, TypeScript, Recharts, TailwindCSS, Radix UI