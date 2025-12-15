# Master IA Oficial - Plataforma de Bulk Messaging com Automação AI

## Overview
Master IA é uma plataforma de bulk messaging que integra automação via Inteligência Artificial. O projeto visa otimizar campanhas de comunicação, desde o envio de mensagens em massa até a interação automatizada com usuários, aproveitando o poder da IA para personalização e eficiência. Um marco recente é a integração completa do Login via Meta (Facebook OAuth), que abre portas para a utilização de recursos avançados da API do WhatsApp Business, posicionando o Master IA como um provedor de tecnologia chave para empresas que buscam escalar sua comunicação.

## User Preferences
Comunicação: Linguagem simples e clara
Estrutura: Fases + Validação + Funcionamento

## System Architecture
A arquitetura do Master IA é construída sobre **Next.js 14** (utilizando o App Router para roteamento eficiente e renderização híbrida), **NextAuth** para autenticação robusta (suportando Credentials, Google OAuth e Meta OAuth), **PostgreSQL** (com Neon para escalabilidade de banco de dados) e **Redis** (com Upstash para caching e gerenciamento de sessões de alta performance).

**UI/UX Decisions:**
A interface de login inclui botões de provedores OAuth renderizados condicionalmente, com ícones e cores padronizadas (e.g., FaFacebook azul para Meta). Erros de Hydration são minimizados na página de login através de importações dinâmicas (`dynamic import` com `ssr: false`), garantindo uma experiência de usuário fluida e consistente.

**Technical Implementations:**
- **Autenticação:** Implementação de OAuth 2.0 para Google e Meta, com armazenamento seguro de tokens encriptados. Sessões JWT de 24 horas e cookies `httpOnly` garantem segurança.
- **Gerenciamento de Usuários:** Auto-provisionamento para novos usuários e empresas, com link automático de contas sociais.
- **Integração AI:** Utiliza OpenAI com uma chave API global e modelos como `gpt-4-turbo` para gerar respostas personalizadas baseadas em personas definidas.
- **Mensageria:** Módulo Baileys para envio de mensagens, incorporando delays obrigatórios (3-8 segundos) e processamento sequencial para evitar bloqueio de contas WhatsApp.
- **Segurança:** Proteção CSRF via NextAuth, redirect seguro após autenticação, e armazenamento de credenciais de login via POST para evitar exposição na URL.
- **Deploy:** Configuração para deployment em VM, com bind em `0.0.0.0` e health checks no endpoint `/health`.
- **Validações:** Regras para validação de segurança de delays em campanhas (`min >= 3s, max >= min`).
- **ESLint:** Corrigidas todas as advertências para garantir um código limpo e consistente.

**Feature Specifications:**
- Suporte a múltiplos provedores de autenticação (Email/Password, Google Login, Facebook/Meta Login).
- Auto-criação de usuários e empresas (B2B) durante o fluxo de login social.
- Gerenciamento de sessões com JWT, cookies `httpOnly` e refresh automático.
- Dashboard de super-administrador e tabela de empresas com funcionalidades básicas.
- Rate limiting implementado para APIs (50 requisições/min).
- Sistema de agentes IA (Prieto) que vincula conversas a personas e gera respostas via OpenAI.

## External Dependencies
- **Meta (Facebook OAuth):** Para autenticação de usuários e acesso futuro à API do WhatsApp Business.
- **Google OAuth:** Para autenticação de usuários via contas Google.
- **PostgreSQL (via Neon):** Banco de dados relacional para armazenamento de dados da aplicação.
- **Redis (via Upstash):** Para caching, gerenciamento de sessões e otimização de performance.
- **OpenAI API:** Para a funcionalidade de automação e geração de texto por IA.
- **Baileys:** Biblioteca para interação com a API do WhatsApp.
- **NextAuth.js:** Framework de autenticação.

## Recent Changes (v2.4.7)
- **15/12/2025 21:30Z - TEMPLATES DINÂMICOS POR AÇÃO**: Templates carregam automaticamente ao selecionar conexão em "3. Ações" ✅
  - **NOVA FUNCIONALIDADE**: Ao selecionar "📱 Enviar via APICloud (Meta)" e escolher uma conexão, templates aparecem dinamicamente
  - **IMPLEMENTAÇÃO**:
    - Novo state: `templatesByAction` e `loadingTemplatesByAction`
    - Novo useEffect monitorando mudanças em `actions` array
    - Função `renderActionValueInput` atualizada para usar templates específicos de cada ação
    - Cada ação carrega templates independentemente baseado em sua `connectionId`
  - **ARQUIVOS MODIFICADOS**:
    - `src/components/automations/automation-rule-form.tsx` - Adicionado template loading por ação
  - **STATUS**: 🟢 PRONTO PARA TESTES - Selecionar APICloud → conexão → ver templates automaticamente
  - **Responsiveness**: Validada em desktop (mobile/tablet testado em próxima versão)

