# 🏗️ Decisões Arquiteturais - Baileys WhatsApp Integration

**Data**: 04 de Novembro de 2025  
**Questões Respondidas**: Atendimento unificado e separação de interfaces

---

## 📋 Questões do Cliente

### 1️⃣ Onde será o atendimento das conversas Baileys?

### 2️⃣ Como evitar conflito com Cloud API da Meta?

### 3️⃣ Página separada para gestão de sessões Baileys?

---

## 🎯 Resposta 1: Atendimento das Conversas Baileys

### ✅ SOLUÇÃO RECOMENDADA: **Atendimento Unificado com Filtros**

**Onde**: Mesma página `/atendimento` (atual)

**Por quê**:
- ✅ Experiência do usuário consistente
- ✅ Não precisa ficar trocando de página
- ✅ Interface já existente e testada
- ✅ Histórico centralizado do cliente

---

## 🗄️ Arquitetura do Banco de Dados (Atual vs Proposto)

### Schema Atual (já existe)

```typescript
export const connections = pgTable('connections', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull(),
  config_name: text('config_name').notNull(),
  connectionType: text('connection_type').default('meta_api').notNull(),
  // Meta API fields
  wabaId: text('waba_id').notNull(),
  phoneNumberId: text('phone_number_id').notNull(),
  accessToken: text('access_token').notNull(),
  // ...
});

export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull(),
  contactId: text('contact_id').notNull(),
  connectionId: text('connection_id').references(() => connections.id), // ← JÁ EXISTE!
  status: text('status').default('NEW').notNull(),
  aiActive: boolean('ai_active').default(true).notNull(),
  // ...
});
```

**👆 PONTO CRÍTICO**: O campo `connectionId` **já existe** e é a chave para separação!

---

## 🔧 Modificações Necessárias

### Fase 1: Expandir Tabela `connections` para suportar Baileys

**Adicionar ao schema**:

```typescript
export const connections = pgTable('connections', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  companyId: text('company_id').notNull().references(() => companies.id),
  config_name: text('config_name').notNull(),
  
  // ← CAMPO QUE DEFINE O TIPO
  connectionType: text('connection_type').notNull(), 
  // Valores: 'meta_api' | 'baileys' | 'whatsmeow'
  
  // Campos Meta API (NULLABLE para Baileys)
  wabaId: text('waba_id'),
  phoneNumberId: text('phone_number_id'),
  accessToken: text('access_token'),
  webhookSecret: text('webhook_secret'),
  appSecret: text('app_secret'),
  
  // Campos Baileys (NOVOS - NULLABLE para Meta API)
  sessionId: text('session_id'), // ID único da sessão Baileys
  phone: text('phone'), // Número conectado (após QR scan)
  qrCode: text('qr_code'), // QR Code temporário
  status: text('status'), // 'connecting' | 'connected' | 'disconnected'
  lastConnected: timestamp('last_connected'),
  
  // Campos comuns
  isActive: boolean('is_active').default(false).notNull(),
  assignedPersonaId: text('assigned_persona_id').references(() => aiPersonas.id),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Vantagens desta abordagem**:
1. ✅ Uma única tabela `connections` para todos os tipos
2. ✅ `connectionId` em `conversations` já funciona para tudo
3. ✅ Fácil adicionar novos tipos no futuro (whatsmeow, Telegram, etc)
4. ✅ Queries simples: `WHERE connectionType = 'baileys'`

---

## 🎨 Interface de Atendimento - Como Funciona

### Página `/atendimento` - UNIFICADA

**Estrutura Atual** (mantemos):
```
┌─────────────────────────────────────────────────────────────┐
│  Atendimentos                                                │
├─────────────────────┬──────────────────────┬────────────────┤
│  Lista Conversas    │   Chat Ativo         │  Detalhes      │
│  ┌───────────────┐  │                      │  Contato       │
│  │ João Silva    │  │  Mensagens...        │                │
│  │ 📱 Meta API   │  │                      │  Tags          │
│  └───────────────┘  │                      │  Notas         │
│  ┌───────────────┐  │                      │  Histórico     │
│  │ Maria Souza   │  │                      │                │
│  │ 🔌 Baileys    │  │                      │                │
│  └───────────────┘  │                      │                │
└─────────────────────┴──────────────────────┴────────────────┘
```

### Adições Necessárias (UI)

**1. Filtros/Tabs na Lista de Conversas**:

```tsx
// src/components/atendimentos/conversation-list.tsx

