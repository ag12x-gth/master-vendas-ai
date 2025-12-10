# Master IA Oficial

## Overview
Master IA Oficial is a comprehensive control platform for WhatsApp/SMS bulk messaging, integrated with AI automation. It provides a centralized dashboard for multi-channel campaigns, CRM management, and AI-powered chatbots using the Meta WhatsApp Business API and Baileys. The platform offers an all-in-one solution for intelligent and automated communication, aiming to provide a powerful tool for businesses to engage with their customers effectively and at scale.

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

---

## 📋 IMPLEMENTAÇÃO: ADMIN DASHBOARD ABSOLUTO (Dec 10, 2025)

### ✅ **FASE 1: DIAGNÓSTICO & INVESTIGAÇÃO COMPLETA**

**Status**: ✅ **100% CONCLUÍDO**

**O que foi investigado**:
1. ✅ Schema do banco (50+ tabelas, roles existentes, estrutura multi-tenant)
2. ✅ Arquivo de autenticação (NextAuth config, Session/JWT)
3. ✅ Estrutura admin atual (2 admin sections, apenas superadmin acessa)
4. ✅ Endpoints existentes (auth, admin stubs)
5. ✅ Componentes admin (ai-dashboard, agents performance)
6. ✅ Sistema de features (NÃO EXISTE - precisa ser criado)
7. ✅ Sistema de permissions (NÃO EXISTE - precisa ser criado)

**Descobertas Críticas**:
- ❌ Não há sistema de features/permissions granular
- ❌ Não há controle de feature access por company
- ❌ Não há dashboard para gerenciar usuários/empresas
- ❌ FASE 3 (email_events) não está como feature controlável por admin
- ✅ Roles básicos existem: admin, atendente, superadmin
- ✅ Multi-tenant via companyId funciona bem
- ✅ NextAuth está bem configurado

---

## 🎯 **PLANO COMPLETO: 4 FASES DE IMPLEMENTAÇÃO**

### **ARQUITETURA PROPOSTA**

```
Master IA v2.4.2 - Admin Dashboard Absoluto
│
├── FASE 3 ANTERIOR (✅ Email Tracking)
│   ├── email_events table
│   ├── /api/webhooks/resend
│   └── Rastreamento de 7 eventos (sent, delivered, opened, etc)
│
├── FASE 1: Database Schema - Features & Permissions (PRÓXIMA)
│   ├── enum: featureEnum (11 features controláveis)
│   ├── table: features (id, key, name, description, isActive)
│   ├── table: company_feature_access (companyId, featureId, isActive, accessLevel)
│   ├── table: user_permissions (userId, featureId, permissionLevel)
│   └── table: admin_audit_logs (auditoria de ações)
│
├── FASE 2: Backend API Endpoints
│   ├── GET/POST/PUT/DELETE /api/v1/admin/users
│   ├── GET/POST/PUT/DELETE /api/v1/admin/companies
│   ├── GET/PUT /api/v1/admin/features
│   ├── POST/DELETE /api/v1/admin/permissions
│   ├── GET /api/v1/admin/email-events (FASE 3 como admin feature)
│   └── GET /api/v1/admin/analytics
│
├── FASE 3: Frontend Dashboard UI
│   ├── /super-admin/dashboard (overview com KPIs)
│   ├── /super-admin/users (CRUD de usuários)
│   ├── /super-admin/companies (CRUD de empresas)
│   ├── /super-admin/features (Controlar feature access por company)
│   ├── /super-admin/email-tracking (Rastreamento de emails)
│   └── /super-admin/analytics (KPIs globais)
│
└── FASE 4: Security & Validation
    ├── Middleware de autenticação
    ├── Validação de permissions em endpoints
    ├── Sistema de auditoria de ações
    ├── Testes end-to-end
    └── Documentação completa
```

---

## 📊 **FEATURES CONTROLÁVEIS**

```
1. CRM_BASIC          → Gestão básica de contatos
2. CRM_ADVANCED       → Com Kanban e pipeline
3. WHATSAPP_API       → Meta WhatsApp Business API
4. WHATSAPP_BAILEYS   → Local WhatsApp via QR code
5. SMS                → Envio de SMS via MKSMS
6. VOICE_AI           → Retell.ai com Twilio
7. EMAIL_SENDING      → Resend API para envio
8. EMAIL_TRACKING     → FASE 3 - Rastreamento de eventos
9. AI_AUTOMATION      → OpenAI + RAG integration
10. CAMPAIGNS         → Criação/gerenciamento de campanhas
11. ANALYTICS         → Dashboard com KPIs e relatórios
```

---

## 🔐 **FLUXO DE ACESSO E PERMISSÕES**

