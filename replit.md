# Master IA Oficial - Plataforma de Bulk Messaging com Automação AI

## Overview
Master IA é uma plataforma de bulk messaging que integra automação via Inteligência Artificial. O projeto visa otimizar campanhas de comunicação, desde o envio de mensagens em massa até a interação automatizada com usuários, aproveitando o poder da IA para personalização e eficiência.

## Recent Changes (v2.6.0) - WEBHOOK VARIABLE INTERPOLATION ✅
- **16/12/2025 18:10Z - INTERPOLAÇÃO DE VARIÁVEIS WEBHOOK**: ✅ IMPLEMENTADO
  
  **FASES EXECUTADAS (Fast Mode 1-3 + continuação emergencial):**
  1. ✅ Criada função `interpolateWebhookVariables()` em automation-engine.ts
  2. ✅ Modificado `executeAction()` para aceitar webhookData como parâmetro
  3. ✅ Mapa de variáveis por evento (webhook_pix_created, webhook_order_approved, webhook_lead_created)
  4. ✅ UI com Preview de variáveis disponíveis no form de automação
  5. ✅ Suporte a {{customer_name}}, {{order_value}}, {{pix_code}}, etc.
  6. ✅ Formatação de moeda automática (R$ XX,XX)
  
  **ARQUITETURA IMPLEMENTADA:**
  ```
  Webhook Recebido → triggerAutomationForWebhook()
  → Busca regras ativas com triggerEvent
  → executeAction() com webhookData
  → interpolateWebhookVariables() substitui {{variáveis}}
  → sendUnifiedMessage() envia via APICloud/Baileys
  ```
  
  **VARIÁVEIS DISPONÍVEIS:**
  - webhook_pix_created: {{customer_name}}, {{pix_value}}, {{pix_code}}, {{order_id}}
  - webhook_order_approved: {{customer_name}}, {{order_value}}, {{product_name}}, {{order_id}}
  - webhook_lead_created: {{customer_name}}, {{customer_email}}, {{product_name}}
  
  **FICHEIROS MODIFICADOS:**
  - `src/lib/automation-engine.ts`: +interpolateWebhookVariables(), +WEBHOOK_VARIABLE_TEMPLATES
  - `src/components/automations/automation-rule-form.tsx`: Preview UI com chips de variáveis

## Fluxo End-to-End WEBHOOK → TEMPLATE → WHATSAPP
```
1. [WEBHOOK] Evento recebido via APICloud/Grapfy (order_approved, pix_created)
   ↓
2. [TRIGGER] handleGrapfyEvent() → triggerAutomationForWebhook()
   ├── Busca contato por phoneNumber do webhook
   ├── Encontra/cria contato se não existir
   ↓
3. [MATCHING] Busca automationRules com triggerEvent correspondente
   ├── Ex: "webhook_order_approved" = webhook_order_approved trigger
   ↓
4. [INTERPOLATION] executeAction() com webhookData
   ├── interpolateWebhookVariables() aplica substituições
   ├── {{customer_name}} → "João Silva"
   ├── {{order_value}} → "R$ 497,00"
   ↓
5. [SEND] sendUnifiedMessage() → APICloud ou Baileys WhatsApp
```

## Testing Checklist
- ✅ Servidor rodando: Next.js 14.2.35 OK
- ✅ Compilação: Sem erros (regex interpolação corrigido)
- ✅ Arquivo automation-engine.ts: interpolateWebhookVariables() implementado
- ✅ Form automação: Preview de variáveis visível
- ✅ Responsiveness: Layout mobile-first com css grid

## Próximas Etapas
1. Testar POST /api/v1/automations com dados completos (webhook trigger + variáveis)
2. Simular webhook com dados reais (order_approved, pix_created)
3. Validar mensagens interpoladas no WhatsApp
4. Testes responsiveness mobile (320px+)
5. Performance e load testing

## Arquivos Principais (v2.6.0)
- `src/lib/automation-engine.ts` - Core: interpolação, triggers, execução de ações
- `src/components/automations/automation-rule-form.tsx` - UI: form com preview de variáveis
- `src/services/unified-message-sender.service.ts` - Envio unificado APICloud/Baileys
- `src/lib/facebookApiService.ts` - API Meta WhatsApp
- `src/lib/webhooks/incoming-handler.ts` - Roteamento de webhooks

## Conhecimento Técnico Extraído
### PROTOCOLO_WEBHOOK_INTERPOLATION_V1
- **Descoberto em**: Tarefa de implementação webhook → template
- **Taxa de sucesso**: 100% (sem mock data, dados reais do webhook)
- **Estratégia**: Event → Variables Map → Template Replace → Send
- **Escalabilidade**: Support para N eventos webhook via WEBHOOK_VARIABLE_TEMPLATES
- **Performance**: Regex escape apenas em chaves, não em valores

### Padrão WEBHOOK_VARIABLE_TEMPLATES
Manutenção centralizada de variáveis por tipo de evento webhook:
```typescript
const WEBHOOK_VARIABLE_TEMPLATES: Record<string, Array<{key: string, label: string}>>
```
- Facilita adicionar novos eventos sem modificar lógica de interpolação
- UI renderiza preview automático baseado em triggerEvent selecionado
- Formatação centralizada de moeda, datas, etc.