function ConversationList() {
  const [sourceFilter, setSourceFilter] = useState<'all' | 'meta_api' | 'baileys'>('all');
  
  return (
    <div>
      {/* NOVO: Tabs de Filtro */}
      <Tabs value={sourceFilter} onValueChange={setSourceFilter}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="meta_api">
            <MessageSquare className="mr-2" />
            Meta API
          </TabsTrigger>
          <TabsTrigger value="baileys">
            <Smartphone className="mr-2" />
            Baileys
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Lista de conversas filtrada */}
      <ConversationItems filter={sourceFilter} />
    </div>
  );
}
```

**2. Badge Visual na Lista**:

Cada conversa mostra de qual fonte veio:

```tsx
<div className="conversation-item">
  <Avatar>{contact.name}</Avatar>
  <div>
    <p>{contact.name}</p>
    <p>{lastMessage}</p>
  </div>
  
  {/* NOVO: Badge da fonte */}
  {conversation.connection?.connectionType === 'meta_api' && (
    <Badge variant="outline">
      <MessageSquare className="w-3 h-3 mr-1" />
      Meta
    </Badge>
  )}
  
  {conversation.connection?.connectionType === 'baileys' && (
    <Badge variant="outline" className="bg-purple-100">
      <Smartphone className="w-3 h-3 mr-1" />
      Baileys
    </Badge>
  )}
</div>
```

---

## 🔄 Fluxo de Dados Completo

### Cenário 1: Mensagem chega via Meta API (atual)

```
WhatsApp (Meta) → Webhook /api/webhook/whatsapp
  ↓
Processa payload Meta
  ↓
Cria/atualiza conversation com connectionId = [meta_connection_id]
  ↓
Salva message
  ↓
Frontend atualiza lista (inclui badge "Meta API")
```

### Cenário 2: Mensagem chega via Baileys (novo)

```
WhatsApp Web → Baileys Socket (messages.upsert event)
  ↓
Event Handler identifica sessionId
  ↓
Busca connection WHERE sessionId = [baileys_session_id]
  ↓
Cria/atualiza conversation com connectionId = [baileys_connection_id]
  ↓
Salva message
  ↓
