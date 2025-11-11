# Plano de Implementação: Campanhas WhatsApp via Baileys

## Visão Geral

Este documento detalha o plano completo para adicionar suporte a campanhas WhatsApp usando conexões Baileys, sem impactar as campanhas existentes via Meta Cloud API.

### Status Atual ✅

**Infraestrutura Backend Já Implementada:**
- ✅ Roteamento híbrido em `sendCampaignMessage()` detecta automaticamente tipo de conexão
- ✅ Bloqueio de mídia para Baileys (`isBaileys && hasMedia → erro`)
- ✅ SessionManager integrado com logging completo
- ✅ Delivery reports suportam ambos provedores (campo `providerMessageId`)
- ✅ Normalização case-insensitive de canal (`'whatsapp' → 'WHATSAPP'`)

**O Que Falta:**
- ❌ UI para criar campanhas Baileys (atualmente só suporta Meta API via templates)
- ❌ Validações frontend para limitações Baileys (sem mídia, texto simples)
- ❌ Fluxo de criação de mensagem texto simples (sem templates estruturados)
- ❌ Documentação e avisos sobre diferenças entre Baileys e Meta API

---

## Arquitetura Proposta

### Princípio Fundamental
**Separação de Preocupações:** Baileys e Meta API têm capacidades diferentes e devem ter fluxos de criação separados, mas compartilham o mesmo backend de processamento.

### Abordagem de Dois Caminhos

#### Caminho 1: Meta Cloud API (Existente)
```
Usuário → /templates → Seleciona Template Meta → CreateWhatsappCampaignDialog → 
API /api/v1/campaigns/whatsapp → Queue → sendCampaignMessage (Meta Path)
```
- Templates estruturados com componentes (HEADER, BODY, FOOTER, BUTTONS)
- Suporte a mídia (IMAGE, VIDEO, DOCUMENT)
- Variáveis com mapeamento dinâmico/fixo
- Requer aprovação prévia do template pela Meta

#### Caminho 2: Baileys (Novo - Proposto)
```
Usuário → /campaigns-baileys → Compõe Mensagem Texto → CreateBaileysCampaignDialog → 
API /api/v1/campaigns/baileys → Queue → sendCampaignMessage (Baileys Path)
```
- Mensagens de texto simples
- Variáveis básicas `{{1}}`, `{{2}}` substituídas por dados de contato
- SEM suporte a mídia (validado no frontend e backend)
- SEM necessidade de aprovação Meta (direto do WhatsApp pessoal/empresarial)

---

## Fases de Implementação

### Fase 1: UI - Nova Página de Campanhas Baileys (2-3 dias)

#### 1.1 Criar Rota `/campaigns-baileys`

**Arquivo:** `src/app/(main)/campaigns-baileys/page.tsx`

```typescript
import { PageHeader } from '@/components/page-header';
import { BaileysCampaignTable } from '@/components/campaigns/baileys-campaign-table';
import { CreateBaileysCampaignDialog } from '@/components/campaigns/create-baileys-campaign-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function BaileysCampaignsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Campanhas WhatsApp Baileys"
        description="Envie campanhas de texto via WhatsApp pessoal/empresarial (QR Code)."
      >
        <CreateBaileysCampaignDialog>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Campanha Baileys
          </Button>
        </CreateBaileysCampaignDialog>
      </PageHeader>
      <BaileysCampaignTable />
    </div>
  );
}
```

#### 1.2 Adicionar ao Menu de Navegação

**Arquivo:** `src/components/app-sidebar.tsx`

Adicionar item no grupo WhatsApp:
```typescript
{
  title: "Campanhas Baileys",
  url: "/campaigns-baileys",
  icon: MessageSquareText,
  roles: ['admin', 'superadmin']
}
```

#### 1.3 Criar Dialog de Criação de Campanha Baileys

**Arquivo:** `src/components/campaigns/create-baileys-campaign-dialog.tsx`