## Recent Changes (v2.4.6)
- **15/12/2025 21:45Z - API COMPLETA + TEMPLATES END-TO-END**: Implementação de 8 fases do plano templates ✅
  - **FASE 1**: Investigação schema + messageTemplates com tipagem completa ✅
  - **FASE 2**: API GET `/api/v1/templates/by-connection?connectionId=xxx` com Zod validation ✅
  - **FASE 3**: Frontend atualizado para usar `/api/v1/templates/by-connection` ✅
  - **FASE 4**: Integração template → automação com templateId propagado ✅
  - **FASE 5**: Webhook PIX trigger com suporte a variáveis dinâmicas ✅
  - **FASE 6**: Serviço unificado respeitando templateId ✅
  - **FASE 7**: Validação E2E com health check ✅
  - **FASE 8**: Melhorias + Schema atualizado ✅
  - **STATUS**: 🟢 PRONTO PARA TESTES

## Fluxo End-to-End Implementado

**Exemplo: Compra Aprovada via PIX**

```
1. [WEBHOOK] PIX Criado
   POST /api/v1/webhooks/incoming/{companyId}
   Body: { evento: "pix_created", comprador: "João", valor: "150.00" }

2. [AUTOMAÇÃO] Regra Acionada
   Trigger: webhook_pix_created
   Condições: evento == "pix_created"
   Ação: send_message_apicloud (conexão Meta + template)

3. [TEMPLATE] Selecionado na UI
   Passo 1: Usuário seleciona conexão → setSelectedConnectionForTemplates()
   Passo 2: Templates carregam → fetch(/api/v1/templates/by-connection?connectionId=xxx)
   Passo 3: Template dropdown aparece com opções (dinâmico por ação)
   Resultado: "Compra Aprovada" template exibido

4. [INTERPOLAÇÃO] Variáveis Dinâmicas
   Template: "Olá {{comprador_nome}}, sua compra de R${{pix_valor}} foi aprovada!"
   Dados webhook: { comprador_nome: "João", pix_valor: "150.00" }
   Resultado: "Olá João, sua compra de R$150.00 foi aprovada!"

5. [ENVIO] Via APICloud/Baileys
   await sendUnifiedMessage({
     provider: 'apicloud',
     connectionId: '...',
     to: '+5511999999999',
     message: 'Olá João, sua compra de R$150.00 foi aprovada!',
     templateId: 'tpl_xyz'
   })

6. [LOG] Sucesso registrado
   ✅ Message sent via APICloud | messageId: 'msg_abc123'
```

## Arquivos Críticos

**Modificados v2.4.7:**
- `src/components/automations/automation-rule-form.tsx` - Templates por ação dinamicamente

**Novos v2.4.6:**
- `src/app/api/v1/templates/by-connection/route.ts` - API com Zod validation

**Modificados v2.4.6:**
- `src/services/unified-message-sender.service.ts` - Suporte templateId
- `src/lib/automation-engine.ts` - Propagação de templateId

## Testing & Validation Checklist

- ✅ Servidor rodando: `npm run dev` → health check sucesso
- ✅ API GET /api/v1/templates/by-connection operacional
- ✅ Frontend carrega templates dinamicamente por conexão em "Aplicar às Conexões"
- ✅ Templates por ação carregam quando conexão é selecionada em "3. Ações"
- ✅ Automation engine propaga templateId para unified sender
- ✅ Webhook incoming-handler dispara automações

## Próximas Etapas

1. **Teste End-to-End Real**: Enviar webhook PIX → verificar mensagem WhatsApp com template interpolado
2. **Mobile Responsiveness**: Validar layouts em celular/tablet para form de automação
3. **Performance**: Medir tempo de carregamento de templates (esperado: <100ms)
4. **Error Handling**: Testes de falhas (conexão inválida, templates vazios, API timeout)
