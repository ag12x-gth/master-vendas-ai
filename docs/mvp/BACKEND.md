# Documentação do Backend - ZAP Master

Este documento detalha a arquitetura, endpoints da API e lógica do servidor do ZAP Master.

## 1. Stack de Tecnologias

- **Runtime:** Node.js
- **Framework:** Next.js (API Routes)
  - **Motivo:** Unifica o desenvolvimento do frontend e backend num único projeto, simplificando o deploy e a gestão.
- **Linguagem:** TypeScript
- **ORM (Object-Relational Mapping):** Drizzle ORM
  - **Motivo:** ORM moderno para TypeScript, focado em performance, segurança de tipos e flexibilidade.
- **Base de Dados:** PostgreSQL
- **Autenticação:** JWT (JSON Web Tokens) com a biblioteca `jose`.
- **Validação de Dados:** Zod

## 2. Estrutura de Pastas

- **/src/app/api/v1/**: Ponto de entrada para todos os endpoints da nossa API RESTful. Cada pasta corresponde a um recurso (ex: `/contacts`, `/campaigns`).
- **/src/lib/db/**: Contém a configuração da conexão com o banco (`index.ts`) e o schema (`schema.ts`).
- **/src/lib/campaign-sender.ts**: Orquestrador central para o envio de campanhas, contendo a lógica de negócio desacoplada da API.
- **/src/lib/facebookApiService.ts**: Camada de serviço de baixo nível, responsável exclusivamente pela comunicação com a Graph API da Meta.
- **/src/middleware.ts**: Intercepta requisições para proteção de rotas.

## 3. Endpoints Principais da API

Todos os endpoints estão sob o prefixo `/api/v1`.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/login` | Autentica um utilizador e retorna um cookie de sessão JWT. |
| POST | `/auth/register` | Regista uma nova empresa e utilizador. |
| POST | `/auth/logout` | Invalida o cookie de sessão do utilizador. |
| GET | `/campaigns` | Lista todas as campanhas da empresa. |
| POST | `/campaigns/whatsapp`| Cria uma nova campanha de WhatsApp. |
| POST | `/campaigns/sms`| Cria uma nova campanha de SMS. |
| GET | `/campaigns/[id]` | Obtém os detalhes e KPIs de uma campanha específica. |
| POST | `/campaigns/[id]/trigger` | Força o envio de uma campanha agendada. |
| GET | `/contacts` | Lista os contatos com paginação, filtro e ordenação. |
| POST | `/contacts` | Cria um novo contato. |
| POST | `/contacts/import` | Processa a importação de contatos em massa via CSV. |
| GET, PUT, DELETE | `/contacts/[id]` | Gerencia (CRUD) um contato específico. |
| GET, POST | `/connections` | Lista e cria novas conexões com a API da Meta. |
| GET, PUT, DELETE | `/connections/[id]` | Gerencia uma conexão específica. |
| POST | `/templates/sync` | Sincroniza os modelos de mensagem da Meta para o banco de dados local. |
| GET, POST | `/users` | Lista e convida novos utilizadores para a equipa. |
| DELETE | `/users/[id]` | Remove um utilizador da equipa. |
| GET | `/conversations` | Lista todas as conversas na caixa de entrada. |
| POST | `/conversations/[id]/messages` | Envia uma nova mensagem numa conversa. |

## 4. Autenticação e Autorização

O fluxo é baseado em JWT armazenado num cookie `httpOnly`.

1.  **Login:** A rota `/api/v1/auth/login` valida as credenciais. Se forem válidas, um token JWT é gerado e assinado com o `JWT_SECRET_KEY`.
2.  **Cookie:** O token é definido em dois cookies, `__session` (para compatibilidade com Firebase Hosting) e `session_token` (fallback).
3.  **Validação:**
    - O **Middleware** verifica a *existência* do cookie para proteger as rotas.
    - A **Server Action `getUserSession`** é chamada nos layouts e rotas de API para *validar* a assinatura do JWT e buscar os dados do utilizador. Esta função é a única fonte da verdade para a sessão do utilizador no servidor.
4.  **Autorização:** A lógica de permissão (ex: apenas `admin` pode aceder a certas rotas) é implementada dentro de cada endpoint de API, verificando a `role` presente no payload do JWT.
