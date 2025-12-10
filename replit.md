# Master IA Oficial v2.4.2

## Overview
Master IA Oficial é uma plataforma completa de controle para mensagens em massa WhatsApp/SMS, integrada com automação IA. O novo **Admin Dashboard Absoluto** permite que SuperAdmins gerenciem usuários, empresas e controle granular de 11 features sistema-wide.

## User Preferences
Comunicação preferida: Linguagem simples e clara.

## System Architecture
Built with **Next.js 14** (App Router), **Node.js 18+**, **PostgreSQL** (Neon) with `pgvector`, **Socket.IO**, **Redis** (Upstash), **BullMQ**.

**Key Architectural Decisions:**
- **Dual WhatsApp Strategy**: Meta API + Baileys local (QR code)
- **AI Automation**: OpenAI com RAG usando vector database
- **Campaign Management**: Rate limiting + retry logic
- **Security**: AES-256-GCM encryption + multi-tenant architecture
- **Webhooks**: Meta + custom HMAC-SHA256
- **Kanban System**: Interactive lead management
- **Analytics**: Real-time KPIs + graphs + sales funnel
- **Voice AI**: Retell.ai + Twilio SIP Trunking
- **Authentication**: OAuth 2.0 (Google/Facebook) via NextAuth.js
- **Email System**: Resend API com webhooks
- **Admin Dashboard**: SuperAdmin interface com controle granular de features + permissions

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

---

## ✅ **FASE 1: DATABASE SCHEMA (COMPLETA)**

**Status**: ✅ Implementado com sucesso

- ✅ Enum `featureEnum` com 11 features (CRM_BASIC, CRM_ADVANCED, WHATSAPP_API, WHATSAPP_BAILEYS, SMS, VOICE_AI, EMAIL_SENDING, EMAIL_TRACKING, AI_AUTOMATION, CAMPAIGNS, ANALYTICS)
- ✅ Tabela `features` (id, name, key, description, isActive)
- ✅ Tabela `company_feature_access` (id, companyId, featureId, isActive, accessLevel)
- ✅ Tabela `user_permissions` (id, userId, featureId, accessLevel, expiresAt)
- ✅ Tabela `admin_audit_logs` (id, userId, action, resource, resourceId, metadata, createdAt)
- ✅ Inserção de 11 features em `features` table
- ✅ Schema sincronizado com Drizzle ORM

---

## ✅ **FASE 2: BACKEND API ENDPOINTS (100% COMPLETA)**

**Status**: ✅ **6 Endpoints Implementados + Autenticação + Auditoria**

### Arquivos Criados:
```
src/lib/admin-auth.ts
src/app/api/v1/admin/users/route.ts
src/app/api/v1/admin/companies/route.ts
src/app/api/v1/admin/features/route.ts
src/app/api/v1/admin/email-events/route.ts
src/app/api/v1/admin/analytics/route.ts
```

### Endpoints Implementados:

#### 1. **Users Management** (`/api/v1/admin/users`)
- ✅ `GET` - List users (com pagination, search, limit/offset)
- ✅ `POST` - Create novo usuário (password hash com bcryptjs)
- ✅ `PUT` - Update usuário (name, email, role)
- ✅ `DELETE` - Delete usuário (com proteção para não deletar a si mesmo)

#### 2. **Companies Management** (`/api/v1/admin/companies`)
- ✅ `GET` - List companies (com pagination, search)
- ✅ `POST` - Create nova company (name, website, addressCity)
- ✅ `PUT` - Update company
- ✅ `DELETE` - Delete company

#### 3. **Features Control** (`/api/v1/admin/features`)
- ✅ `GET` - List all 11 features
- ✅ `PUT` - Ativar/desativar feature por company (isActive, accessLevel)

#### 4. **Email Events** (`/api/v1/admin/email-events`)
- ✅ `GET` - List email events (com filtros: companyId, eventType, pagination)

#### 5. **Analytics** (`/api/v1/admin/analytics`)
- ✅ `GET` - Global KPIs:
  - Total users
  - Total companies
  - Total emails sent
  - Email events by type (últimos 30 dias)
  - Most used features

### Segurança Implementada:
- ✅ Middleware `requireSuperAdmin()` em TODOS endpoints
- ✅ Validação Zod em POST/PUT
- ✅ Logging automático em `admin_audit_logs` para cada ação
- ✅ Error handling: 401 (sem auth), 403 (sem superadmin), 400 (validação), 404 (not found)
- ✅ Password hashing com bcryptjs em create user
- ✅ TypeScript type safety com z.ZodError handling

### Dados Retornados:
- ✅ Users: id, name, email, role, companyId, createdAt
- ✅ Companies: id, name, website, addressCity, createdAt
- ✅ Features: id, name, key, description, isActive
- ✅ Email Events: recipient, subject, eventType, companyId, createdAt
- ✅ Analytics: totalUsers, totalCompanies, totalEmails, emailEventsByType[], mostUsedFeatures[]

---

## ✅ **FASE 3: FRONTEND DASHBOARD UI (100% COMPLETA)**

**Status**: ✅ **7 Páginas React Implementadas + Layout + Navegação**