**Estrutura do Formulário (Multi-Step):**

**Passo 1: Informações Básicas**
- Nome da campanha
- Seletor de conexão Baileys (filtrar apenas `connectionType === 'baileys'` e `status === 'connected'`)
- Aviso: "⚠️ Campanhas Baileys suportam apenas texto simples. Para envios com mídia, use Meta Cloud API."

**Passo 2: Compor Mensagem**
- Textarea para mensagem de texto
- Contador de caracteres (limite sugerido: 4096)
- Preview com variáveis destacadas
- Botões para inserir variáveis numéricas: `{{1}}`, `{{2}}`, `{{3}}`, etc. (**IMPORTANTE:** usar formato numérico, não nomeado)
- Sistema de mapeamento simples:
  ```
  {{1}} → Mapeamento:
    ( ) Valor fixo: [____]
    (●) Campo do contato: [Dropdown: Nome, Telefone, Email...]
  
  {{2}} → Mapeamento:
    ( ) Valor fixo: [____]
    (●) Campo do contato: [Dropdown: Nome, Telefone, Email...]
  ```

**Nota Técnica:** Baileys usa o mesmo sistema de variáveis numéricas que Meta API (`{{1}}`, `{{2}}`), conforme implementado em `sendViaBaileys()` (linhas 124-145 de `campaign-sender.ts`). Isso garante compatibilidade total.

**Passo 3: Público e Agendamento**
- Seleção de listas de contatos (múltipla escolha)
- Opção: Enviar agora / Agendar
- Se agendar: Data e Hora

**Passo 4: Revisão**
- Preview da mensagem final
- Resumo: conexão, listas, total de contatos estimado
- Botões: Voltar, Confirmar e Enviar/Agendar

**Exemplo de Estado:**
```typescript
interface BaileysCampaignForm {
  name: string;
  connectionId: string;
  messageText: string;
  variableMappings: Record<string, { type: 'fixed' | 'dynamic', value: string }>; // keys: '1', '2', '3', etc.
  contactListIds: string[];
  schedule: string | null;
}
```

**Exemplo de Payload:**
```json
{
  "name": "Campanha Novembro 2024",
  "connectionId": "baileys-conn-123",
  "messageText": "Olá {{1}}! Sua compra {{2}} está pronta.",
  "variableMappings": {
    "1": { "type": "dynamic", "value": "name" },
    "2": { "type": "fixed", "value": "#12345" }
  },
  "contactListIds": ["list-1", "list-2"],
  "schedule": null
}
```

#### 1.4 Validações Frontend

- ✅ Conexão deve ser Baileys e estar conectada
- ✅ Mensagem não pode estar vazia
- ✅ Pelo menos 1 lista de contatos selecionada
- ✅ Se houver variáveis `{{1}}`, `{{2}}`, etc., todas devem estar mapeadas
- ❌ BLOQUEAR upload de mídia (esconder componente MediaUploader)

---

### Fase 2: Backend - API de Criação de Campanhas Baileys (1-2 dias)

#### 2.1 Criar Endpoint Dedicado