```
SUPER ADMIN (role = superadmin)
├── Acessa /super-admin/dashboard
├── Vê TODAS as companies
├── Vê TODOS os users
├── Controla feature access por company
├── Vê email_events de TODAS as companies
├── Vê analytics GLOBAIS
├── Pode criar/editar/deletar usuários
├── Pode criar/editar/deletar companies
├── Auditoria completa de ações
└── Acesso full ao sistema

ADMIN (role = admin) da Company
├── Acessa /dashboard (própria company)
├── Vê apenas SUA company
├── Vê features que sua company tem acesso
├── Pode adicionar usuarios na SUA company
├── Vê apenas analytics da PRÓPRIA company
├── NÃO acessa /super-admin
└── Sem acesso a email_events

ATENDENTE (role = atendente)
├── Acessa /dashboard
├── Vê features da company
├── Executa tarefas (enviar mensagens, etc)
├── NÃO gerencia usuários
└── NÃO acessa admin
```

---

## 📅 **FASES DE EXECUÇÃO E VALIDAÇÃO**

### **FASE 1: Database Schema**
**Tarefas**:
1. [ ] Criar enum `featureEnum` com 11 features
2. [ ] Criar table `features`
3. [ ] Criar table `company_feature_access`
4. [ ] Criar table `user_permissions`
5. [ ] Criar table `admin_audit_logs`
6. [ ] Executar `npm run db:push`
7. [ ] Validar com SQL queries no banco

**Evidências esperadas**:
- ✅ SQL query retornando todas as tabelas criadas
- ✅ Enum featureEnum definido no schema
- ✅ Relações entre tabelas funcionando
- ✅ Índices criados para performance

---

### **FASE 2: Backend API Endpoints**
**Tarefas**:
1. [ ] Criar `src/lib/admin-auth.ts` (middleware de segurança)
2. [ ] Criar `src/app/api/v1/admin/users/route.ts` (CRUD)
3. [ ] Criar `src/app/api/v1/admin/companies/route.ts` (CRUD)
4. [ ] Criar `src/app/api/v1/admin/features/route.ts` (GET/PUT)
5. [ ] Criar `src/app/api/v1/admin/permissions/route.ts` (POST/DELETE)
6. [ ] Criar `src/app/api/v1/admin/email-events/route.ts` (GET com filtros)
7. [ ] Criar `src/app/api/v1/admin/analytics/route.ts` (KPIs)

**Validações**:
- [ ] curl tests para cada endpoint
- [ ] Validar autenticação (apenas superadmin acessa)
- [ ] Validar rate limiting
- [ ] Verificar respostas de erro

**Evidências esperadas**:
- ✅ curl -X GET /api/v1/admin/users retorna lista de usuários
- ✅ curl -X POST /api/v1/admin/users cria novo usuário
- ✅ curl com token inválido retorna 401
- ✅ curl sem superadmin role retorna 403

---

### **FASE 3: Frontend Dashboard UI**
**Tarefas**:
1. [ ] Criar `/super-admin/dashboard` (overview)
2. [ ] Criar `/super-admin/users` (CRUD + tabela)
3. [ ] Criar `/super-admin/companies` (CRUD + tabela)
4. [ ] Criar `/super-admin/features` (Controle de access)
5. [ ] Criar `/super-admin/email-tracking` (Visualizar eventos)
6. [ ] Criar `/super-admin/analytics` (Gráficos + KPIs)
7. [ ] Componentes reutilizáveis (modals, forms, tables)

**Validações**:
- [ ] Login com diegomaninhu@gmail.com
- [ ] Acessar /super-admin/users (ver lista)
- [ ] Criar novo usuário
- [ ] Editar feature access de uma company
- [ ] Ver email_events rastreados

**Evidências esperadas**:
- ✅ Screenshot /super-admin/users com tabela de usuários
- ✅ Screenshot /super-admin/companies com tabela de empresas
- ✅ Screenshot /super-admin/features com seleção de features
- ✅ Screenshot /super-admin/email-tracking com eventos

---

### **FASE 4: Security & Validation**
**Tarefas**:
1. [ ] Implementar admin middleware
2. [ ] Validar permissions em cada endpoint
3. [ ] Criar sistema de auditoria
4. [ ] Testes E2E completos
5. [ ] Documentação de endpoints
6. [ ] Manual de uso do admin dashboard

**Validações**:
- [ ] Admin não consegue acessar /super-admin
- [ ] Atendente não consegue acessar /super-admin
- [ ] Actions são auditadas em admin_audit_logs
- [ ] Rate limiting funciona
- [ ] Encriptação de dados sensíveis

**Evidências esperadas**:
- ✅ admin_audit_logs com registros de ações
- ✅ SQL query mostrando tentativas negadas
- ✅ Testes passando

---

