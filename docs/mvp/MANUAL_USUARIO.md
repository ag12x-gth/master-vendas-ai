# Manual do Utilizador - ZAP Master

Bem-vindo ao ZAP Master! Este manual foi criado para o guiar através de todas as funcionalidades da nossa plataforma, desde a configuração inicial até à gestão avançada das suas campanhas e atendimentos.

---

## 1. Primeiros Passos: A Configuração Essencial

Para começar a usar a plataforma, siga estes passos iniciais que são cruciais para o funcionamento do sistema. A página **"Primeiros Passos"** na barra lateral oferece atalhos para cada uma destas secções.

### 1.1. Conectar seu WhatsApp

A primeira e mais importante etapa é conectar a sua conta da API Oficial do WhatsApp.

1.  Vá para a secção **Conexões**.
2.  Clique em **"Adicionar Nova Conexão"**.
3.  Preencha os dados fornecidos pelo seu painel de desenvolvedores da Meta:
    *   **Nome da Conexão:** Um nome para identificar a sua conexão (ex: "Vendas Loja Principal").
    *   **WABA ID:** O ID da sua Conta do WhatsApp Business.
    *   **ID do Número de Telefone:** O ID específico do número que irá usar.
    *   **Token de Acesso Permanente:** O seu token de acesso, que será guardado de forma segura e encriptada.
    *   **App ID e App Secret:** As credenciais do seu aplicativo na Meta.
4.  Após salvar, ative a conexão no botão `switch` e clique em **"Sincronizar Webhook"** para que a plataforma possa receber mensagens em tempo real.

### 1.2. Sincronizar Modelos de Mensagem

Para iniciar conversas com os seus clientes (mensagens ativas), o WhatsApp exige o uso de modelos pré-aprovados pela Meta.

1.  Vá para a secção **Modelos**.
2.  Clique no botão **"Sincronizar"**.
3.  A plataforma irá buscar automaticamente todos os modelos aprovados na sua conta do WhatsApp Business e exibi-los.

### 1.3. Adicionar Contatos e Listas

Com a conexão ativa, é hora de adicionar os seus clientes e organizá-los. **Esta etapa é crucial para o envio de campanhas.**

1.  **Adicionar Contatos:**
    *   **Manualmente:** Vá para **Leads -> Contatos** e clique em **"Adicionar"**. Preencha o formulário detalhado.
    *   **Em Massa:** Na mesma página, clique em **"Importar Contatos"**. Você pode baixar um ficheiro de exemplo, preenchê-lo e fazer o upload. O sistema permite mapear as colunas do seu ficheiro para os campos do CRM.
2.  **Criar Listas:**
    *   Vá para **Leads -> Listas**.
    *   Crie listas para segmentar os seus contatos (ex: "Clientes VIP", "Leads Frios"). As listas são os públicos-alvo das suas campanhas.
3.  **Associar Contatos às Listas:**
    *   Ao criar ou editar um contato, você pode associá-lo a uma ou mais listas.

---

## 2. Funcionalidades Principais

### 2.1. Dashboard

O seu painel de controlo principal. Aqui você encontra:
*   **KPIs:** Cartões com métricas chave como Valor em Leads, Novos Contatos e Mensagens Enviadas.
*   **Filtro de Período:** Selecione o intervalo de datas para analisar os dados.
*   **Gráficos:** Visualize a tendência de atendimentos, o desempenho de campanhas e o ranking dos seus atendentes.
*   **Atalhos Rápidos:** Crie novas campanhas ou contatos com um único clique.

### 2.2. Campanhas (WhatsApp e SMS)

*   **Fluxo de Criação:** Para criar uma campanha, você precisa de um **Modelo** (para WhatsApp) ou uma mensagem de texto (para SMS), e de uma **Lista de Contatos**.
*   **Como Criar:** Vá para a secção de Modelos ou SMS, escolha a opção de criar campanha e selecione a sua **Lista** como público-alvo.
*   **Visualização:** Alterne entre a vista em **grelha** (cards) ou **tabela** para monitorizar o progresso.
*   **Agendamento:** Você pode enviar uma campanha imediatamente ou agendá-la para uma data e hora futuras.
*   **Relatórios:** Após o envio, clique numa campanha para ver o relatório detalhado de entregas, leituras (apenas WhatsApp) e falhas.

### 2.3. Atendimentos

A sua caixa de entrada unificada para todas as conversas.
*   **Interface de 3 Colunas:** Lista de conversas, chat ativo e painel de detalhes do contato.
*   **Janela de 24 horas:** O sistema indica claramente o tempo restante para responder a um cliente sem custos. Se a janela expirar, você deve usar um modelo para iniciar uma nova conversa.
*   **Arquivamento:** Mantenha a sua caixa de entrada organizada arquivando conversas resolvidas.

---

## 3. Gestão e Configurações

### 3.1. Gestão da Empresa

Localizada no menu principal em **"Configurações"**.
*   **Equipe:** Convide novos utilizadores, defina os seus cargos (admin, atendente) e gerencie as suas permissões.
*   **Webhooks:** Configure URLs para notificar os seus sistemas externos sobre eventos (ex: novo contato criado).
*   **API:** Gere chaves de API para integrar o ZAP Master com outras ferramentas.

### 3.2. Minha Conta

Aceda clicando no seu avatar no canto superior direito.
*   **Perfil:** Altere o seu nome e avatar.
*   **Segurança:** Altere a sua senha.
*   **Preferências:** Escolha o tema da interface (claro, escuro) e o idioma.