**Arquivo:** `src/app/api/v1/campaigns/baileys/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { campaigns, connections, contactLists, contactsToContactLists } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const variableMappingSchema = z.object({
  type: z.enum(['fixed', 'dynamic']),
  value: z.string()
});

const baileysCampaignSchema = z.object({
  name: z.string().min(1, 'Nome da campanha é obrigatório'),
  connectionId: z.string().uuid('Selecione uma conexão válida'),
  messageText: z.string().min(1, 'Mensagem não pode estar vazia').max(4096, 'Mensagem muito longa (máx 4096 caracteres)'),
  variableMappings: z.record(variableMappingSchema),
  contactListIds: z.array(z.string()).min(1, 'Selecione pelo menos uma lista.'),
  schedule: z.string().datetime({ offset: true }).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const body = await request.json();
    const campaignData = baileysCampaignSchema.parse(body);

    // VALIDAÇÃO 1: Verificar que conexão é Baileys e pertence à empresa
    const [connection] = await db
      .select()
      .from(connections)
      .where(and(
        eq(connections.id, campaignData.connectionId),
        eq(connections.companyId, companyId)
      ));

    if (!connection) {
      return NextResponse.json({ 
        error: 'Conexão inválida', 
        description: 'Conexão não encontrada ou não pertence à sua empresa.' 
      }, { status: 403 });
    }

    if (connection.connectionType !== 'baileys') {
      return NextResponse.json({ 
        error: 'Conexão inválida', 
        description: 'A conexão selecionada não é do tipo Baileys. Use Meta Cloud API para conexões Meta.' 
      }, { status: 400 });
    }

    if (connection.status !== 'connected') {
      return NextResponse.json({ 
        error: 'Conexão desconectada', 
        description: 'A conexão Baileys precisa estar ativa. Escaneie o QR Code novamente.' 
      }, { status: 400 });
    }

    // VALIDAÇÃO 2: Ownership de listas de contatos
    const ownedLists = await db
      .select({ id: contactLists.id })
      .from(contactLists)
      .where(and(
        eq(contactLists.companyId, companyId),
        inArray(contactLists.id, campaignData.contactListIds)
      ));

    if (ownedLists.length !== campaignData.contactListIds.length) {
      return NextResponse.json({ 
        error: 'Lista(s) inválida(s)', 
        description: 'Uma ou mais listas não existem ou não pertencem à sua empresa.' 
      }, { status: 403 });
    }

    // VALIDAÇÃO 3: Listas não vazias
    const listsWithContacts = await db
      .select({ listId: contactsToContactLists.listId })
      .from(contactsToContactLists)
      .where(inArray(contactsToContactLists.listId, campaignData.contactListIds))
      .groupBy(contactsToContactLists.listId);

    const listIdsWithContacts = new Set(listsWithContacts.map(l => l.listId));
    const emptyLists = campaignData.contactListIds.filter(id => !listIdsWithContacts.has(id));

    if (emptyLists.length > 0) {
      return NextResponse.json({ 
        error: 'Lista(s) vazia(s)', 
        description: `${emptyLists.length} lista(s) selecionada(s) não possui(em) contatos.` 
      }, { status: 400 });
    }

    // CRIAR CAMPANHA BAILEYS
    // Baileys não usa templates Meta, mas armazenamos messageText no campo 'message' da campanha
    
    const isScheduled = !!campaignData.schedule;
    const schedule = campaignData.schedule;

    const [newCampaign] = await db.insert(campaigns).values({
      companyId: companyId,
      name: campaignData.name,
      channel: 'WHATSAPP',
      status: isScheduled ? 'SCHEDULED' : 'QUEUED',
      connectionId: campaignData.connectionId,
      templateId: null, // Baileys não usa templates Meta
      message: campaignData.messageText, // TEXTO SIMPLES armazenado aqui
      variableMappings: campaignData.variableMappings,
      mediaAssetId: null, // Baileys não suporta mídia em campanhas
      scheduledAt: schedule ? new Date(schedule) : null,
      contactListIds: campaignData.contactListIds,
      batchSize: 20, // Limite conservador para Baileys
      batchDelaySeconds: 60, // 1 minuto entre lotes
    }).returning();

    if (!newCampaign) {
      throw new Error("Falha ao criar campanha Baileys.");
    }

    // PROCESSAMENTO AUTOMÁTICO VIA CRON
    // O endpoint /api/v1/campaigns/trigger busca campanhas com status QUEUED ou SCHEDULED
    // Não precisa adicionar ao Redis - o cron job já processa automaticamente
    // Campanhas QUEUED são processadas na próxima execução do cron (a cada 60 segundos)
    // Campanhas SCHEDULED são processadas quando scheduledAt <= now

    return NextResponse.json({ 
      success: true,
      message: isScheduled 
        ? `Campanha "${campaignData.name}" agendada com sucesso!` 
        : `Campanha "${campaignData.name}" criada e será processada em breve.`,
      campaignId: newCampaign.id
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Dados inválidos', 
        details: error.errors 
      }, { status: 400 });
    }

    console.error('Erro ao criar campanha Baileys:', error);
    return NextResponse.json({ 
      error: 'Erro interno', 
      description: (error as Error).message 
    }, { status: 500 });
  }
}
```

