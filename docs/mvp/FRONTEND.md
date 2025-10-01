# Documentação do Frontend - ZAP Master

Este documento detalha a arquitetura, tecnologias e padrões utilizados na camada de apresentação (frontend) do ZAP Master.

## 1. Stack de Tecnologias

- **Framework Principal:** [Next.js](https://nextjs.org/) (v14+ com App Router)
  - **Motivo:** Renderização no lado do servidor (SSR) para performance, roteamento baseado em sistema de ficheiros, e Server Components para otimização.
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
  - **Motivo:** Segurança de tipos, manutenibilidade e autocomplementação no desenvolvimento.
- **UI Framework:** [React](https://react.dev/) (v18+)
  - **Motivo:** Padrão da indústria para interfaces reativas e componentizadas.
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
  - **Motivo:** Agilidade no desenvolvimento de UIs customizadas através de classes utilitárias.
- **Biblioteca de Componentes:** [ShadCN UI](https://ui.shadcn.com/)
  - **Motivo:** Componentes acessíveis e customizáveis, construídos sobre Tailwind CSS, cujo código-fonte é parte do projeto, permitindo máxima flexibilidade.
- **Ícones:** [Lucide React](https://lucide.dev/guide/packages/lucide-react)
  - **Motivo:** Biblioteca de ícones open-source, leve e consistente.
- **Gestão de Estado:**
  - **Sessão:** React Context (`SessionProvider`) para dados globais do utilizador.
  - **Estado Local:** Hooks nativos do React (`useState`, `useEffect`) para o estado da UI.
  - **Dados do Servidor:** `fetch` em Server/Client Components e Server Actions.

## 2. Estrutura de Pastas e Rotas

O roteamento é gerido pelo App Router do Next.js.

- **/src/app/(marketing)/**: Agrupa as rotas públicas.
  - `/`: Landing Page.
  - `/login`: Página de autenticação.
  - `/register`: Página de registo.
  - `/forgot-password`: Página de recuperação de senha.
- **/src/app/(main)/**: Agrupa as rotas protegidas por autenticação.
  - `/dashboard`: Painel principal com KPIs.
  - `/atendimentos`: Caixa de entrada e chat em tempo real.
  - `/contacts`: Gestão de contatos (CRM).
  - `/campaigns`: Gestão de campanhas.
  - `/settings`: Configurações da conta, equipa, etc.
- **/src/components/**: Componentes React reutilizáveis.
  - **/ui/**: Componentes base do ShadCN UI.
  - **/[feature]/**: Componentes específicos de uma funcionalidade (ex: `/atendimentos`, `/campaigns`).

## 3. Fluxos Principais

### Fluxo de Autenticação
1.  **Registo:** Utilizador cria uma conta. API cria a empresa e o utilizador, e envia um e-mail de verificação.
2.  **Login:** Utilizador insere credenciais. A API valida e retorna um JWT em um cookie `httpOnly` chamado `__session`.
3.  **Proteção:** O `middleware.ts` intercepta todas as requisições. Se o utilizador não estiver autenticado e tentar aceder a uma rota protegida, é redirecionado para `/login`.
4.  **Sessão:** O layout principal (`/app/(main)/layout.tsx`) valida o token no servidor e disponibiliza os dados do utilizador para toda a aplicação através do `SessionProvider`.

### Fluxo de Criação de Campanha
1.  O utilizador seleciona o canal (WhatsApp ou SMS).
2.  Preenche os detalhes da campanha (nome, mensagem/template, listas de contatos).
3.  Pode agendar o envio ou disparar imediatamente.
4.  A API recebe os dados, cria o registo da campanha no banco e, se for para envio imediato, inicia o processo de envio em background.

## 4. Como Rodar o Projeto

1.  **Instalar dependências:**
    ```bash
    npm install
    ```
2.  **Configurar ambiente:**
    - Crie um ficheiro `.env` a partir do `.env.example`.
    - Preencha as variáveis de ambiente, especialmente `DATABASE_URL` e `JWT_SECRET_KEY`.
3.  **Executar o ambiente de desenvolvimento:**
    Este comando irá primeiro aplicar as migrações do banco de dados e depois iniciar o servidor Next.js.
    ```bash
    npm run dev
    ```
4.  **Aceder à aplicação:**
    Abra [http://localhost:9002](http://localhost:9002) no seu navegador.