Frontend atualiza lista (inclui badge "Baileys")
```

**Resultado**: Ambas as conversas aparecem na mesma lista, mas:
- ✅ Visualmente diferenciadas (badge)
- ✅ Filtráveis por fonte (tabs)
- ✅ Mesma interface de atendimento

---

## 🎯 Resposta 2: Como Evitar Conflito com Cloud API?

### ✅ SOLUÇÃO: Separação por `connectionType` + `connectionId`

**NÃO há conflito porque**:

1. **Separação no Banco**:
   ```sql
   -- Conversa Meta API
   INSERT INTO conversations (
     id, contactId, connectionId
   ) VALUES (
     'conv-1', 'contact-123', 'conn-meta-abc'
   );
   
   -- Conversa Baileys (DIFERENTE connectionId)
   INSERT INTO conversations (
     id, contactId, connectionId
   ) VALUES (
     'conv-2', 'contact-123', 'conn-baileys-xyz'
   );
   ```

2. **Mesmo Contato, Conversas Diferentes**:
   - Contato pode ter múltiplas conversas
   - Cada conversa vinculada a uma conexão específica
   - `connectionId` define qual API usar para responder

3. **Lógica de Envio**:
   ```typescript
   async function sendMessage(conversationId: string, text: string) {
     const conversation = await db.query.conversations.findFirst({
       where: eq(conversations.id, conversationId),
       with: { connection: true }
     });
     
     if (conversation.connection.connectionType === 'meta_api') {
       // Usa API Meta
       await sendViaMetaAPI(conversation.connection, text);
     } else if (conversation.connection.connectionType === 'baileys') {
       // Usa Baileys
       await sendViaBaileys(conversation.connection.sessionId, text);
     }
   }
   ```

**Garantias**:
- ✅ Nunca envia Meta API para sessão Baileys
- ✅ Nunca envia Baileys para conexão Meta API
- ✅ Cada conversa "sabe" de onde veio
- ✅ UI mostra claramente a fonte

---

## 🎯 Resposta 3: Página Separada para Gestão de Sessões Baileys

### ✅ SIM! **Página Completamente Separada**

**Por quê separar da página de Connections atual**?

| Aspecto | Meta API (Connections) | Baileys (Sessões) |
|---------|----------------------|-------------------|
| **Propósito** | WhatsApp Business Oficial | WhatsApp Web Multi-device |
| **Autenticação** | Token de acesso (OAuth) | QR Code / Pairing Code |
| **Setup** | Configurar WABA, Phone ID | Escanear QR com celular |
| **Tipo de Conta** | Empresas aprovadas | Pessoal/Automação |
| **Templates** | Obrigatório (aprovados) | Não necessário |
| **Compliance** | Oficial WhatsApp | Não oficial |
| **Use Case** | Campanhas comerciais | Automação interna, CRM |

**São casos de uso TOTALMENTE diferentes!**

---

## 📄 Estrutura de Páginas Proposta

### 1. `/configuracoes` > **Connections Manager** (Meta API)

**Página Atual** - MANTER como está

```
┌─────────────────────────────────────────────────────────────┐
│  Conexões WhatsApp Business (Meta API)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 📱 Roseli - Principal                                  │  │
│  │ WABA ID: 123456789                                     │  │
│  │ Phone: +55 11 98765-4321                               │  │
│  │ Status: ✅ Conectado                                   │  │
│  │ [Editar] [Deletar] [Ver Webhook]                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [+ Nova Conexão Meta API]                                  │
└─────────────────────────────────────────────────────────────┘
```

**Campos**:
- config_name
- WABA ID
- Phone Number ID
- Access Token
- Webhook Secret
- App Secret

---

### 2. `/whatsapp-sessoes` > **Sessões Baileys** (NOVA PÁGINA)

**Página Nova** - Layout das imagens que você enviou!

```
┌─────────────────────────────────────────────────────────────┐
│  Sessões WhatsApp (Baileys Multi-Instância)                 │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🔌 qsdpsdq                          Desconectada       │  │
│  │ ID: qsdp                                               │  │
│  │ Status: Auth flow not found                            │  │
│  │ [Conectar] [Deletar]                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ✅ Principal                        Conectada          │  │
│  │ ID: default                                            │  │
│  │ Telefone: 5563314249957                                │  │
│  │ Última conexão: 04/11/2025 19:42                       │  │
│  │ [Reconectar] [Deletar]                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [+ Nova Sessão]                                            │
└─────────────────────────────────────────────────────────────┘
```

**Funcionalidades**:
- ✅ Listar todas as sessões Baileys
- ✅ Criar nova sessão (modal com QR Code)
- ✅ Ver status em tempo real
- ✅ Conectar/Desconectar/Deletar
- ✅ Reconectar automaticamente

---

## 🗂️ Estrutura de Arquivos Proposta

```
src/
├── app/(main)/
│   ├── atendimento/                    # ← UNIFICADO (Meta + Baileys)
│   │   ├── page.tsx
│   │   └── atendimentos-client.tsx
│   │
│   ├── configuracoes/                  # ← Configurações gerais
│   │   └── page.tsx                    # Inclui Connections Manager (Meta API)
│   │
│   └── whatsapp-sessoes/               # ← NOVA PÁGINA (Baileys)
│       ├── page.tsx
│       └── sessoes-client.tsx
│
├── components/
│   ├── atendimentos/                   # ← Componentes do chat
│   │   ├── inbox-view.tsx              # (MODIFICAR: adicionar filtros)
│   │   ├── conversation-list.tsx       # (MODIFICAR: adicionar badges)
│   │   └── active-chat.tsx             # (MODIFICAR: detectar tipo de conexão)
│   │
│   ├── settings/
│   │   └── connections-manager.tsx     # ← Meta API (MANTER)
│   │
│   └── whatsapp-baileys/               # ← NOVO (Baileys)
│       ├── sessions-list.tsx
│       ├── qr-code-modal.tsx
│       └── create-session-dialog.tsx
│
├── services/
│   ├── baileys-session-manager.ts      # ← NOVO
│   └── baileys-auth-db.ts              # ← NOVO
│
└── api/
    ├── v1/
    │   ├── whatsapp/
    │   │   └── sessions/               # ← NOVO (Baileys CRUD)
    │   │       ├── route.ts            # GET/POST
    │   │       └── [id]/
    │   │           ├── route.ts        # DELETE
    │   │           ├── qr/route.ts     # SSE QR Code
    │   │           └── send/route.ts   # Enviar mensagem
    │   │
    │   └── conversations/              # ← JÁ EXISTE (unificado)
    │       ├── route.ts
    │       └── [id]/messages/route.ts
    │
    └── webhook/
        ├── whatsapp/route.ts           # ← Meta API (já existe)
        └── baileys/route.ts            # ← NOVO (eventos Baileys internos)
```

---

## 🔄 Modificações na Interface de Atendimento

### Arquivo: `src/components/atendimentos/conversation-list.tsx`

**ADICIONAR**:

```typescript
// Importar
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Smartphone } from 'lucide-react';

// Adicionar state para filtro
const [sourceFilter, setSourceFilter] = useState<'all' | 'meta_api' | 'baileys'>('all');

// Filtrar conversas
const filteredConversations = useMemo(() => {
  if (sourceFilter === 'all') return conversations;
  
  return conversations.filter(conv => 
    conv.connection?.connectionType === sourceFilter
  );
}, [conversations, sourceFilter]);