**Diferenças-Chave da API Meta:**
1. ✅ Valida `connectionType === 'baileys'`
2. ✅ `templateId` é `null` (Baileys não usa templates Meta)
3. ✅ `message` campo contém texto simples com variáveis `{{1}}`, `{{2}}`
4. ✅ `mediaAssetId` sempre `null` (validado no frontend também)

---

### Fase 3: Backend - Adaptações no Processamento (1 dia)

#### 3.1 Adaptar `sendWhatsappCampaign` para Campanhas sem Template

**Arquivo:** `src/lib/campaign-sender.ts`

**Problema Atual:**
```typescript
// Linha 319-324
let template = (await db.select().from(templates).where(eq(templates.id, campaign.templateId)))[0];
if (!template) {
    template = (await db.select().from(messageTemplates).where(eq(messageTemplates.id, campaign.templateId)))[0] as any;
}
if (!template) throw new Error(`Template ID ${campaign.templateId} não encontrado.`);
```

**Solução Proposta:**

```typescript
// MODIFICAÇÃO na função sendWhatsappCampaign()

export async function sendWhatsappCampaign(campaign: typeof campaigns.$inferSelect): Promise<void> {
    await db.update(campaigns).set({ status: 'SENDING' }).where(eq(campaigns.id, campaign.id));

    try {
        if (!campaign.companyId) throw new Error(`Campanha ${campaign.id} sem companyId.`);
        if (!campaign.connectionId) throw new Error(`Campanha ${campaign.id} sem connectionId.`);
        if (!campaign.contactListIds || campaign.contactListIds.length === 0) {
            await db.update(campaigns).set({ status: 'COMPLETED', completedAt: new Date() }).where(eq(campaigns.id, campaign.id));
            return;
        }

        const [connection] = await db.select().from(connections).where(eq(connections.id, campaign.connectionId));
        if (!connection) throw new Error(`Conexão ID ${campaign.connectionId} não encontrada.`);

        const isBaileys = connection.connectionType === 'baileys';

        // NOVA LÓGICA: Campanhas Baileys usam campo 'message' ao invés de template
        let resolvedTemplate: ResolvedTemplate;

        if (isBaileys && campaign.message) {
            // CAMPANHA BAILEYS (texto simples)
            resolvedTemplate = {
                name: 'baileys_text_campaign',
                language: 'pt_BR',
                bodyText: campaign.message,
                headerType: null,
                hasMedia: false,
            };
        } else {
            // CAMPANHA META API (template estruturado)
            if (!campaign.templateId) throw new Error(`Campanha Meta ${campaign.id} sem templateId.`);

            let template = (await db.select().from(templates).where(eq(templates.id, campaign.templateId)))[0];
            if (!template) {
                template = (await db.select().from(messageTemplates).where(eq(messageTemplates.id, campaign.templateId)))[0] as any;
            }
            if (!template) throw new Error(`Template ID ${campaign.templateId} não encontrado.`);

            resolvedTemplate = resolveTemplate(template);

            // Validação de mídia para Meta API
            if (resolvedTemplate.hasMedia && !campaign.mediaAssetId) {
                throw new Error(`Campanha Meta ${campaign.id} exige mídia mas nenhuma foi fornecida.`);
            }
        }

        // ... resto do código continua igual
        const contactIdsSubquery = db
            .select({ contactId: contactsToContactLists.contactId })
            .from(contactsToContactLists)
            .where(inArray(contactsToContactLists.listId, campaign.contactListIds));
        
        const campaignContacts = await db
            .select()
            .from(contacts)
            .where(inArray(contacts.id, contactIdsSubquery));

        if (campaignContacts.length === 0) {
            await db.update(campaigns).set({ status: 'COMPLETED', completedAt: new Date() }).where(eq(campaigns.id, campaign.id));
            return;
        }

        const batchSize = campaign.batchSize || 100;
        const batchDelaySeconds = campaign.batchDelaySeconds || 5;
        const contactBatches = chunkArray(campaignContacts, batchSize);

        for (const [index, batch] of contactBatches.entries()) {
            console.log(`[Campanha WhatsApp ${campaign.id}] Lote ${index + 1}/${contactBatches.length} com ${batch.length} contatos.`);

            const variableMappings = campaign.variableMappings as Record<string, { type: 'dynamic' | 'fixed', value: string }> || {};

            // sendCampaignMessage JÁ ROTEARÁ CORRETAMENTE baseado em connectionType
            const sendPromises = batch.map(contact => 
                sendCampaignMessage(connection, contact, resolvedTemplate, variableMappings, campaign)
            );

            const results = await Promise.allSettled(sendPromises);

            // Salvar delivery reports...
            const deliveryReports = results.map(result => { /* ... */ });
            await db.insert(whatsappDeliveryReports).values(deliveryReports);

            if (index < contactBatches.length - 1) {
                await sleep(batchDelaySeconds * 1000);
            }
        }

        await db.update(campaigns).set({ status: 'COMPLETED', completedAt: new Date() }).where(eq(campaigns.id, campaign.id));

    } catch (error) {
        console.error(`[Campanha WhatsApp ${campaign.id}] Erro fatal:`, error);
        await db.update(campaigns).set({ status: 'FAILED' }).where(eq(campaigns.id, campaign.id));
        throw error;
    }
}
```

