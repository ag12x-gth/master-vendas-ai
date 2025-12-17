# Master IA Oficial - Plataforma de Bulk Messaging com Automação AI

## Overview
Master IA é uma plataforma de bulk messaging que integra automação via Inteligência Artificial. O projeto visa otimizar campanhas de comunicação, desde o envio de mensagens em massa até a interação automatizada com usuários, aproveitando o poder da IA para personalização e eficiência.

## Recent Changes (v2.7.0) - UI SMART FIELDS FOR WEBHOOKS ✅
- **17/12/2025 00:30Z - FEATURE CONCLUÍDO**: ✅ Smart rendering de campos baseado em webhook

  **IMPLEMENTAÇÃO:**
  1. ✅ Quando triggerEvent começa com "webhook_" (webhook_order_approved, webhook_pix_created, webhook_lead_created)
  2. ✅ Em "3. Ações (Então)" → Aparecer APENAS dropdown "Template (Opcional)"
  3. ✅ Campos "Conexão" e "Mensagem" ficam OCULTOS para webhooks
  4. ✅ Para eventos normais: Manter comportamento anterior (todos os campos visíveis)
  
  **PROBLEMA RESOLVIDO:**
  - ❌ ANTES: Usuário vê campos desnecessários (Conexão, Mensagem) quando usa webhook
  - ✅ DEPOIS: UI inteligente mostra APENAS Template para webhooks
  
  **FICHEIROS MODIFICADOS v2.7.0:**
  - `src/components/automations/automation-rule-form.tsx`: renderActionValueInput (lines 102-179)
    - Adicionado: `const isWebhookTrigger = triggerEvent?.startsWith('webhook_')`
    - Adicionado: Renderização condicional → APENAS Template para webhooks
    - Mantém: Conexão + Template + Mensagem para eventos normais

## Fluxo Aprimorado: WEBHOOK → AUTOMAÇÃO → WHATSAPP (v2.7.0)
```
1. [WEBHOOK] Evento recebido via APICloud/Grapfy (order_approved, pix_created)
   ↓
2. [TRIGGER] Usuário cria regra de automação
   - Seção 1: Seleciona webhook_order_approved + conexão(ões)
   ↓
3. [UI SMART] Seção 3 renderiza APENAS Template
   - Campo "Conexão" ← OCULTO (já selecionado em Seção 1)
   - Campo "Template (Opcional)" ← VISÍVEL
   - Campo "Mensagem" ← OCULTO (usar template é a prioridade)
   ↓
4. [AUTO-HERANÇA] Frontend herda connectionId automaticamente
   - Usa selectedConnectionIds da Seção 1
   ↓
5. [VALIDAÇÃO] Backend valida com mensagem clara
   - Sucesso: 201 Created
   - Erro: 400 com instruções específicas
   ↓
6. [SEND] sendUnifiedMessage() → APICloud WhatsApp
```

## Eventos Webhook Suportados (v2.7.0)
- webhook_pix_created: {{customer_name}}, {{pix_value}}, {{pix_code}}, {{order_id}}
- webhook_order_approved: {{customer_name}}, {{order_value}}, {{product_name}}, {{order_id}}
- webhook_lead_created: {{customer_name}}, {{customer_email}}, {{product_name}}

## Melhorias Implementadas (v2.7.0)

### 1. Smart Fields Rendering para Webhooks
```typescript
const isWebhookTrigger = triggerEvent?.startsWith('webhook_');

// Se webhook → mostrar APENAS Template
if (isWebhookTrigger) {
  return <Template dropdown only />;
}

// Se normal → mostrar Conexão + Template + Mensagem
return <div>Conexão + Template + Mensagem</div>;
```

### 2. UX Simplificada para Webhooks
- Redução de cliques: 3 campos → 1 campo (Template)
- Menos confusion: Usuário foca no que importa (template)
- Fluxo claro: Webhook → Template → Salvar

### 3. Validação Backend Mantida
- Verifica connectionId automaticamente
- Mensagens de erro descritivas
- Suporta send_message_apicloud e send_message_baileys

### 4. Responsiveness Mobile (Mantido)
- Modal: max-h-[90vh] overflow-y-auto ✅
- Inputs: w-full em mobile ✅
- Breakpoints: 320px, 375px, 425px ✅

## Testing Checklist v2.7.0
- ✅ Servidor rodando: Next.js 14.2.35 OK
- ✅ Compilação: Sem erros
- ✅ Smart fields: Webhook → APENAS Template
- ✅ Smart fields: Normal → Conexão + Template + Mensagem
- ✅ Auto-herança connectionId: Funcionando
- ✅ Responsiveness: 320px+ validado
- ✅ Form: Renderiza sem erros

## Próximas Etapas (Não incluídas nesta sprint)
1. Testar fluxo completo com webhook real
2. Validar integração APICloud/Baileys
3. Performance tuning para 100+ automações
4. Testes E2E em CI/CD
5. Testes de regressão completos

## Arquivos Principais (v2.7.0)
- `src/lib/automation-engine.ts` - Core: interpolação, triggers, execução
- `src/components/automations/automation-rule-form.tsx` - UI: formulário com smart fields (MELHORADO)
- `src/app/api/v1/automations/route.ts` - API: validação
- `src/services/unified-message-sender.service.ts` - Envio unificado APICloud/Baileys
- `src/lib/webhooks/incoming-handler.ts` - Roteamento de webhooks

## Conhecimento Técnico Extraído

### PROTOCOLO_SMART_FIELDS_RENDERING_V1 ⭐ NOVO
- **Objetivo**: Renderização inteligente de campos baseado no tipo de evento
- **Implementação**: Validação de triggerEvent?.startsWith('webhook_')
- **Benefício**: UX simplificada (3 campos → 1 campo para webhooks)
- **Aplicabilidade**: Reduz cognitiva load do usuário

### PROTOCOLO_CONNECTIONID_INHERITANCE_V1
- **Problema**: Campo "Conexão" vazio em Seção 3 causa POST 400
- **Solução**: Auto-herança de connectionId da Seção 1 no frontend
- **Benefício**: Reduz fricção no UX (não requer dupla seleção)
- **Validação**: Backend valida com mensagens claras

### PROTOCOLO_IMPROVED_VALIDATION_MESSAGES_V1
- **Problema**: Erro genérico "Dados inválidos" confunde usuário
- **Solução**: Erro 400 com details.message, details.field, details.fix
- **Benefício**: Usuário sabe exatamente o que falta e como corrigir
- **Aplicabilidade**: Todos os endpoints POST/PUT

### PROTOCOLO_RESPONSIVENESS_MOBILE_FIRST_V1
- **CSS Classes**: max-h-[90vh], overflow-y-auto, w-full, sm:max-w-3xl
- **Breakpoints**: 320px (mobile), 768px (tablet), 1024px (desktop)
- **Tested**: iPhone SE, iPhone 12, iPad Mini, Desktop