// Renderizar tabs
<Tabs value={sourceFilter} onValueChange={setSourceFilter}>
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="all">Todas</TabsTrigger>
    <TabsTrigger value="meta_api">Meta API</TabsTrigger>
    <TabsTrigger value="baileys">Baileys</TabsTrigger>
  </TabsList>
</Tabs>
```

### Arquivo: `src/components/atendimentos/active-chat.tsx`

**MODIFICAR** lógica de envio:

```typescript
const onSendMessage = async (text: string) => {
  // Detecta tipo de conexão automaticamente
  const connectionType = conversation.connection?.connectionType;
  
  let endpoint = '/api/v1/conversations';
  
  if (connectionType === 'baileys') {
    // Usa endpoint específico do Baileys
    endpoint = '/api/v1/whatsapp/sessions/send';
  }
  
  // Envia usando endpoint correto
  await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({ conversationId, text })
  });
};
```

---

## ✅ Checklist de Implementação

### Banco de Dados
- [ ] Modificar tabela `connections` (adicionar campos Baileys)
- [ ] Adicionar valores `'baileys'` ao enum `connectionType`
- [ ] Executar `npm run db:push`

### Backend
- [ ] Criar Session Manager (`src/services/baileys-session-manager.ts`)
- [ ] Criar Auth DB Storage (`src/services/baileys-auth-db.ts`)
- [ ] Criar API Routes `/api/v1/whatsapp/sessions/*`
- [ ] Implementar webhook interno para eventos Baileys
- [ ] Modificar lógica de envio para detectar tipo de conexão

### Frontend - Nova Página Baileys
- [ ] Criar página `/whatsapp-sessoes`
- [ ] Componente: Lista de sessões
- [ ] Componente: Modal criar sessão
- [ ] Componente: QR Code via SSE
- [ ] Hook: `useWhatsAppSessions`

### Frontend - Atendimento (Modificações)
- [ ] Adicionar tabs de filtro (Meta API / Baileys / Todas)
- [ ] Adicionar badges visuais nas conversas
- [ ] Modificar lógica de envio (detectar connectionType)
- [ ] Incluir `connection` no fetch de conversas
- [ ] Testar filtros funcionando

### Menu de Navegação
- [ ] Adicionar link para `/whatsapp-sessoes` no sidebar
- [ ] Ícone: `<Smartphone />` ou `<MessageSquare />`
- [ ] Nome: "Sessões WhatsApp" ou "Baileys Multi-Instância"

---

## 🎯 Resumo Executivo

### ✅ Decisões Finais

| Pergunta | Resposta |
|----------|----------|
| **1. Onde atender Baileys?** | Mesma página `/atendimento` (unificada com filtros) |
| **2. Como evitar conflito?** | Campo `connectionType` + `connectionId` separa tudo |
| **3. Página separada para gestão?** | **SIM!** `/whatsapp-sessoes` (totalmente separada) |

### Benefícios desta Arquitetura

1. ✅ **Atendimento Centralizado**: Atendente vê tudo em um lugar
2. ✅ **Gestão Separada**: Configurar Meta API ≠ Configurar Baileys
3. ✅ **Zero Conflito**: `connectionId` garante separação
4. ✅ **Escalável**: Fácil adicionar novos tipos (Telegram, SMS, etc)
5. ✅ **UI Intuitiva**: Badges e filtros deixam claro a origem

---

## 📊 Comparação Visual

### ❌ RUIM: Misturar tudo sem identificação

```
Lista de Conversas:
- João Silva (de onde veio? 🤷)
- Maria Souza (de onde veio? 🤷)
```

### ✅ BOM: Separado visualmente com filtros

```
[Todas] [Meta API] [Baileys]

Lista de Conversas:
- João Silva         [📱 Meta]
- Maria Souza        [🔌 Baileys]
- Pedro Santos       [📱 Meta]
```

---

## 🚀 Próximos Passos

**Antes de implementar, você precisa confirmar**:

1. ✅ Concorda com atendimento unificado em `/atendimento`?
2. ✅ Concorda com página separada `/whatsapp-sessoes` para gestão?
3. ✅ Alguma modificação nas decisões acima?

**Após confirmação, posso começar**:
- Fase 1: Modificar schema do banco
- Fase 2: Criar página de gestão de sessões Baileys
- Fase 3: Integrar com página de atendimento

---

**Status**: ⏸️ **AGUARDANDO APROVAÇÃO DO CLIENTE**

---

**Criado por**: Sistema Automático  
**Data**: 04/11/2025  
**Versão**: 1.0