**Mudanças Detalhadas:**

1. ✅ **Detecção de Tipo:** `isBaileys && campaign.message` → caminho Baileys
2. ✅ **Para Baileys:** 
   - Cria `resolvedTemplate` sintético com `bodyText = campaign.message`
   - `templateId` permanece `null` no DB
   - Variáveis `{{1}}`, `{{2}}` serão substituídas por `sendViaBaileys()` (já implementado)
3. ✅ **Para Meta API:** 
   - Busca template do DB (lógica existente mantida)
   - `templateId` obrigatório
4. ✅ **Fluxo Unificado:** 
   - Processamento de lotes IDÊNTICO para ambos
   - `sendCampaignMessage()` roteia baseado em `connection.connectionType`
   - Delivery reports salvos em `whatsapp_delivery_reports` com `providerMessageId` (BAE_xxx para Baileys, wamid.xxx para Meta)

**Impacto em Relatórios e Analytics:**
- Campanhas Baileys terão `templateId = null` → filtrar relatórios por tipo de conexão, não por template
- Queries de analytics devem considerar: `WHERE templateId IS NOT NULL` (Meta) vs `WHERE templateId IS NULL` (Baileys)
- Dashboard: adicionar métrica separada "Campanhas Baileys" vs "Campanhas Meta API"

---

### Fase 4: Melhorias de UX (1 dia)

#### 4.1 Tabela de Campanhas Baileys

**Arquivo:** `src/components/campaigns/baileys-campaign-table.tsx`

Reutilizar `CampaignTable` existente com filtro:
```typescript
<CampaignTable 
  channel="WHATSAPP" 
  connectionTypeFilter="baileys"  // NOVO FILTRO
/>
```

Ou criar componente dedicado que mostra:
- Nome da campanha
- Conexão Baileys usada
- Status (QUEUED, SENDING, COMPLETED, FAILED)
- Total de contatos
- Enviadas/Falhas
- Data de criação/conclusão
- Ações: Ver relatório

