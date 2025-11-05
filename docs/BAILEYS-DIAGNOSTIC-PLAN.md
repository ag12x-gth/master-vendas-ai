# 📊 Diagnóstico e Plano de Implementação - Baileys Multi-Instância WhatsApp

**Data**: 04 de Novembro de 2025  
**Biblioteca**: Baileys v7.0.0-rc.6 (WhiskeySockets)  
**Objetivo**: Implementar multi-instância WhatsApp com sessões isoladas

---

## 📋 Índice

1. [Análise do Cenário Atual](#análise-do-cenário-atual)
2. [Diagnóstico da API Baileys](#diagnóstico-da-api-baileys)
3. [Arquitetura Proposta](#arquitetura-proposta)
4. [Plano de Implementação](#plano-de-implementação)
5. [Schema do Banco de Dados](#schema-do-banco-de-dados)
6. [Código de Referência](#código-de-referência)
7. [Cronograma](#cronograma)

---

## 🔍 Análise do Cenário Atual

### Sistema Existente

Analisando as imagens fornecidas e o codebase atual:

**✅ Interface Existente (Imagens)**:
- Página "Sessões WhatsApp" com lista de sessões
- Modal "Criar Nova Sessão WhatsApp" (ID + Nome da Sessão)
- Modal "WhatsApp Integration" com QR Code para escaneamento
- Estados de sessão: "Conectada" e "Desconectada"
- Botões: "Conectar", "Reconectar", "Deletar"

**⚙️ Stack Atual**:
- **Backend**: Next.js API Routes (TypeScript)
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **Frontend**: React + ShadCN UI
- **WhatsApp Atual**: whatsmeow (Go via Docker) + Meta Official API

**🔴 Limitações do Setup Atual**:
- whatsmeow é em Go (requer Docker, mais complexo)
- Duas integrações diferentes (whatsmeow + Meta API)
- Falta de unificação e controle centralizado
- Complexidade de manutenção (Go + TypeScript)

---

## 📊 Diagnóstico da API Baileys

### Informações Técnicas

**Biblioteca**: `@whiskeysockets/baileys`  
**Versão Atual**: v7.0.0-rc.6 (Nov 2025)  
**GitHub**: https://github.com/WhiskeySockets/Baileys  
**Documentação**: https://baileys.wiki

### Características Principais

#### ✅ Vantagens

| Característica | Detalhes |
|----------------|----------|
| **Linguagem** | TypeScript/JavaScript nativo (sem Docker) |
| **Protocolo** | WebSocket direto para `web.whatsapp.com` |
| **Multi-Device** | Suporta protocolo MD do WhatsApp (2021+) |
| **Memória** | ~50-80MB por instância vs 300-600MB (Puppeteer) |
| **Autenticação** | QR Code OU Pairing Code (sem QR) |
| **Event-Driven** | Socket extends EventEmitter |
| **Type-Safe** | Definições TypeScript completas |
| **Stateless** | Você controla o storage completamente |

#### ⚠️ Limitações e Considerações

| Aspecto | Detalhes |
|---------|----------|
| **Compliance** | Não oficial - pode violar ToS do WhatsApp |
| **Uso Recomendado** | Automação pessoal, bots internos, CRM |
| **⚠️ NÃO usar para** | Spam, bulk messaging comercial não autorizado |
| **Reconnect** | Não automático - precisa implementar manualmente |
| **Auth Storage** | `useMultiFileAuthState` é DEMO - usar DB em produção |
| **Escalabilidade** | 50-100 instâncias por servidor (RAM/CPU) |

### Comparação: Baileys vs Alternativas

| Recurso | Baileys | whatsmeow | Meta API (WABA) |
|---------|---------|-----------|-----------------|
| **Linguagem** | TypeScript | Go | REST API |
| **Instalação** | npm install | Docker | Cloud |
| **Custo** | Grátis | Grátis | Pago (conversas) |
| **Multi-Device** | ✅ Sim | ✅ Sim | ✅ Sim |
| **Compliance** | ⚠️ Não oficial | ⚠️ Não oficial | ✅ Oficial |
| **RAM/Instância** | 50-80MB | 30-50MB | N/A (cloud) |
| **Webhooks** | Manual | Manual | Automático |
| **Templates** | ❌ Não | ❌ Não | ✅ Sim |
| **Business Features** | ❌ Limitado | ❌ Limitado | ✅ Completo |
| **Setup Complexity** | Baixa | Média (Docker) | Alta (aprovação) |

**📌 Recomendação**: 
- **Baileys**: Perfeito para automação interna, CRM, suporte
- **Meta API**: Obrigatório para mensagens em massa comerciais aprovadas

---

## 🏗️ Arquitetura Proposta

### Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js/React)                  │
│  - Página Sessões WhatsApp                                   │
│  - CRUD de sessões (criar, conectar, desconectar, deletar)   │
│  - Exibição de QR Code via SSE (Server-Sent Events)          │
│  - Estados em tempo real (conectado/desconectado)            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTP/REST + SSE
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Next.js API Routes)                    │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Session Manager Service                              │  │
│  │  - Map<sessionId, WASocket>                           │  │
│  │  - createSession()                                     │  │
│  │  - deleteSession()                                     │  │
│  │  - reconnectSession()                                  │  │
│  │  - getSessionStatus()                                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  API Routes                                            │  │
│  │  - POST /api/v1/whatsapp/sessions (create)            │  │
│  │  - GET  /api/v1/whatsapp/sessions (list)              │  │
│  │  - GET  /api/v1/whatsapp/sessions/[id]/qr (SSE)       │  │
│  │  - POST /api/v1/whatsapp/sessions/[id]/connect        │  │
│  │  - DELETE /api/v1/whatsapp/sessions/[id]              │  │
│  │  - POST /api/v1/whatsapp/send (send message)          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Event Handlers                                        │  │
│  │  - connection.update → DB update                       │  │
│  │  - messages.upsert → Save to DB + AI processing       │  │
│  │  - creds.update → Save auth state                      │  │
│  │  - qr → Send to frontend via SSE                       │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Drizzle ORM
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL + Neon)                    │
│                                                               │
│  Tables:                                                      │
│  - whatsapp_sessions (id, company_id, name, status, etc)     │
│  - whatsapp_auth_state (session_id, creds, keys)             │
│  - whatsapp_messages (session_id, message_id, content, etc)  │
│  - whatsapp_contacts (session_id, phone, name, etc)          │
└─────────────────────────────────────────────────────────────┘
                   │
                   │ Real-time sync
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                  WhatsApp Web (Meta Servers)                 │
│  - Multi-device protocol                                     │
│  - WebSocket connection                                      │
│  - QR Code authentication                                    │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

#### 1. Criar Nova Sessão

```
User → [Criar Sessão] → POST /api/v1/whatsapp/sessions
  ↓
Session Manager cria nova instância Baileys
  ↓
Gera QR Code e envia via SSE → Frontend exibe QR
  ↓
User escaneia QR com WhatsApp
  ↓
Baileys recebe auth → Salva no DB → Status: "connected"
```

#### 2. Receber Mensagem

```
WhatsApp Web → Baileys Socket (messages.upsert event)
  ↓
Event Handler processa mensagem
  ↓
Salva no DB (whatsapp_messages)
  ↓
Envia para AI Automation Engine
  ↓
Gera resposta automática (se configurado)
  ↓
Envia de volta via Baileys
```

#### 3. Enviar Mensagem

```
User/AI → POST /api/v1/whatsapp/send
  ↓
Session Manager pega socket da sessão
  ↓
socket.sendMessage(jid, { text: 'Hello' })
  ↓
Salva no DB → Retorna messageId
```

---

## 🚀 Plano de Implementação

### Fase 1: Setup e Infraestrutura (2-3 horas)

#### Task 1.1: Instalar Baileys e Dependências
```bash
npm install @whiskeysockets/baileys
npm install qrcode-terminal  # Para debug
npm install --save-dev @types/node
```

#### Task 1.2: Criar Schema do Banco de Dados
- Adicionar tabelas ao `src/lib/db/schema.ts`
- Executar migrations com `npm run db:push`

**Tabelas necessárias**:
1. `whatsapp_sessions` - Sessões ativas
2. `whatsapp_auth_state` - Estado de autenticação
3. `whatsapp_messages` - Histórico de mensagens
4. `whatsapp_contacts` - Contatos sincronizados

---

### Fase 2: Session Manager Service (3-4 horas)

#### Task 2.1: Criar Session Manager

**Arquivo**: `src/services/baileys-session-manager.ts`

**Responsabilidades**:
- Gerenciar Map de sockets ativos
- Criar/destruir instâncias Baileys
- Reconectar automaticamente
- Emitir eventos para frontend (QR Code, status)

**Estrutura**:
```typescript
class BaileysSessionManager {
  private sessions: Map<string, WASocket> = new Map();
  private eventEmitters: Map<string, EventEmitter> = new Map();
  
  async createSession(sessionId: string, companyId: string): Promise<void>
  async deleteSession(sessionId: string): Promise<void>
  async reconnectSession(sessionId: string): Promise<void>
  async sendMessage(sessionId: string, to: string, message: any): Promise<string>
  getSession(sessionId: string): WASocket | undefined
  getStatus(sessionId: string): 'connecting' | 'connected' | 'disconnected'
}
```

#### Task 2.2: Implementar Auth State no DB

**Arquivo**: `src/services/baileys-auth-db.ts`

Substituir `useMultiFileAuthState` por storage no PostgreSQL:

```typescript
async function useDatabaseAuthState(sessionId: string) {
  // Carrega creds e keys do DB
  // Retorna { state, saveCreds }
}
```

---

### Fase 3: API Routes (2-3 horas)

#### Task 3.1: CRUD de Sessões

**Endpoints**:

1. **POST `/api/v1/whatsapp/sessions`** - Criar sessão
   - Input: `{ name: string, companyId: string }`
   - Output: `{ sessionId, qrCode?, status }`

2. **GET `/api/v1/whatsapp/sessions`** - Listar sessões
   - Query: `?companyId=xxx`
   - Output: `{ sessions: [...] }`

3. **GET `/api/v1/whatsapp/sessions/[id]`** - Detalhes da sessão
   - Output: `{ id, name, status, phone, lastActive }`

4. **DELETE `/api/v1/whatsapp/sessions/[id]`** - Deletar sessão
   - Desconecta socket + Remove do DB

5. **POST `/api/v1/whatsapp/sessions/[id]/connect`** - Reconectar
   - Reinicia socket + Gera novo QR

#### Task 3.2: QR Code via SSE

**Endpoint**: `GET /api/v1/whatsapp/sessions/[id]/qr`

Implementar Server-Sent Events para enviar QR Code em tempo real:

```typescript
export async function GET(req, { params }) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      sessionManager.on(`qr:${params.id}`, (qr) => {
        const data = `data: ${JSON.stringify({ qr })}\n\n`;
        controller.enqueue(encoder.encode(data));
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache'
    }
  });
}
```

#### Task 3.3: Enviar Mensagens

**Endpoint**: `POST /api/v1/whatsapp/send`

```typescript
{
  sessionId: string,
  to: string,  // Phone number
  type: 'text' | 'image' | 'audio' | 'video' | 'document',
  content: string | { url: string, caption?: string }
}
```

---

### Fase 4: Event Handlers (2 horas)

#### Task 4.1: Implementar Event Listeners

**Eventos principais do Baileys**:

```typescript
sock.ev.on('connection.update', async (update) => {
  const { connection, lastDisconnect, qr } = update;
  
  if (qr) {
    // Enviar QR via SSE
    eventEmitter.emit(`qr:${sessionId}`, qr);
  }
  
  if (connection === 'close') {
    // Verificar se deve reconectar
    const shouldReconnect = 
      lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    
    if (shouldReconnect) {
      await reconnectSession(sessionId);
    } else {
      await updateSessionStatus(sessionId, 'disconnected');
    }
  }
  
  if (connection === 'open') {
    await updateSessionStatus(sessionId, 'connected');
  }
});

sock.ev.on('messages.upsert', async ({ messages, type }) => {
  for (const msg of messages) {
    if (msg.key.fromMe) continue; // Ignora mensagens enviadas
    
    // Salva no DB
    await saveMessage(sessionId, msg);
    
    // Envia para AI Automation Engine
    await processMessageWithAI(sessionId, msg);
  }
});

sock.ev.on('creds.update', saveCreds);
```

#### Task 4.2: Integração com AI Automation

Conectar mensagens recebidas ao sistema de AI existente:

```typescript
async function processMessageWithAI(sessionId: string, message: WAMessage) {
  // Buscar configuração de AI da sessão
  const aiConfig = await getAIConfigForSession(sessionId);
  
  if (!aiConfig?.enabled) return;
  
  // Enviar para automation engine
  const response = await automationEngine.process({
    sessionId,
    from: message.key.remoteJid,
    text: message.message?.conversation || '',
    timestamp: message.messageTimestamp
  });
  
  // Enviar resposta automática
  if (response) {
    await sendMessage(sessionId, message.key.remoteJid, {
      text: response
    });
  }
}
```

---

### Fase 5: Frontend Components (3-4 horas)

#### Task 5.1: Página de Sessões

**Arquivo**: `src/app/(main)/whatsapp-sessions/page.tsx`

Reutilizar design das imagens fornecidas:

**Componentes**:
- Lista de sessões (status, nome, telefone, última atividade)
- Botões de ação (Conectar, Reconectar, Deletar)
- Modal "Criar Nova Sessão"
- Modal de QR Code (SSE)

#### Task 5.2: Modal de QR Code

**Arquivo**: `src/components/whatsapp/qr-code-modal.tsx`

```typescript
function QRCodeModal({ sessionId }) {
  const [qr, setQR] = useState(null);
  
  useEffect(() => {
    const eventSource = new EventSource(`/api/v1/whatsapp/sessions/${sessionId}/qr`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setQR(data.qr);
    };
    
    return () => eventSource.close();
  }, [sessionId]);
  
  return (
    <Dialog>
      <QRCodeCanvas value={qr} size={256} />
      <p>Escaneie o código QR com seu WhatsApp</p>
    </Dialog>
  );
}
```

#### Task 5.3: Hook para Sessões

**Arquivo**: `src/hooks/use-whatsapp-sessions.ts`

```typescript
function useWhatsAppSessions() {
  const { data, mutate } = useSWR('/api/v1/whatsapp/sessions', fetcher);
  
  const createSession = async (name: string) => {
    const res = await fetch('/api/v1/whatsapp/sessions', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    mutate();
    return res.json();
  };
  
  const deleteSession = async (id: string) => {
    await fetch(`/api/v1/whatsapp/sessions/${id}`, { method: 'DELETE' });
    mutate();
  };
  
  return { sessions: data?.sessions || [], createSession, deleteSession };
}
```

---

### Fase 6: Reconexão Automática e Resiliência (1-2 horas)

#### Task 6.1: Auto-Reconnect Logic

```typescript
const RECONNECT_INTERVAL = 5000; // 5 segundos
const MAX_RECONNECT_ATTEMPTS = 5;

async function reconnectWithBackoff(
  sessionId: string, 
  attempt: number = 0
) {
  if (attempt >= MAX_RECONNECT_ATTEMPTS) {
    await updateSessionStatus(sessionId, 'failed');
    return;
  }
  
  try {
    await createSession(sessionId);
  } catch (error) {
    const delay = RECONNECT_INTERVAL * Math.pow(2, attempt); // Exponential backoff
    setTimeout(() => reconnectWithBackoff(sessionId, attempt + 1), delay);
  }
}
```

#### Task 6.2: Health Check

Implementar endpoint de health check:

```typescript
// GET /api/v1/whatsapp/health
export async function GET() {
  const sessions = sessionManager.getAllSessions();
  const health = {
    totalSessions: sessions.length,
    connected: sessions.filter(s => s.status === 'connected').length,
    disconnected: sessions.filter(s => s.status === 'disconnected').length,
    memory: process.memoryUsage()
  };
  
  return NextResponse.json(health);
}
```

---

### Fase 7: Testes e Validação (2-3 horas)

#### Task 7.1: Testes Unitários

**Arquivo**: `tests/unit/baileys-session-manager.test.ts`

Testar:
- Criação de sessão
- Reconexão
- Envio de mensagens
- Destruição de sessão

#### Task 7.2: Testes de Integração

**Arquivo**: `tests/integration/whatsapp-flow.test.ts`

Testar fluxo completo:
1. Criar sessão via API
2. Receber QR Code
3. Simular autenticação
4. Enviar mensagem
5. Receber mensagem
6. Deletar sessão

#### Task 7.3: Testes E2E

**Arquivo**: `tests/e2e/whatsapp-sessions.spec.ts`

Playwright tests:
- Criar sessão via UI
- Ver QR Code
- Lista de sessões atualiza
- Deletar sessão

---

## 🗄️ Schema do Banco de Dados

### whatsapp_sessions

```typescript
export const whatsappSessions = pgTable('whatsapp_sessions', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  companyId: text('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone'), // Número conectado (após auth)
  status: text('status').notNull().default('disconnected'),
    // 'connecting' | 'connected' | 'disconnected' | 'failed'
  qrCode: text('qr_code'), // QR Code temporário
  lastConnected: timestamp('last_connected'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
```

### whatsapp_auth_state

```typescript
export const whatsappAuthState = pgTable('whatsapp_auth_state', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text('session_id')
    .notNull()
    .references(() => whatsappSessions.id, { onDelete: 'cascade' }),
  creds: jsonb('creds').notNull(), // AuthenticationCreds
  keys: jsonb('keys').notNull(), // SignalKeyStore
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
```

### whatsapp_messages

```typescript
export const whatsappMessages = pgTable('whatsapp_messages', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text('session_id')
    .notNull()
    .references(() => whatsappSessions.id, { onDelete: 'cascade' }),
  messageId: text('message_id').notNull().unique(),
  fromMe: boolean('from_me').notNull().default(false),
  remoteJid: text('remote_jid').notNull(), // Phone number
  message: jsonb('message').notNull(), // WAMessage proto
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  status: text('status'), // 'pending' | 'sent' | 'delivered' | 'read'
  createdAt: timestamp('created_at').defaultNow().notNull()
});
```

### whatsapp_contacts

```typescript
export const whatsappContacts = pgTable('whatsapp_contacts', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text('session_id')
    .notNull()
    .references(() => whatsappSessions.id, { onDelete: 'cascade' }),
  jid: text('jid').notNull(), // Phone number JID
  name: text('name'),
  notify: text('notify'), // WhatsApp notify name
  profilePicUrl: text('profile_pic_url'),
  lastSeen: timestamp('last_seen'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Unique constraint per session
export const whatsappContactsUnique = pgIndex('whatsapp_contacts_session_jid_unique')
  .on(whatsappContacts.sessionId, whatsappContacts.jid);
```

---

## 💻 Código de Referência

### Session Manager (Simplificado)

```typescript
// src/services/baileys-session-manager.ts
import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  Browsers
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { EventEmitter } from 'events';

class BaileysSessionManager {
  private sessions = new Map<string, WASocket>();
  private emitters = new Map<string, EventEmitter>();

  async createSession(sessionId: string, companyId: string) {
    if (this.sessions.has(sessionId)) {
      throw new Error('Session already exists');
    }

    const emitter = new EventEmitter();
    this.emitters.set(sessionId, emitter);

    // Auth state from database
    const { state, saveCreds } = await useDatabaseAuthState(sessionId);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.ubuntu(`MasterIA-${companyId}`),
      defaultQueryTimeoutMs: 60000
    });

    // Event: QR Code
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        emitter.emit('qr', qr);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          setTimeout(() => this.createSession(sessionId, companyId), 5000);
        }
      }

      if (connection === 'open') {
        console.log(`✅ Session ${sessionId} connected`);
      }
    });

    // Event: Messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (!msg.key.fromMe) {
          await this.handleIncomingMessage(sessionId, msg);
        }
      }
    });

    // Event: Creds update
    sock.ev.on('creds.update', saveCreds);

    this.sessions.set(sessionId, sock);
    return sock;
  }

  async sendMessage(sessionId: string, to: string, content: any) {
    const sock = this.sessions.get(sessionId);
    if (!sock) throw new Error('Session not found');

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    const sent = await sock.sendMessage(jid, content);
    return sent;
  }

  deleteSession(sessionId: string) {
    const sock = this.sessions.get(sessionId);
    if (sock) {
      sock.end(new Error('Session deleted'));
      this.sessions.delete(sessionId);
      this.emitters.delete(sessionId);
    }
  }

  getEventEmitter(sessionId: string): EventEmitter | undefined {
    return this.emitters.get(sessionId);
  }

  private async handleIncomingMessage(sessionId: string, msg: any) {
    // Save to DB
    // Process with AI
    // Send auto-response if needed
  }
}

export const sessionManager = new BaileysSessionManager();
```

### API Route Example

```typescript
// src/app/api/v1/whatsapp/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/services/baileys-session-manager';
import { db } from '@/lib/db';
import { whatsappSessions } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  const { name, companyId } = await request.json();

  const [session] = await db
    .insert(whatsappSessions)
    .values({ name, companyId, status: 'connecting' })
    .returning();

  await sessionManager.createSession(session.id, companyId);

  return NextResponse.json({ session });
}

export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId');

  const sessions = await db.query.whatsappSessions.findMany({
    where: companyId ? eq(whatsappSessions.companyId, companyId) : undefined
  });

  return NextResponse.json({ sessions });
}
```

### SSE QR Code

```typescript
// src/app/api/v1/whatsapp/sessions/[id]/qr/route.ts
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const emitter = sessionManager.getEventEmitter(params.id);
  if (!emitter) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      emitter.on('qr', (qr) => {
        const data = `data: ${JSON.stringify({ qr })}\n\n`;
        controller.enqueue(encoder.encode(data));
      });

      emitter.on('connected', () => {
        const data = `data: ${JSON.stringify({ status: 'connected' })}\n\n`;
        controller.enqueue(encoder.encode(data));
        controller.close();
      });
    },
    cancel() {
      emitter.removeAllListeners();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

---

## 📅 Cronograma de Implementação

### Estimativa Total: 15-20 horas

| Fase | Tarefas | Tempo Estimado | Prioridade |
|------|---------|----------------|------------|
| **Fase 1** | Setup e Infraestrutura | 2-3h | 🔴 Alta |
| **Fase 2** | Session Manager Service | 3-4h | 🔴 Alta |
| **Fase 3** | API Routes | 2-3h | 🔴 Alta |
| **Fase 4** | Event Handlers | 2h | 🟡 Média |
| **Fase 5** | Frontend Components | 3-4h | 🟡 Média |
| **Fase 6** | Reconexão e Resiliência | 1-2h | 🟢 Baixa |
| **Fase 7** | Testes e Validação | 2-3h | 🟢 Baixa |

### Cronograma Recomendado (5 dias)

**Dia 1** (4h):
- Fase 1 completa
- Início Fase 2 (50%)

**Dia 2** (4h):
- Fase 2 completa
- Fase 3 completa

**Dia 3** (4h):
- Fase 4 completa
- Início Fase 5 (50%)

**Dia 4** (4h):
- Fase 5 completa
- Fase 6 completa

**Dia 5** (3h):
- Fase 7 completa
- Deploy e documentação

---

## 🎯 MVP (Minimum Viable Product)

### Escopo Mínimo para Lançamento

**Funcionalidades Essenciais**:
1. ✅ Criar sessão WhatsApp
2. ✅ Exibir QR Code para autenticação
3. ✅ Conectar/Desconectar sessão
4. ✅ Listar sessões ativas
5. ✅ Enviar mensagem de texto
6. ✅ Receber mensagens
7. ✅ Status em tempo real (conectado/desconectado)

**Pode Ficar para V2**:
- [ ] Envio de mídia (imagem, vídeo, áudio)
- [ ] Grupos (criar, gerenciar, enviar)
- [ ] Leitura de status
- [ ] Pairing Code (alternativa ao QR)
- [ ] Webhooks customizados
- [ ] Analytics detalhado

---

## ⚠️ Considerações Importantes

### Compliance e Termos de Uso

**🚨 IMPORTANTE**: Baileys **NÃO** é oficial do WhatsApp

- ⚠️ Pode violar os Termos de Serviço do WhatsApp
- ✅ **Uso recomendado**: Automação interna, CRM, suporte ao cliente
- ❌ **NÃO usar para**: Spam, marketing não autorizado, bulk messaging agressivo

**Recomendações**:
- Sempre obter consentimento dos usuários
- Não enviar mais de 100-200 mensagens/dia por sessão
- Implementar rate limiting
- Usar Meta Official API (WABA) para campanhas comerciais

### Escalabilidade

**Limites por Servidor**:
- **Replit Standard**: 10-20 sessões simultâneas
- **Servidor Dedicado (2GB RAM)**: 30-40 sessões
- **Servidor Dedicado (4GB RAM)**: 50-100 sessões

**Otimizações**:
- Redis para cache de mensagens
- PostgreSQL com índices otimizados
- Sharding de sessões (múltiplos processos)

### Segurança

**Boas Práticas**:
1. ✅ Criptografar auth state no banco
2. ✅ Validar multi-tenant (companyId)
3. ✅ Rate limiting por sessão
4. ✅ Webhook HMAC signature
5. ✅ Sanitizar inputs
6. ✅ Logs com PII masking

---

## 📚 Recursos Adicionais

### Documentação Oficial
- **Baileys GitHub**: https://github.com/WhiskeySockets/Baileys
- **Baileys Wiki**: https://baileys.wiki
- **NPM Package**: https://www.npmjs.com/package/@whiskeysockets/baileys

### Projetos de Referência
- **Baileys-2025-Rest-API**: https://github.com/PointerSoftware/Baileys-2025-Rest-API
- **Evolution API**: https://github.com/EvolutionAPI/evolution-api
- **nizarfadlan/baileys-api**: https://github.com/nizarfadlan/baileys-api

### Comunidade
- **Discord**: https://whiskey.so/discord
- **GitHub Discussions**: https://github.com/WhiskeySockets/Baileys/discussions

---

## ✅ Checklist de Implementação

### Setup Inicial
- [ ] Instalar `@whiskeysockets/baileys`
- [ ] Criar schema do banco de dados
- [ ] Executar migrations (`npm run db:push`)

### Backend
- [ ] Implementar BaileysSessionManager
- [ ] Implementar useDatabaseAuthState
- [ ] Criar API Routes (CRUD sessões)
- [ ] Implementar SSE para QR Code
- [ ] Criar Event Handlers (connection, messages, creds)
- [ ] Integrar com AI Automation Engine

### Frontend
- [ ] Página de listagem de sessões
- [ ] Modal "Criar Nova Sessão"
- [ ] Modal de QR Code (SSE)
- [ ] Botões de ação (Conectar, Reconectar, Deletar)
- [ ] Hook `useWhatsAppSessions`
- [ ] Estados de loading/erro

### Testes
- [ ] Testes unitários (Session Manager)
- [ ] Testes de integração (API Routes)
- [ ] Testes E2E (UI Flow)

### Deploy
- [ ] Variáveis de ambiente configuradas
- [ ] Database migrations executadas
- [ ] Health check endpoint funcionando
- [ ] Logs configurados
- [ ] Documentação atualizada

---

## 🎉 Conclusão

Este plano fornece uma arquitetura completa e escalável para implementar **multi-instância WhatsApp com Baileys** no seu sistema Master IA.

**Próximos Passos**:
1. Revisar e aprovar o plano
2. Definir prioridades (MVP vs Funcionalidades Completas)
3. Iniciar Fase 1 (Setup e Infraestrutura)
4. Iterar e ajustar conforme necessário

**Estimativa**: 15-20 horas para implementação completa do MVP.

**Status**: ✅ **PLANO PRONTO PARA EXECUÇÃO**

---

**Criado por**: Sistema Automático  
**Data**: 04/11/2025  
**Versão**: 1.0
