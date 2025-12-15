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

## Recent Changes (v2.4.4)
- **15/12/2025 20:02Z - CONCLUSÃO**: Webhooks Grapfy Totalmente Operacional ✅
  - **PROBLEMA RESOLVIDO**: URL alterada na Grapfy para domínio correto Master IA
  - **TESTE VALIDADO**: Webhook recebido com sucesso - EventID: 50acb2f4-aff1-41d1-8d08-faf60dc5ba76
  - **Health Check**: `{"status":"healthy","timestamp":"2025-12-15T20:02:35.849Z"}`
  - **Contatos Recuperados**: 4 contatos criados (3 de eventos perdidos + 1 teste)
  - **Eventos no Banco**: 2 eventos confirmados processados
  - **Bug corrigido**: Removida coluna `document` do INSERT (webhook-campaign-trigger.service.ts)
  - **Logging Melhorado**: `logWebhookConfig()` implementado em incoming-handler.ts
  - **Status Final**: 🟢 PRONTO PARA PRODUÇÃO - Reenvie os 4 eventos falhados na Grapfy

## Recent Changes (v2.4.3)
- **13/12/2025**: Cobertura 100% de agentes IA implementada:
  - **41 novos agentes** "Atendente Virtual" criados para empresas sem agentes
  - **70 agentes IA totais** (45 empresas = 100% cobertura)
  - **4473 conversas** atualizadas para terem agente atribuído
  - **12/12 conexões** WhatsApp com agente configurado (100%)
  - **API OpenAI** testada e funcionando (16 tokens confirmados)
  - Sistema pronto para produção com resposta automática via IA
- **13/12/2025**: Nova OPENAI_API_KEY configurada (projeto openai_agentes_proj_M0hXybXJ_send_gmail):
  - Chave atualizada via Replit Secrets (seguro)
  - Workflow reiniciado para carregar nova chave
  - Servidor funcionando sem erros de quota nos logs
  - Sistema pronto para automação IA em produção
- **13/12/2025**: Validação completa do sistema:
  - **45 empresas** confirmadas no banco de dados
  - **100% cobertura** de credenciais OpenAI para todas as empresas (45/45)
  - **268 notificações** de quota esgotada criadas e entregues corretamente
  - **Sistema de fallback** funcionando: mensagens enviadas mesmo com quota excedida
  - **UI responsiva** validada via screenshot (login v2.4.2 renderizando corretamente)
- **13/12/2025**: Correção crítica de tratamento de erros OpenAI:
  - `insufficient_quota`: Fallback IMEDIATO sem retry + notificação automática ao admin
  - `rate_limit`: Mantém retry com backoff exponencial
  - Novo método `UserNotificationsService.notifyOpenAIQuotaExhausted()` para alertar administradores
- **13/12/2025**: OPENAI_API_KEY atualizada com créditos adicionados ($4.99). Workflow reiniciado para usar a chave com quota ativa. Sistema pronto para automação completa via IA.
- **12/12/2025**: Remoção completa de Gemini AI (não tinha cobertura de credenciais). Sistema agora suporta apenas OPENAI para IA, removidos 10 referências ao Gemini do código (enums, UI, libs).
- **Universal Credentials**: 225 credenciais distribuídas (45 cada: OPENAI, TWILIO, RETELL, RESEND) com cobertura 100% das 45 empresas.
- **Cadence Protocol**: Implementado delay de 81-210s para campanhas Baileys com fallback automático.