#### 4.2 Página de Relatório de Campanha Baileys

Reutilizar `/campaigns/[campaignId]/report` existente:
- Já suporta delivery reports de ambos provedores
- Apenas adicionar indicador visual quando `providerMessageId` começa com "BAE_" (Baileys)

#### 4.3 Avisos e Documentação

**No CreateBaileysCampaignDialog:**
```
📌 Limitações de Campanhas Baileys:
• Apenas mensagens de texto simples
• Sem suporte a mídia (imagens, vídeos, documentos)
• Sem botões interativos ou templates estruturados
• Taxa de envio: ~20 mensagens/minuto (para evitar ban)

Para campanhas com mídia ou templates complexos, use Meta Cloud API.
```

**No Menu da Aplicação:**
- Tooltip no item "Campanhas Baileys": "WhatsApp via QR Code (texto simples)"
- Tooltip no item "Campanhas" (Meta): "WhatsApp via Meta Cloud API (mídia e templates)"

---

## Diagrama de Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                     CRIAÇÃO DE CAMPANHA                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │  Usuário escolhe tipo  │
                 └────────────────────────┘
                              │
                ┌─────────────┴──────────────┐
                │                            │
                ▼                            ▼
    ┌────────────────────┐      ┌────────────────────────┐
    │   Meta Cloud API   │      │      Baileys (QR)      │
    │    /templates      │      │  /campaigns-baileys    │
    └────────────────────┘      └────────────────────────┘
                │                            │
                │                            │
    ┌───────────▼────────────┐  ┌───────────▼────────────┐
    │ CreateWhatsappCampaign │  │ CreateBaileysCampaign  │
    │        Dialog          │  │        Dialog          │
    └───────────┬────────────┘  └───────────┬────────────┘
                │                            │
                │ POST                       │ POST
                ▼                            ▼
    /api/v1/campaigns/whatsapp  /api/v1/campaigns/baileys
                │                            │
                │ Insere em DB               │ Insere em DB
                ▼                            ▼
          campaigns (table)            campaigns (table)
          - templateId: UUID           - templateId: NULL
          - message: NULL              - message: "Texto..."
          - mediaAssetId: UUID         - mediaAssetId: NULL
          - channel: WHATSAPP          - channel: WHATSAPP
          - status: QUEUED             - status: QUEUED
                │                            │
                └────────────┬───────────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │ CRON: /api/v1/campaigns/    │
              │        trigger              │
              └─────────────────────────────┘
                             │
                             ▼
                  sendWhatsappCampaign()
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
      template? NULL            template? EXISTS
         (Baileys)                  (Meta API)
                │                         │
                ▼                         ▼
    resolvedTemplate =        resolvedTemplate = 
    {                         resolveTemplate(template)
      bodyText: campaign.
      message,
      hasMedia: false
    }
                │                         │
                └────────────┬────────────┘
                             │
                             ▼
                sendCampaignMessage(connection, contact, resolvedTemplate, ...)
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    connectionType ===        connectionType === 
        'baileys'                  'meta_api'
                │                         │
                ▼                         ▼
      sendViaBaileys()          sendViaMetaApi()
      (SessionManager)          (Graph API)
                │                         │
                └────────────┬────────────┘
                             │
                             ▼
            whatsapp_delivery_reports (table)
              - providerMessageId
              - status: SENT/FAILED
              - failureReason