## 🔍 **EVIDÊNCIAS DE FUNCIONAMENTO REQUERIDAS**

Cada fase será validada com:

### **Database Phase**
```sql
-- Mostrar tabelas criadas
\dt features, company_feature_access, user_permissions

-- Mostrar enum
SELECT * FROM features;

-- Mostrar dados de teste
SELECT * FROM company_feature_access;
```

### **API Phase**
```bash
# Testar cada endpoint
curl -X GET \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/v1/admin/users

# Validar 401 sem token
curl -X GET http://localhost:5000/api/v1/admin/users

# Validar 403 sem superadmin
curl -X GET \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5000/api/v1/admin/users
```

### **Frontend Phase**
```
Screenshots de:
- /super-admin/dashboard (overview)
- /super-admin/users (list + create)
- /super-admin/companies (list + edit)
- /super-admin/features (access control)
- /super-admin/email-tracking (events viewer)
```

### **Security Phase**
```sql
-- Mostrar auditoria
SELECT action, user_id, resource, timestamp FROM admin_audit_logs LIMIT 10;

-- Verificar rate limits
SELECT count(*) FROM admin_audit_logs WHERE action = 'create_user' AND created_at > NOW() - INTERVAL '1 minute';
```

---

## 📝 **PRÓXIMOS PASSOS**

1. **Aprovação do Plano** → Usuário revisa e aprova arquitetura
2. **FASE 1 (DB)** → Criar tabelas, validar com SQL
3. **FASE 2 (API)** → Implementar endpoints, testar com curl
4. **FASE 3 (UI)** → Criar dashboard, testar no navegador
5. **FASE 4 (Security)** → Validar tudo, documentar

---

## 🚀 **ESTIMATIVA**

- **FASE 1 (DB)**: ~2-3 turns
- **FASE 2 (API)**: ~3-4 turns
- **FASE 3 (UI)**: ~4-5 turns
- **FASE 4 (Security)**: ~2-3 turns

**Total**: ~11-15 turns com validação completa em cada fase

---

## ✅ **CHECKLIST PRÉ-IMPLEMENTAÇÃO**

- [x] Diagnóstico completo realizado
- [x] Arquitetura definida e documentada
- [x] Plano dividido em 4 fases
- [x] Evidências de funcionamento definidas
- [x] Fluxo de acesso mapeado
- [x] Features controláveis listadas
- [ ] **Aguardando aprovação do usuário para iniciar FASE 1**

---

## Recent Changes - 3 FASES EMAIL ANTERIORES (Dec 10, 2025)

### ✅ **FASE 1: INFORMAR VALIDADE 24h NOS EMAILS**

Email de Verificação: Adicionado banner "⏰ Este link é válido por 24 horas"

**Arquivo**: `src/lib/email.ts`
**Status**: ✅ LIVE

---

### ✅ **FASE 2: REENVIO AUTOMÁTICO COM RATE LIMIT**

**Arquivo**: `src/app/api/auth/request-resend/route.ts`
**Rate limit**: 5 min entre reenvios, máx 5/dia
**Status**: ✅ FUNCIONAL

---

### ✅ **FASE 3: WEBHOOKS RESEND + RASTREAMENTO**

**Tabela**: `email_events`
**Endpoint**: `POST /api/webhooks/resend`
**Webhook ID**: 51d683b1-c3f2-4d4d-88f2-52ef52113cd3
**Eventos rastreados**: sent, delivered, opened, clicked, bounced, complained, delivery_delayed
**Status**: ✅ 100% OPERACIONAL COM EVIDÊNCIAS REAIS

---

## System Status Dashboard
| Component | Status | Notes |
|-----------|--------|-------|
| **Core Backend** | ✅ Running | Next.js + Node.js stable |
| **Email System** | ✅ Operational | Resend (noreply@masteria.app) |
| **WhatsApp API** | ✅ Configured | Meta API + Baileys ready |
| **Database** | ✅ PostgreSQL | Neon connection active |
| **Voice API** | ✅ Retell.ai | SIP Trunking configured |
| **AI/LLM** | ✅ OpenAI | GPT integration ready |
| **Auth** | ✅ NextAuth.js | OAuth2 configured |
| **Email Verification** | ✅ 24h tokens | Working |
| **Email Reenvio** | ✅ Auto-resend | Rate-limited |
| **Email Webhooks** | ✅ Registered | ID: 51d683b1... |
| **Frontend** | ✅ Vite React | Hot reload operational |
| **WebSockets** | ✅ Socket.IO | Real-time messaging ready |
| **Redis Cache** | ✅ Upstash | Connected |
| **Message Queue** | ✅ BullMQ | Operational |
| **Admin Dashboard** | ⏳ Em Planejamento | Plano completo pronto |