### Arquivos Criados:
```
src/app/super-admin/layout.tsx         (Sidebar + Navigation)
src/app/super-admin/page.tsx            (Dashboard Overview)
src/app/super-admin/users/page.tsx      (Users CRUD)
src/app/super-admin/companies/page.tsx  (Companies List)
src/app/super-admin/features/page.tsx   (Features Selector)
src/app/super-admin/email-tracking/page.tsx  (Email Events)
src/app/super-admin/analytics/page.tsx  (Analytics Dashboard)
```

### Layout (`/super-admin/layout.tsx`)
- ✅ Sidebar com 6 links de navegação
- ✅ Session validation (redirect se não superadmin)
- ✅ useSession() hook integration
- ✅ Responsive layout com main content area

### Dashboard (`/super-admin/page.tsx`)
- ✅ 3 KPI Cards: Total Users, Total Companies, Total Emails
- ✅ Email Events by Type table
- ✅ Most Used Features list
- ✅ Fetch from `/api/v1/admin/analytics`
- ✅ Loading states

### Users Page (`/super-admin/users/page.tsx`)
- ✅ Tabela de usuários (Name, Email, Role, Actions)
- ✅ Botão "New User" com form modal
- ✅ Delete com confirmação
- ✅ Paginação
- ✅ API integration: GET `/api/v1/admin/users`, DELETE user

### Companies Page (`/super-admin/companies/page.tsx`)
- ✅ Tabela de companies (Name, Website, City)
- ✅ API integration: GET `/api/v1/admin/companies`
- ✅ Hover effects

### Features Page (`/super-admin/features/page.tsx`)
- ✅ Grid de 11 features com cards
- ✅ Checkbox para ativar/desativar
- ✅ API integration: GET `/api/v1/admin/features`

### Email Tracking (`/super-admin/email-tracking/page.tsx`)
- ✅ Tabela de email events (Recipient, Subject, Event Type, Date)
- ✅ API integration: GET `/api/v1/admin/email-events`
- ✅ Event type badges

### Analytics (`/super-admin/analytics/page.tsx`)
- ✅ KPI cards com borders coloridos (Total Users, Companies, Emails)
- ✅ Email Event Distribution com progress bars
- ✅ Most Used Features ranking
- ✅ API integration: GET `/api/v1/admin/analytics`

### UI/UX Features:
- ✅ Tailwind CSS styling
- ✅ Responsive design
- ✅ Loading states
- ✅ Error handling
- ✅ Tables com hover effects
- ✅ Cards com shadows
- ✅ Status badges (colored)
- ✅ Progress bars para visualização

---

## ⏳ **FASE 4: SECURITY & TESTS (Próxima Etapa)**

**Status**: Planejado para implementação
- [ ] Rate limiting (100 req/min por IP)
- [ ] Testes E2E com Playwright
- [ ] Middleware global para validação de permissions
- [ ] Documentação de API endpoints (Swagger/OpenAPI)
- [ ] Manual de uso admin dashboard
- [ ] Validação de cascade deletes
- [ ] CSRF protection

---

## 🚀 **Como Usar o Admin Dashboard**

### Login
1. Acessar `https://masteria.app/login`
2. Email: `diegomaninhu@gmail.com`
3. Senha: `MasterIA2025!`
4. Role deve ser `superadmin`

### Navegar
- Dashboard: `/super-admin` (KPIs overview)
- Users: `/super-admin/users` (CRUD usuários)
- Companies: `/super-admin/companies` (Ver empresas)
- Features: `/super-admin/features` (Controlar features por company)
- Email Tracking: `/super-admin/email-tracking` (Ver eventos de email)
- Analytics: `/super-admin/analytics` (Gráficos e KPIs)

### Funcionalidades
- **Create User**: Click "New User" → preencher form → submit
- **Delete User**: Click "Delete" → confirm → usuário removido
- **Toggle Features**: Click checkbox → feature ativada/desativada
- **View Analytics**: Dashboard mostra KPIs em tempo real

---

## 📊 **Status de Implementação**

| Fase | Componentes | Status | Arquivos |
|------|-----------|--------|----------|
| 1 | Database Schema | ✅ Completo | 4 tabelas + enum |
| 2 | Backend API | ✅ Completo | 6 endpoints |
| 3 | Frontend UI | ✅ Completo | 7 páginas |
| 4 | Security/Tests | ⏳ Planejado | - |

---

## 🔐 **Segurança Implementada**

- ✅ NextAuth.js integration
- ✅ SuperAdmin role verification em todos endpoints
- ✅ Zod validation para POST/PUT requests
- ✅ Password hashing com bcryptjs
- ✅ Audit logging em `admin_audit_logs`
- ✅ Error handling (401, 403, 400, 404)
- ✅ TypeScript type safety
- ⏳ Rate limiting (próximo)
- ⏳ CSRF protection (próximo)

---

## 📝 **Notas Técnicas**

- Next.js 14 App Router
- Drizzle ORM com PostgreSQL
- NextAuth.js para autenticação
- Zod para validação
- Tailwind CSS para styling
- React hooks (useState, useEffect, useSession)
- Fetch API para chamadas HTTP
- Multi-tenant architecture (isolação por companyId)

---

## 🎯 **Próximos Passos (FASE 4)**

1. Implementar rate limiting nos endpoints
2. Criar testes E2E com Playwright
3. Adicionar middleware global para validação
4. Documentar endpoints com Swagger
5. Implementar CSRF protection
6. Testar cascade deletes
7. Deploy para produção

---

**Última atualização**: 10 de Dezembro de 2025 (FASE 2 + FASE 3 completas)