```

---

## Checklist de Implementação

### Frontend
- [ ] Criar `/campaigns-baileys` page
- [ ] Criar `CreateBaileysCampaignDialog` component
- [ ] Criar `BaileysCampaignTable` component (ou adaptar existente)
- [ ] Adicionar item no menu de navegação
- [ ] Implementar validações frontend (sem mídia, conexão Baileys)
- [ ] Adicionar avisos/tooltips sobre limitações Baileys

### Backend
- [ ] Criar endpoint `POST /api/v1/campaigns/baileys`
- [ ] Adicionar validação `connectionType === 'baileys'`
- [ ] Modificar `sendWhatsappCampaign()` para suportar campanhas sem template
- [ ] Adicionar lógica para criar `resolvedTemplate` de `campaign.message`
- [ ] Testar roteamento híbrido em `sendCampaignMessage()`

### Testes
- [ ] Teste manual: criar campanha Baileys texto simples
- [ ] Verificar envio via SessionManager
- [ ] Validar delivery reports com `providerMessageId` Baileys
- [ ] Teste: tentar criar campanha Baileys com conexão Meta (deve falhar)
- [ ] Teste: tentar criar campanha Meta com conexão Baileys (deve falhar)

### Documentação
- [ ] Atualizar `replit.md` com novo fluxo de campanhas Baileys
- [ ] Adicionar screenshots do novo fluxo
- [ ] Documentar limitações e diferenças Baileys vs Meta API

---

## Riscos e Mitigações

### Risco 1: Confusão do Usuário Entre Dois Tipos
**Mitigação:**
- Separação clara no menu: "Campanhas Meta API" vs "Campanhas Baileys"
- Avisos visuais explicando diferenças
- Nomes descritivos: "Campanhas WhatsApp (Templates Meta)" e "Campanhas WhatsApp (Texto Simples Baileys)"

### Risco 2: Usuário Tenta Enviar Mídia via Baileys
**Mitigação:**
- Validação frontend: esconder componente de upload de mídia
- Validação backend: rejeitar request se `mediaAssetId` não for null
- Mensagem clara: "Use Meta Cloud API para enviar campanhas com mídia"

### Risco 3: Bug em Campanhas Meta Existentes
**Mitigação:**
- Mudanças mínimas no código existente
- Nova lógica encapsulada em bloco `if (isBaileys && campaign.message)`
- Testes de regressão: criar campanha Meta e verificar que funciona como antes
- Rollback fácil: remover rota `/api/v1/campaigns/baileys` e novo bloco if

### Risco 4: Taxa de Envio Baileys Causando Ban
**Mitigação:**
- Documentar limite recomendado: 20 mensagens/minuto
- Adicionar campo `batchSize` e `batchDelaySeconds` na criação de campanha Baileys
- Sugestões padrão: batchSize=20, batchDelaySeconds=60 (1 minuto entre lotes)
- Avisar usuário: "Envios muito rápidos podem resultar em bloqueio temporário"

---

## Estimativa de Esforço

| Fase | Descrição | Tempo Estimado |
|------|-----------|----------------|
| 1 | UI - Página e Dialog Baileys | 2-3 dias |
| 2 | Backend - API `/api/v1/campaigns/baileys` | 1-2 dias |
| 3 | Backend - Adaptações em `sendWhatsappCampaign` | 1 dia |
| 4 | UX - Tabelas, relatórios, avisos | 1 dia |
| 5 | Testes e Ajustes Finais | 1 dia |
| **TOTAL** | | **6-8 dias** |

---

## Conclusão

Este plano implementa campanhas Baileys de forma **não invasiva** ao sistema existente:

✅ **Zero impacto em campanhas Meta API** - código Meta permanece intacto
✅ **Reutilização máxima** - mesmo backend de processamento, delivery reports, queue
✅ **Separação clara** - UIs diferentes, validações específicas, avisos apropriados
✅ **Escalabilidade** - pode adicionar mais tipos de campanha no futuro (ex: SMS) sem refatoração

**Próximos Passos:**
1. Aprovar plano com stakeholders
2. Criar branch de feature: `feature/baileys-campaigns`
3. Implementar Fase 1 (UI)
4. Code review + testes
5. Implementar Fases 2-4
6. Testes de integração completos
7. Deploy gradual (beta para alguns usuários primeiro)
