# Documentação do Projeto: ZAP Master MVP

## 1. Visão Geral

Bem-vindo à documentação oficial do **ZAP Master**, versão MVP (Minimum Viable Product). Este documento serve como a fonte central de verdade para desenvolvedores, stakeholders e futuros membros da equipe.

O ZAP Master é um painel de controle SaaS (Software as a Service) projetado para otimizar e automatizar a comunicação de empresas através do WhatsApp e SMS. A plataforma permite a gestão centralizada de contatos, o envio de campanhas em massa e o atendimento ao cliente através de uma caixa de entrada unificada.

- **Público-alvo:** Empresas de pequeno e médio porte que utilizam o WhatsApp como principal canal de vendas e suporte.
- **Funcionalidades Principais do MVP:**
  - Gestão de Conexões com a API Oficial da Meta (WhatsApp).
  - Gestão de Contatos (CRM) com importação de CSV.
  - Envio de Campanhas de WhatsApp e SMS.
  - Relatórios de Desempenho de Campanhas.
  - Caixa de Entrada Unificada para Atendimento.
  - Painel Kanban para gestão de funis de venda.

## 2. Stack de Tecnologias

A aplicação utiliza uma arquitetura moderna e robusta, baseada em TypeScript.

- **Frontend:**
  - **Framework:** Next.js (com App Router)
  - **Linguagem:** TypeScript
  - **UI:** React, ShadCN UI, Tailwind CSS
- **Backend:**
  - **Runtime:** Node.js (via API Routes do Next.js)
  - **ORM:** Drizzle ORM
  - **Autenticação:** JWT (JSON Web Tokens) armazenados em cookies httpOnly.
- **Base de Dados:**
  - **Principal:** PostgreSQL
  - **Cache & Filas:** Redis
- **Serviços Externos:**
  - **WhatsApp:** Meta (Facebook) Graph API
  - **SMS:** Gateways como Witi e Seven.io
  - **Hospedagem:** Firebase App Hosting
  - **Envio de Email:** AWS SES

## 3. Estrutura do Projeto

A estrutura de pastas principal segue as convenções do Next.js App Router:

- **/src/app/**: Contém todas as páginas e layouts.
  - **/(main)/**: Rotas protegidas do painel principal.
  - **/(marketing)/**: Rotas públicas (landing page, login, etc.).
  - **/api/v1/**: Todos os endpoints do backend.
- **/src/components/**: Componentes React reutilizáveis.
- **/src/lib/**: Funções utilitárias, configuração de serviços e o schema da base de dados.
  - **/db/schema.ts**: A "fonte da verdade" para a estrutura do banco de dados.
- **/docs/mvp/**: Documentação técnica do projeto (esta pasta).

## 4. Links Rápidos para Documentação

- **[Base de Dados (DB.md)](./DB.md)**: Diagrama ER, schema e descrição das tabelas.
- **[Frontend (FRONTEND.md)](./FRONTEND.md)**: Detalhes sobre a arquitetura do cliente.
- **[Backend (BACKEND.md)](./BACKEND.md)**: Detalhes sobre a API e a lógica do servidor.
- **[Changelog (CHANGELOG.md)](./CHANGELOG.md)**: Histórico de todas as alterações.
- **[Deploy (DEPLOY_CLI.md)](./DEPLOY_CLI.md)**: Instruções para fazer o deploy manualmente.
- **[Segurança (SECURITY.md)](./SECURITY.md)**: Políticas e práticas de segurança.
- **[Testes (TESTS.md)](./TESTS.md)**: Estratégia e execução de testes.
