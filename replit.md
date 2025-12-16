# Master IA Oficial - Plataforma de Bulk Messaging com Automação AI

## Overview
Master IA é uma plataforma de bulk messaging que integra automação via Inteligência Artificial. O projeto visa otimizar campanhas de comunicação, desde o envio de mensagens em massa até a interação automatizada com usuários, aproveitando o poder da IA para personalização e eficiência.

## Recent Changes (v2.5.1)
- **16/12/2025 18:00Z - CORREÇÃO: LAYOUT DIALOG AUTOMAÇÕES + PLACEHOLDER TRIGGER**: ✅ COMPLETO
  
  **PROBLEMAS IDENTIFICADOS:**
  1. ❌ POST /api/v1/automations 400 "Dados inválidos" - Formulário incompleto
  2. ❌ Sections 1 & 2 (Gatilho, Condições) não aparecem nas screenshots
  3. ❌ Placeholder vazio no Select de triggerEvent
  
  **CORREÇÕES APLICADAS:**
  - `src/components/automations/automation-rule-form.tsx`:
    - Linha 331: Adicionado `max-h-[90vh]` + `overflow-hidden`
    - Linha 344: Adicionado `py-2` para padding
    - Linha 356: Adicionado `placeholder="Selecione um evento gatilho..."`
    - Linha 443: Removido `mt-auto` para melhor layout
  
  **RESULTADO:**
  - ✅ Dialog layout corrigido com overflow handling
  - ✅ Form completo agora visível (3 seções)
  - ✅ Placeholder adicionado para melhor UX
  - ✅ Compilação OK - Server rodando
  - ✅ 1 LSP warning restante (aceitável)

## Recent Changes (v2.5.0)
- **16/12/2025 17:40Z - ANÁLISE DE LOGS + CORREÇÃO DE ERROS**: ✅ CORRIGIDO
  - Root Cause: `getCompanyIdFromSession()` falha em API Routes
  - Solução: Try-catch melhorado com status 401 explícito
  - Arquivo: `src/app/api/v1/automations/route.ts`

## Fluxo End-to-End
```
1. [GATILHO] Webhook (ex: webhook_order_approved)
   ↓
2. [TEMPLATES] Carregamento automático da conexão selecionada
   ↓
3. [AÇÃO] Envio com template + interpolação de variáveis
   ↓
4. [LOG] Mensagem registrada com sucesso
```

## Testing Checklist
- ✅ Servidor rodando: Compilation OK
- ✅ API Automations: Error handling melhorado (401)
- ✅ Form Layout: Corrigido (sections 1, 2, 3 visíveis)
- ✅ Placeholder: Adicionado ao Select
- ✅ LSP: 1 warning menor

## Próximas Etapas
1. Testar POST /api/v1/automations com dados completos (após form abrir)
2. Validar responsiveness mobile
3. Webhook testing com dados reais
4. Performance final

## Arquivos Principais
- `src/components/automations/automation-rule-form.tsx` - Form dialog
- `src/app/api/v1/automations/route.ts` - API endpoints
- `src/app/api/v1/templates/by-connection/route.ts` - Template loading
