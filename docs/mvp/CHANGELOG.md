# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), e este projeto adhere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).

## [2.1.3] - 2025-08-14
### Corrigido
- **Erro 500 no Chat de IA:** Resolvido o erro persistente no fluxo de IA do Genkit. A funcionalidade foi temporariamente desativada para garantir a estabilidade do MVP e será reintroduzida no futuro.
- **Usabilidade da Tabela de Contatos:** Adicionada a capacidade de ordenar os contatos por nome e data de criação diretamente nos cabeçalhos das colunas.
- **Controlo de Paginação:** Implementado um seletor que permite ao utilizador escolher quantos contatos exibir por página (de 10 a 500), oferecendo maior flexibilidade na navegação.

## [2.1.2] - 2025-08-13
### Adicionado
- **Dashboard Super Admin Dinâmico:** O painel de Super Admin agora busca e exibe dados reais de todas as empresas na plataforma, incluindo contagens de utilizadores, contatos e campanhas, tornando-se uma ferramenta de monitorização funcional.

### Corrigido
- **Erro Crítico de Hidratação:** Corrigido um erro de "hydration mismatch" que ocorria nas páginas de Atendimentos e Dashboard devido à formatação de datas relativas, garantindo uma renderização consistente entre servidor e cliente.
- **Segurança da Rota Super Admin:** Reforçada a segurança da rota `/super-admin`, garantindo que apenas o utilizador com o e-mail de Super Admin possa acedê-la, através de verificações robustas no `middleware` e no `layout` da página.
- **Erro de Build (`use server`):** Removida a diretiva `'use server'` incorreta do ficheiro de rota da API (`/api/v1/super-admin/stats`), resolvendo uma falha de compilação.
- **Erro de Parsing de JSON:** Corrigido um erro "Unexpected end of JSON input" que ocorria ao excluir utilizadores, tratando corretamente as respostas `204 No Content` da API.

## [2.1.1] - 2025-08-13
### Corrigido
- **Segurança Crítica:** Corrigida uma falha de segurança onde utilizadores com o cargo "atendente" conseguiam aceder a páginas restritas de administrador (como Campanhas e Conexões), garantindo o correto isolamento de permissões.
- **Confiabilidade do CRON:** Otimizado o endpoint de trigger de campanhas (`/api/v1/campaigns/trigger`) para forçar a execução dinâmica, resolvendo o problema de cache no servidor que impedia o processamento de campanhas em produção.
- **Clareza da API:** Melhorada a mensagem de retorno do endpoint de CRON para refletir com precisão que ele procura por todas as campanhas "pendentes", e não apenas "agendadas", eliminando ambiguidades durante a depuração.
- **Erros de Build:** Corrigidos múltiplos erros de compilação, incluindo a remoção de diretivas `'use server'` desnecessárias e a resolução de tipos duplicados (`KanbanStage`) e propriedades em falta em componentes React.
- **Conflito de Deploy:** Resolvido o erro crítico "Failed to publish app" ao remover configurações de backend duplicadas (`frameworksBackend`) do ficheiro `firebase.json`.

## [2.1.0] - 2025-08-13

### Adicionado
- **Firebase Analytics:** Integrado o Firebase Analytics para o rastreamento de eventos personalizados, permitindo uma análise mais profunda do comportamento do utilizador na plataforma.

### Corrigido
- **Segurança Crítica:** Corrigida uma falha de segurança onde utilizadores com o cargo "atendente" conseguiam aceder a páginas restritas de administrador (como Campanhas e Conexões), garantindo o correto isolamento de permissões.
- **Confiabilidade do CRON:** Otimizado o endpoint de trigger de campanhas (`/api/v1/campaigns/trigger`) para forçar a execução dinâmica, resolvendo o problema de cache no servidor que impedia o processamento de campanhas em produção.
- **Clareza da API:** Melhorada a mensagem de retorno do endpoint de CRON para refletir com precisão que ele procura por todas as campanhas "pendentes", e não apenas "agendadas", eliminando ambiguidades durante a depuração.
- **Envio de Campanhas WhatsApp:** Resolvido um bug crítico na lógica de substituição de variáveis (`campaign-sender`) que impedia o envio de mensagens de modelos que continham placeholders, garantindo a entrega correta das campanhas.
- **Erros de Build:** Corrigidos múltiplos erros de compilação, incluindo a remoção de diretivas `'use server'` desnecessárias e a resolução de tipos duplicados (`KanbanStage`) e propriedades em falta em componentes React.
- **Conflito de Deploy:** Resolvido o erro crítico "Failed to publish app" ao remover configurações de backend duplicadas (`frameworksBackend`) do ficheiro `firebase.json`.

## [2.0.1] - 2025-08-13

### Corrigido
- **Segurança Crítica:** Corrigida uma falha de segurança onde utilizadores com o cargo "atendente" conseguiam aceder a páginas restritas de administrador (como Campanhas e Conexões), garantindo o correto isolamento de permissões.
- **Confiabilidade do CRON:** Otimizado o endpoint de trigger de campanhas (`/api/v1/campaigns/trigger`) para forçar a execução dinâmica, resolvendo o problema de cache no servidor que impedia o processamento de campanhas em produção.
- **Clareza da API:** Melhorada a mensagem de retorno do endpoint de CRON para refletir com precisão que ele procura por todas as campanhas "pendentes", e não apenas "agendadas", eliminando ambiguidades durante a depuração.
- **Envio de Campanhas WhatsApp:** Resolvido um bug crítico na lógica de substituição de variáveis (`campaign-sender`) que impedia o envio de mensagens de modelos que continham placeholders, garantindo a entrega correta das campanhas.
- **Erros de Build:** Corrigidos múltiplos erros de compilação, incluindo a remoção de diretivas `'use server'` desnecessárias e a resolução de tipos duplicados (`KanbanStage`) e propriedades em falta em componentes React.

## [2.0.0] - 2025-08-13

### Lançamento do MVP (Minimum Viable Product)

Esta versão marca a estabilização de todas as funcionalidades essenciais do ZAP Master, tornando-o pronto para produção. Todos os dados estáticos (`mock data`) foram substituídos por chamadas de API dinâmicas, e os principais erros de compilação e execução foram resolvidos.

### Adicionado
- **Dashboard 100% Dinâmico:**
  - Todos os cartões de KPI (`StatsCards`) agora buscam e exibem dados reais a partir do endpoint `/api/v1/dashboard/stats`.
  - O gráfico de **Tendência de Atendimentos** (`AttendanceTrendChart`) agora é alimentado por dados agregados em tempo real, consultando o endpoint `/api/v1/dashboard/charts`.
  - A tabela de **Ranking de Atendentes** agora lista os utilizadores reais da plataforma.
  - As listas de **Campanhas em Andamento** e **Atendimentos Pendentes** agora refletem o estado atual da base de dados.
- **Documentação Técnica Completa:** Criada a pasta `/docs/mvp` com toda a documentação de referência do projeto.

### Corrigido
- **Autenticação em Produção:** Resolvido o loop de redirecionamento (`ERR_TOO_MANY_REDIRECTS`) no Firebase Hosting ao padronizar o uso do cookie `__session` e desativar a cache de servidor para o layout principal.
- **Múltiplos Erros de Compilação:** Resolvidos diversos erros de `build` relacionados a importações incorretas e tipagem, garantindo a estabilidade do processo de build.
- **Falha na Consulta de Gráficos:** Corrigida uma falha crítica (`Erro 500`) no endpoint `/api/v1/dashboard/charts`. A consulta SQL foi refatorada para ser mais robusta.
