# Fluxo Completo de Campanhas Baileys - Master IA

Este documento explica detalhadamente como funciona o sistema de envio de campanhas WhatsApp via Baileys, desde o clique do usuário no frontend até a entrega das mensagens.

---

## Índice

1. [Diagrama Visual do Fluxo](#1-diagrama-visual-do-fluxo)
2. [Frontend - Criação da Campanha](#2-frontend---criação-da-campanha)
3. [API Route - Validação e Persistência](#3-api-route---validação-e-persistência)
4. [Worker - Detecção e Orquestração](#4-worker---detecção-e-orquestração)
5. [Campaign Sender - Processamento](#5-campaign-sender---processamento)
6. [SessionManager - Envio via Baileys](#6-sessionmanager---envio-via-baileys)
7. [Delivery Reports - Tracking](#7-delivery-reports---tracking)
8. [Frontend - Atualização em Tempo Real](#8-frontend---atualização-em-tempo-real)
9. [Diferenças Baileys vs Meta Cloud API](#9-diferenças-baileys-vs-meta-cloud-api)
10. [Templates e Variáveis](#10-templates-e-variáveis)

---

## 1. Diagrama Visual do Fluxo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/Next.js)                             │
│  create-baileys-campaign-dialog.tsx                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Wizard 4 passos:                                                    │    │
│  │ 1️⃣ Conexão Baileys + Delay (11-33s / 61-121s / 210-341s)            │    │
│  │ 2️⃣ Mensagem com variáveis {{1}}, {{2}}, {{3}}                       │    │
│  │ 3️⃣ Listas de contatos + Agendamento                                 │    │
│  │ 4️⃣ Nome da campanha + Revisão final                                 │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │ POST /api/v1/campaigns/baileys
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API ROUTE (Next.js)                                  │
│  src/app/api/v1/campaigns/baileys/route.ts                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 1. Valida schema Zod                                                │    │
│  │ 2. Verifica ownership (conexão + listas pertencem à empresa)        │    │
│  │ 3. Filtra listas vazias                                             │    │
│  │ 4. INSERT campaigns com status='QUEUED'                             │    │
│  │ 5. redis.lpush('whatsapp_campaign_queue', campaignId)               │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                WORKER (CampaignTriggerWorker)                                │
│  src/workers/campaign-trigger.worker.ts                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ setInterval(() => processJob(), 30000) // Polling 30s               │    │
│  │                                                                      │    │
│  │ processJob():                                                        │    │
│  │   → processPendingCampaigns()                                        │    │
│  │   → Detecta campanhas órfãs (SENDING sem atividade 5min+)            │    │
│  │   → Dispara campanhas em paralelo por empresa                        │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              PROCESSING SERVICE                                              │
│  src/services/campaign-processing.service.ts                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Query: status IN ('QUEUED','PENDING','SENDING')                     │    │
│  │        OR (status='SCHEDULED' AND scheduledAt <= NOW)               │    │
│  │                                                                      │    │
│  │ Regra: 1 campanha ativa por conexão                                 │    │
│  │ Map<connectionId, campaignId> → Evita duplicatas                    │    │
│  │                                                                      │    │
│  │ Dispara: executeCampaignAsync(campaign) → fire-and-forget           │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CAMPAIGN SENDER                                           │
│  src/lib/campaign-sender.ts → sendWhatsappCampaign()                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 1. UPDATE campaigns SET status='SENDING'                           │    │
│  │ 2. Busca contatos das listas                                        │    │
│  │ 3. Deduplicação: exclui contatos com delivery report existente      │    │
│  │ 4. Detecta tipo: Baileys ou Meta API                                │    │
│  │                                                                      │    │
│  │ BAILEYS (sequencial com delay):                                     │    │
│  │ ┌─────────────────────────────────────────────────────────────┐     │    │
│  │ │ for (contact of contacts) {                                 │     │    │
│  │ │   result = await sendViaBaileys(contact);                   │     │    │
│  │ │   await db.insert(whatsappDeliveryReports).values({...});   │     │    │
│  │ │   await sleep(random(11000, 33000));                        │     │    │
│  │ │ }                                                           │     │    │
│  │ └─────────────────────────────────────────────────────────────┘     │    │
│  │                                                                      │    │
│  │ 5. UPDATE campaigns SET status='COMPLETED'                          │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               BAILEYS SESSION MANAGER                                        │
│  src/services/baileys-session-manager.ts                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ sendMessage(connectionId, phoneNumber, { text: message }):          │    │
│  │   1. Busca sessão: this.sessions.get(connectionId)                  │    │
│  │   2. Formata JID: "5511999999999@s.whatsapp.net"                    │    │
│  │   3. socket.sendMessage(jid, content)                               │    │
│  │   4. Retorna messageId (wamid)                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DATABASE (PostgreSQL)                                   │
│  Tabela: whatsapp_delivery_reports                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ id, campaign_id, contact_id, connection_id                          │    │
│  │ status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'                    │    │
│  │ provider_message_id, failure_reason, sent_at                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Polling 5s)                                   │
│  GET /api/v1/campaigns → Métricas agregadas                                  │
│  GET /api/v1/campaigns/{id}/delivery-report → Relatório detalhado            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend - Criação da Campanha

**Arquivo:** `src/components/campaigns/create-baileys-campaign-dialog.tsx`

### Wizard de 4 Passos

| Passo | Título | Campos |
|-------|--------|--------|
| 1 | Informações Básicas | Conexão Baileys + Intervalo entre mensagens |
| 2 | Compor Mensagem | Texto + Variáveis {{1}}, {{2}} |
| 3 | Público e Agendamento | Listas + Enviar agora/Agendar |
| 4 | Revisão e Envio | Nome + Resumo final |

### Opções de Delay

```typescript
const delayOptions = [
  { value: 'fast', label: 'Rápido (11-33s)', minDelay: 11, maxDelay: 33 },
  { value: 'normal', label: 'Normal (61-121s)', minDelay: 61, maxDelay: 121 },
  { value: 'safe', label: 'Seguro (210-341s)', minDelay: 210, maxDelay: 341 },
];
```

### Código do handleSubmit

```typescript
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const selectedDelay = delayOptions.find(d => d.value === delayOption);
    const payload = {
        name,
        connectionId: selectedConnectionId,
        messageText,
        variableMappings,
        contactListIds,
        schedule: sendNow ? null : scheduleDateTime.toISOString(),
        minDelaySeconds: selectedDelay?.minDelay || 11,
        maxDelaySeconds: selectedDelay?.maxDelay || 33,
    };

    const response = await fetch('/api/v1/campaigns/baileys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    // ...
};
```

---

## 3. API Route - Validação e Persistência

**Arquivo:** `src/app/api/v1/campaigns/baileys/route.ts`

### Schema de Validação (Zod)

```typescript
const baileysCampaignSchema = z.object({
  name: z.string().min(1, 'Nome da campanha é obrigatório'),
  connectionId: z.string().uuid('Selecione uma conexão válida'),
  messageText: z.string().min(1).max(4096),
  variableMappings: z.record(z.object({
    type: z.enum(['fixed', 'dynamic']),
    value: z.string(),
  })),
  contactListIds: z.array(z.string()).min(1),
  schedule: z.string().datetime().nullable().optional(),
  minDelaySeconds: z.number().min(5).max(600).default(11),
  maxDelaySeconds: z.number().min(10).max(900).default(33),
});
```

### Validações de Segurança

```typescript
export async function POST(request: NextRequest) {
    const companyId = await getCompanyIdFromSession();
    const parsed = baileysCampaignSchema.safeParse(await request.json());

    // VALIDAÇÃO 1: Conexão pertence à empresa e é Baileys
    const [connection] = await db.select().from(connections)
        .where(and(
            eq(connections.id, parsed.data.connectionId),
            eq(connections.companyId, companyId)
        ));
    
    if (connection.connectionType !== 'baileys') {
        return NextResponse.json({ error: 'Apenas conexões Baileys permitidas' }, { status: 400 });
    }

    // VALIDAÇÃO 2: Listas pertencem à empresa
    const ownedLists = await db.select({ id: contactLists.id })
        .from(contactLists)
        .where(and(
            eq(contactLists.companyId, companyId),
            inArray(contactLists.id, parsed.data.contactListIds)
        ));

    // VALIDAÇÃO 3: Filtrar listas vazias
    const listsWithContacts = await db.select({...})
        .from(contactsToContactLists)
        .where(inArray(contactsToContactLists.listId, parsed.data.contactListIds))
        .groupBy(contactsToContactLists.listId);

    // INSERT na tabela campaigns
    const [newCampaign] = await db.insert(campaigns).values({
        companyId,
        name: parsed.data.name,
        channel: 'WHATSAPP',
        status: isScheduled ? 'SCHEDULED' : 'QUEUED',
        connectionId: parsed.data.connectionId,
        message: parsed.data.messageText,
        variableMappings: {
            ...parsed.data.variableMappings,
            _minDelaySeconds: parsed.data.minDelaySeconds,
            _maxDelaySeconds: parsed.data.maxDelaySeconds,
        },
        contactListIds: validListIds,
        scheduledAt: schedule ? new Date(schedule) : null,
    }).returning();

    // Se não for agendada, enfileira para processamento imediato
    if (!isScheduled) {
        await redis.lpush('whatsapp_campaign_queue', newCampaign.id);
    }

    return NextResponse.json({ success: true, campaignId: newCampaign.id }, { status: 201 });
}
```

---

## 4. Worker - Detecção e Orquestração

**Arquivo:** `src/workers/campaign-trigger.worker.ts`

### Inicialização do Worker

```typescript
const POLLING_INTERVAL_MS = 30000; // 30 segundos

async function initializeCampaignTriggerWorker(): Promise<boolean> {
  if (global.__campaignTriggerWorkerInitialized) {
    console.log('[CampaignTriggerWorker] Worker já inicializado (hot-reload detectado).');
    return true;
  }

  // Registrar handlers de shutdown
  registerShutdownHandlers();

  // Executar primeira vez imediatamente
  await processJob();

  // Iniciar polling
  pollingInterval = setInterval(processJob, POLLING_INTERVAL_MS);
  global.__campaignPollingInterval = pollingInterval;

  console.log(`[CampaignTriggerWorker] ✅ Worker iniciado. Polling a cada ${POLLING_INTERVAL_MS / 1000}s`);
  return true;
}
```

### Processamento do Job

```typescript
async function processJob(): Promise<void> {
  if (isProcessing) return; // Evita execuções simultâneas

  isProcessing = true;
  console.log(`[CampaignTriggerWorker] 🔄 Executando job de processamento de campanhas...`);

  try {
    const result = await processPendingCampaigns();
    console.log(`[CampaignTriggerWorker] ✅ Job concluído: ${result.successful} enviadas, ${result.failed} falhas`);
  } catch (error) {
    console.error('[CampaignTriggerWorker] ❌ Erro no job:', error);
  } finally {
    isProcessing = false;
  }
}
```

---

**Arquivo:** `src/services/campaign-processing.service.ts`

### Busca de Campanhas Pendentes

```typescript
export async function processPendingCampaigns(): Promise<CampaignProcessingResult> {
  const now = new Date();

  // Query: busca campanhas prontas para processar
  const pendingCampaigns = await db.select().from(campaigns)
    .where(
      or(
        inArray(campaigns.status, ['QUEUED', 'PENDING', 'SENDING']),
        and(eq(campaigns.status, 'SCHEDULED'), lte(campaigns.scheduledAt, now)),
        and(eq(campaigns.status, 'SCHEDULED'), isNull(campaigns.scheduledAt))
      )
    );

  // Regra: 1 campanha por conexão
  for (const campaign of pendingCampaigns) {
    const connectionId = campaign.connectionId || campaign.companyId;

    // Verifica se campanha SENDING está órfã (sem atividade por 5+ min)
    if (campaign.status === 'SENDING') {
      const isOrphan = await isOrphanedSendingCampaign(campaign.id, campaign.channel);
      if (!isOrphan) {
        console.log(`[CampaignProcessor] Campanha ${campaign.id} já está em execução. Pulando.`);
        continue;
      }
      console.log(`[CampaignProcessor] 🔄 Retomando campanha órfã ${campaign.id}`);
    }

    // Marca campanha como ativa na conexão
    const canStart = markCampaignActive(connectionId, campaign.id);
    if (!canStart) {
      console.log(`[CampaignProcessor] Conexão ${connectionId} ocupada. Aguardando.`);
      continue;
    }

    // Dispara campanha em background (fire-and-forget)
    executeCampaignAsync(campaign);
  }

  return { processed: pendingCampaigns.length, ... };
}
```

### Controle de Campanhas Ativas por Conexão

```typescript
// Map global: connectionId → campaignId
declare global {
  var __activeCampaignsByConnection: Map<string, string> | undefined;
}

function markCampaignActive(connectionId: string, campaignId: string): boolean {
  const active = getActiveCampaigns();
  if (active.has(connectionId)) {
    // Conexão já tem campanha ativa
    return false;
  }
  active.set(connectionId, campaignId);
  return true;
}

function markCampaignComplete(connectionId: string, campaignId: string): void {
  const active = getActiveCampaigns();
  if (active.get(connectionId) === campaignId) {
    active.delete(connectionId);
  }
}
```

---

## 5. Campaign Sender - Processamento

**Arquivo:** `src/lib/campaign-sender.ts`

### Função Principal

```typescript
export async function sendWhatsappCampaign(campaign: typeof campaigns.$inferSelect): Promise<void> {
    // 1. Marcar como SENDING
    await db.update(campaigns).set({ status: 'SENDING' }).where(eq(campaigns.id, campaign.id));

    // 2. Buscar conexão e verificar tipo
    const [connection] = await db.select().from(connections).where(eq(connections.id, campaign.connectionId));
    const isBaileys = connection.connectionType === 'baileys';

    // 3. Resolver template ou mensagem direta
    let resolvedTemplate: ResolvedTemplate;
    if (campaign.templateId) {
        const template = await db.select().from(templates).where(eq(templates.id, campaign.templateId));
        resolvedTemplate = resolveTemplate(template);
    } else {
        resolvedTemplate = {
            name: 'direct_message',
            bodyText: campaign.message!,
            headerType: null,
            hasMedia: false,
        };
    }

    // 4. Buscar contatos das listas
    const contactIdsSubquery = db.select({ contactId: contactsToContactLists.contactId })
        .from(contactsToContactLists)
        .where(inArray(contactsToContactLists.listId, campaign.contactListIds!));
    
    let campaignContacts = await db.select().from(contacts)
        .where(inArray(contacts.id, contactIdsSubquery));

    // 5. DEDUPLICAÇÃO: Excluir contatos já enviados
    const alreadySentReports = await db.select({ contactId: whatsappDeliveryReports.contactId })
        .from(whatsappDeliveryReports)
        .where(eq(whatsappDeliveryReports.campaignId, campaign.id));
    
    const alreadySentContactIds = new Set(alreadySentReports.map(r => r.contactId));
    campaignContacts = campaignContacts.filter(c => !alreadySentContactIds.has(c.id));

    // 6. Configurar delay
    const variableMappings = campaign.variableMappings as Record<string, any>;
    const minDelaySeconds = variableMappings._minDelaySeconds || 11;
    const maxDelaySeconds = variableMappings._maxDelaySeconds || 33;

    // 7. Processar contatos (SEQUENCIAL para Baileys)
    for (const [index, contact] of campaignContacts.entries()) {
        // Verificar pausa a cada 10 contatos
        if (index > 0 && index % 10 === 0) {
            const [check] = await db.select({ status: campaigns.status })
                .from(campaigns).where(eq(campaigns.id, campaign.id));
            if (check?.status === 'PAUSED') {
                console.log(`[Campanha ${campaign.id}] Pausada. Interrompendo.`);
                return;
            }
        }

        // Enviar mensagem
        let result: CampaignMessageResult;
        try {
            result = await sendCampaignMessage(connection, contact, resolvedTemplate, variableMappings, campaign);
        } catch (error) {
            result = { success: false, contactId: contact.id, error: error.message };
        }

        // SALVAR DELIVERY REPORT IMEDIATAMENTE
        await db.insert(whatsappDeliveryReports).values({
            campaignId: campaign.id,
            contactId: result.contactId,
            connectionId: campaign.connectionId!,
            status: result.success ? 'SENT' : 'FAILED',
            providerMessageId: result.providerMessageId || null,
            failureReason: result.success ? null : result.error,
        });

        console.log(`[Campaign-Baileys] 💾 Delivery report salvo: ${result.success ? 'SENT' : 'FAILED'} | ${contact.phone}`);

        // Delay aleatório (exceto após último contato)
        if (index < campaignContacts.length - 1) {
            const randomDelay = Math.floor(Math.random() * (maxDelaySeconds - minDelaySeconds + 1)) + minDelaySeconds;
            console.log(`[Campanha ${campaign.id}] Aguardando ${randomDelay}s... (${index + 1}/${campaignContacts.length})`);
            await sleep(randomDelay * 1000);
        }
    }

    // 8. Marcar como COMPLETED
    await db.update(campaigns).set({ 
        status: 'COMPLETED', 
        sentAt: new Date(), 
        completedAt: new Date() 
    }).where(eq(campaigns.id, campaign.id));
}
```

### Função de Envio via Baileys

```typescript
async function sendViaBaileys(
    connectionId: string,
    contact: typeof contacts.$inferSelect,
    resolvedTemplate: ResolvedTemplate,
    variableMappings: Record<string, { type: 'dynamic' | 'fixed'; value: string }>
): Promise<CampaignMessageResult> {
    
    // Verificar sessão
    let sessionStatus = baileysSessionManager.getSessionStatus(connectionId);
    
    // Se sessão não existe, tentar restaurar
    if (!sessionStatus) {
        const [connectionData] = await db.select().from(connections)
            .where(eq(connections.id, connectionId));
        await baileysSessionManager.createSession(connectionId, connectionData.companyId);
        
        // Aguardar até 10s para conectar
        for (let i = 0; i < 20; i++) {
            await sleep(500);
            sessionStatus = baileysSessionManager.getSessionStatus(connectionId);
            if (sessionStatus === 'connected') break;
        }
    }

    if (sessionStatus !== 'connected') {
        return { success: false, contactId: contact.id, error: 'Sessão não conectada' };
    }

    // SUBSTITUIR VARIÁVEIS
    let messageText = resolvedTemplate.bodyText;
    const bodyVariables = messageText.match(/\{\{(\d+)\}\}/g) || [];
    
    for (const placeholder of bodyVariables) {
        const varKey = placeholder.replace(/\{|\}/g, ''); // "1", "2", etc
        const mapping = variableMappings[varKey];
        let text = `[variável ${varKey} não mapeada]`;
        
        if (mapping) {
            if (mapping.type === 'fixed') {
                text = mapping.value; // Valor fixo definido pelo usuário
            } else if (mapping.type === 'dynamic') {
                // Valor dinâmico do contato (name, phone, email, etc)
                const dynamicValue = contact[mapping.value as keyof typeof contact];
                text = dynamicValue ? String(dynamicValue) : '[dado ausente]';
            }
        }
        
        messageText = messageText.replace(placeholder, text);
    }

    // ENVIAR VIA BAILEYS
    try {
        const messageId = await withRetry(async () => {
            return await baileysSessionManager.sendMessage(connectionId, contact.phone, { text: messageText });
        });

        if (messageId) {
            return { success: true, contactId: contact.id, providerMessageId: messageId };
        } else {
            return { success: false, contactId: contact.id, error: 'Baileys retornou null' };
        }
    } catch (error) {
        return { success: false, contactId: contact.id, error: error.message };
    }
}
```

---

## 6. SessionManager - Envio via Baileys

**Arquivo:** `src/services/baileys-session-manager.ts`

### Método sendMessage

```typescript
async sendMessage(
    connectionId: string,
    to: string,
    content: any
): Promise<string | null> {
    console.log(`[SessionManager] Attempting to send message via ${connectionId} to ${to}`);

    // Buscar sessão
    const sessionData = this.sessions.get(connectionId);

    if (!sessionData) {
        console.error(`[SessionManager] ❌ Session ${connectionId} not found`);
        console.log(`[SessionManager] Available sessions: ${Array.from(this.sessions.keys()).join(', ')}`);
        return null;
    }

    if (sessionData.status !== 'connected') {
        console.error(`[SessionManager] ❌ Session not connected. Status: ${sessionData.status}`);
        return null;
    }

    try {
        // Formatar JID (WhatsApp ID)
        const cleanNumber = to.replace(/^\+/, ''); // Remove '+'
        const jid = cleanNumber.includes('@') ? cleanNumber : `${cleanNumber}@s.whatsapp.net`;
        
        console.log(`[SessionManager] Sending to JID: ${jid}`);

        // Enviar via socket do Baileys
        const sent = await sessionData.socket.sendMessage(jid, content);
        const messageId = sent?.key?.id || null;

        if (messageId) {
            console.log(`[SessionManager] ✅ Message sent successfully: ${messageId}`);
        } else {
            console.warn(`[SessionManager] ⚠️ Message sent but no ID returned`);
        }

        return messageId;
    } catch (error) {
        console.error(`[SessionManager] ❌ Error sending message:`, error);
        return null;
    }
}
```

### Recebimento de Receipts (Read/Delivered)

```typescript
// No método createSession(), ao configurar eventos do socket:
socket.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
        // update.update.status pode ser: 'played', 'read', 'delivered'
        const messageId = update.key.id;
        const newStatus = update.update.status;

        // Atualizar delivery report no banco
        if (newStatus === 3) { // 3 = read
            await db.update(whatsappDeliveryReports)
                .set({ status: 'read', readAt: new Date() })
                .where(eq(whatsappDeliveryReports.providerMessageId, messageId));
        } else if (newStatus === 2) { // 2 = delivered
            await db.update(whatsappDeliveryReports)
                .set({ status: 'delivered', deliveredAt: new Date() })
                .where(eq(whatsappDeliveryReports.providerMessageId, messageId));
        }
    }
});
```

---

## 7. Delivery Reports - Tracking

### Tabela whatsapp_delivery_reports

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| campaignId | UUID | FK para campaigns |
| contactId | UUID | FK para contacts |
| connectionId | UUID | FK para connections |
| status | ENUM | SENT, DELIVERED, READ, FAILED |
| providerMessageId | VARCHAR | WAMID do WhatsApp |
| failureReason | TEXT | Motivo se falhou |
| sentAt | TIMESTAMP | Data/hora do envio |
| deliveredAt | TIMESTAMP | Data/hora da entrega |
| readAt | TIMESTAMP | Data/hora da leitura |

### Fluxo de Status

```
┌────────┐      ┌───────────┐      ┌────────┐
│  SENT  │ ───► │ DELIVERED │ ───► │  READ  │
└────────┘      └───────────┘      └────────┘
     │
     │ (erro)
     ▼
┌────────┐
│ FAILED │
└────────┘
```

---

## 8. Frontend - Atualização em Tempo Real

### Polling de Campanhas (5 segundos)

```typescript
// No componente de listagem de campanhas
useEffect(() => {
    const fetchCampaigns = async () => {
        const response = await fetch('/api/v1/campaigns');
        const data = await response.json();
        setCampaigns(data.data);
    };

    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 5000); // Polling 5s

    return () => clearInterval(interval);
}, []);
```

### API de Métricas Agregadas

```sql
-- Query executada pelo GET /api/v1/campaigns
SELECT 
    campaigns.*,
    COUNT(wdr.id) as sent,
    COUNT(*) FILTER (WHERE wdr.status IN ('delivered', 'read')) as delivered,
    COUNT(*) FILTER (WHERE wdr.status = 'read') as read,
    COUNT(*) FILTER (WHERE wdr.status = 'failed') as failed
FROM campaigns
LEFT JOIN whatsapp_delivery_reports wdr ON wdr.campaign_id = campaigns.id
WHERE campaigns.company_id = ?
GROUP BY campaigns.id
ORDER BY campaigns.created_at DESC;
```

---

## 9. Diferenças Baileys vs Meta Cloud API

| Aspecto | Baileys | Meta Cloud API |
|---------|---------|----------------|
| **Autenticação** | QR Code (sessão local) | Access Token + WABA ID |
| **Templates** | Texto livre (não precisa aprovação) | Templates aprovados pela Meta |
| **Mídia** | Não suportado em campanhas | Suporta imagem, vídeo, documento |
| **Delay** | OBRIGATÓRIO (anti-bloqueio) | Opcional (pode ser paralelo) |
| **Custo** | Gratuito | Pago por conversa |
| **Rate Limit** | Muito restrito (manual) | ~80 mensagens/segundo |
| **Envio** | Sequencial com delay | Paralelo (Promise.allSettled) |
| **Variáveis** | {{1}}, {{2}} substituídos localmente | Enviados como parâmetros à API |

### Código de Detecção

```typescript
// No sendWhatsappCampaign()
const [connection] = await db.select().from(connections)
    .where(eq(connections.id, campaign.connectionId));

const isBaileys = connection.connectionType === 'baileys';

if (isBaileys) {
    // Processa sequencialmente com delay
    for (const contact of contacts) {
        await sendViaBaileys(connectionId, contact, template, mappings);
        await sleep(randomDelay * 1000);
    }
} else {
    // Meta API: processa em paralelo
    const promises = contacts.map(c => sendViaMetaApi(connectionId, c, template, mappings));
    await Promise.allSettled(promises);
}
```

---

## 10. Templates e Variáveis

### Formato de Variáveis

```
Olá {{1}}, você ganhou {{2}}% de desconto!
Use o cupom {{3}} até {{4}}.
```

### Tipos de Mapeamento

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| **fixed** | Valor fixo definido pelo usuário | {{2}} → "30" |
| **dynamic** | Campo do contato | {{1}} → contact.name |

### Campos Disponíveis (dynamic)

```typescript
const contactFields = [
    { value: 'name', label: 'Nome' },
    { value: 'phone', label: 'Telefone' },
    { value: 'email', label: 'Email' },
    { value: 'addressStreet', label: 'Endereço (Rua)' },
    { value: 'addressCity', label: 'Endereço (Cidade)' },
];
```

### Exemplo de Substituição

```typescript
// Input
messageText = "Olá {{1}}, você ganhou {{2}}% de desconto!";
variableMappings = {
    "1": { type: "dynamic", value: "name" },     // Pega contact.name
    "2": { type: "fixed", value: "30" }          // Valor fixo
};
contact = { name: "João", phone: "5511999999999" };

// Processamento
let text = messageText;
// {{1}} → dynamic → contact.name → "João"
// {{2}} → fixed → "30"

// Output
text = "Olá João, você ganhou 30% de desconto!";
```

---

## Status de Campanhas

| Status | Descrição | Transições |
|--------|-----------|------------|
| `QUEUED` | Criada, aguardando worker | → SENDING |
| `PENDING` | Na fila de processamento | → SENDING |
| `SCHEDULED` | Agendada para data futura | → SENDING (quando chegar a hora) |
| `SENDING` | Em processamento ativo | → COMPLETED, PAUSED, FAILED |
| `PAUSED` | Pausada pelo usuário | → SENDING (ao retomar) |
| `COMPLETED` | Todos contatos processados | (final) |
| `FAILED` | Erro crítico | (final) |

---

## Logs Importantes

```bash
# Worker iniciado
[CampaignTriggerWorker] ✅ Worker iniciado. Polling a cada 30s

# Campanha detectada
[CampaignProcessor] Encontradas 2 campanhas pendentes. Conexões ativas: 1

# Campanha iniciada
[CampaignProcessor] 🚀 Iniciando campanha abc123 (Black Friday)

# Envio via Baileys
[Campaign-Baileys] Preparando envio | ConnectionID: xyz789 | Contato: +5511999999999
[SessionManager] Sending to JID: 5511999999999@s.whatsapp.net
[SessionManager] ✅ Message sent successfully: 3EB0ABCD1234

# Delivery report salvo
[Campaign-Baileys] 💾 Delivery report salvo: SENT | Contato: +5511999999999

# Delay entre mensagens
[Campanha abc123] Aguardando 23s antes do próximo envio... (1/100)

# Campanha concluída
[CampaignProcessor] ✅ Campanha abc123 (Black Friday) concluída com sucesso
```

---

**Documento gerado em:** 18/12/2025
**Versão:** v2.10.26
