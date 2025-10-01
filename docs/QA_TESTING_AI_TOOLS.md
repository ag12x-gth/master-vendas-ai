# 🧪 Guia de Testes QA - Ferramentas de IA MCP

## 📋 **Visão Geral**

Este documento contém todos os cenários de teste para validar as **20 ferramentas de IA MCP** implementadas no sistema MASTER IA Studio. Cada ferramenta deve ser testada individualmente para garantir que funciona corretamente.

### **📊 Total de Ferramentas (Atualizado 25/08/2025):**
- **🔢 2 ferramentas básicas** (calculator, getCurrentDateTime)  
- **🏷️ 4 ferramentas de tags** (listTags, createTag, addContactsToTag, countTags)
- **👥 2 ferramentas de contatos** (listContacts, countContacts)
- **📋 4 ferramentas de listas** (listLists, createList, countLists, addContactsToList) - **2 NOVAS**
- **📅 2 ferramentas de filtros por data** (countContactsByDate, addContactsByDate)
- **📢 2 ferramentas de campanhas** (listCampaigns, getCampaignDetails)
- **💬 4 ferramentas de conversas** (listConversations, countConversations, analyzeConversationSentiment, getConversationInsights)

### **🆕 FERRAMENTAS RECÉM-ADICIONADAS (25/08/2025):**
- ✅ **`countLists`** - Conta o número total de listas da empresa
- ✅ **`addContactsToList`** - Adiciona contatos específicos a uma lista existente

---

## 🚀 **Preparação do Ambiente de Teste**

### **Pré-requisitos:**
1. ✅ Sistema rodando em `http://localhost:9002`
2. ✅ **MCP HTTP Server** rodando em `http://localhost:3001` com **20 ferramentas**
3. ✅ Usuário logado com empresa válida
4. ✅ Acesso à página `/ai-chats`
5. ✅ Console do navegador aberto (F12) para ver logs
6. ✅ Dados de teste já inseridos no banco (campanhas, contatos, tags, listas)
7. ✅ **Build System**: 100% funcional, sem erros TypeScript/ESLint

### **Formato dos Testes:**
- 🟢 **SUCESSO** = Ferramenta executou e retornou dados corretos
- 🔴 **FALHA** = Ferramenta não executou ou retornou erro
- ⚠️ **PARCIAL** = Executou mas com formatação/dados incorretos

---

## 📊 **GRUPO 1: FERRAMENTAS BÁSICAS**

### **1.1 Calculadora - `calculator`**

#### **Comandos de Teste:**
```
✅ "quanto é 2 + 2?"
✅ "calcule 15 * 8"
✅ "qual é 100 dividido por 4?"
✅ "soma de 23 + 45 + 67"
```

#### **Resultado Esperado:**
- 🟢 Deve retornar o resultado matemático correto
- 🟢 Formatação clara e legível

### **1.2 Data e Hora Atual - `getCurrentDateTime`**

#### **Comandos de Teste:**
```
✅ "que horas são?"
✅ "qual é a data de hoje?"
✅ "me diga a data e hora atual"
```

#### **Resultado Esperado:**
- 🟢 Deve retornar data e hora atuais no formato brasileiro
- 🟢 Informação precisa e atualizada

---

## 🏷️ **GRUPO 2: FERRAMENTAS DE TAGS**

### **2.1 Listar Tags - `listTags`**

#### **Comandos de Teste:**
```
✅ "liste todas as tags"
✅ "quais tags existem?"
✅ "mostre as tags da empresa"
✅ "buscar tag cliente"
```

### **2.2 Criar Tag - `createTag`**

#### **Comandos de Teste:**
```
✅ "crie uma tag chamada 'VIP'"
✅ "criar nova tag 'Prospecção'"
✅ "adicionar tag 'Cliente Premium'"
```

### **2.3 Adicionar Contatos à Tag - `addContactsToTag`**

#### **Comandos de Teste:**
```
✅ "adicione o contato [ID] à tag VIP"
✅ "marcar contatos com a tag Cliente Premium"
```

### **2.4 Contar Tags - `countTags`**

#### **Comandos de Teste:**
```
✅ "quantas tags existem?"
✅ "conte o número de tags"
✅ "total de tags da empresa"
```

---

## 👥 **GRUPO 3: FERRAMENTAS DE CONTATOS**

### **3.1 Listar Contatos - `listContacts`**

#### **Comandos de Teste:**
```
✅ "liste todos os contatos"
✅ "mostre os contatos da empresa"
✅ "buscar contato João"
```

### **3.2 Contar Contatos - `countContacts`**

#### **Comandos de Teste:**
```
✅ "quantos contatos temos?"
✅ "conte o número de contatos"
✅ "total de contatos da empresa"
```

---

## 📋 **GRUPO 4: FERRAMENTAS DE LISTAS** (EXPANDIDO COM 2 NOVAS)

### **4.1 Listar Listas - `listLists`**

#### **Comandos de Teste:**
```
✅ "liste todas as listas"
✅ "quais listas de contatos existem?"
✅ "mostre as listas da empresa"
✅ "buscar lista Newsletter"
```

### **4.2 Criar Lista - `createList`**

#### **Comandos de Teste:**
```
✅ "crie uma lista chamada 'Prospects 2025'"
✅ "criar nova lista 'Newsletter Semanal'"
✅ "adicionar lista 'Clientes VIP' com descrição 'Clientes mais importantes'"
```

### **4.3 🆕 Contar Listas - `countLists` (NOVA)**

#### **Comandos de Teste:**
```
✅ "quantas listas existem?"
✅ "conte o número de listas"
✅ "total de listas de contatos"
✅ "número de listas da empresa"
```

#### **Resultado Esperado:**
- 🟢 Deve retornar número exato de listas da empresa
- 🟢 Formatação: "A empresa possui X lista(s) de contatos."

### **4.4 🆕 Adicionar Contatos à Lista - `addContactsToList` (NOVA)**

#### **Comandos de Teste:**
```
✅ "adicione o contato [ID] à lista Newsletter"
✅ "adicionar contatos [ID1, ID2, ID3] à lista VIP"
✅ "incluir contato na lista Prospects 2025"
```

#### **Resultado Esperado:**
- 🟢 Deve confirmar a adição dos contatos
- 🟢 Formatação: "Adicionados X contatos à lista [Nome]."
- 🟢 Deve validar se a lista existe antes de adicionar

---
- ✅ **Ferramenta PRIMEIRO**: Sempre executa `listCampaignsToolMCPHttp` antes de responder
- ✅ **Status correto**: Usa "COMPLETED" ✅ (não mais "sent")
- ✅ **Mapeamento exato**: Cada pergunta mapeia para o filtro correto
- ✅ **Dados reais apenas**: Se nenhuma campanha → "Nenhuma campanha encontrada"

#### **Resultado Esperado:**
- Lista HTML formatada com `<div><h3>📋 Campanhas:</h3><ul><li>` 
- Cada campanha com: **Nome**, Status com emoji, Canal, Data
- Filtros por status funcionais
- Isolamento por empresa (só campanhas da empresa do usuário)
- Exemplo: "📢 **Campanha - lembrete** (✅ COMPLETED) - Canal: WHATSAPP - 19/08/2025"

#### **Validações:**
- [x] **Prompt melhorado**: Não inventa dados fictícios
- [x] **Status correto**: COMPLETED (não "sent") 
- [ ] Formatação HTML aplicada corretamente
- [ ] Dados vêm do banco de dados real via MCP HTTP
- [ ] Status filtrado quando especificado (SENDING, COMPLETED, PENDING, SCHEDULED, FAILED)
- [ ] Emojis de status aparecem corretamente (✅ ⏰ ⏳ 📋 📤 ❌)
- [ ] Máximo 10 campanhas listadas (paginação)
- [ ] **Company isolation**: Só campanhas da empresa logada
- [ ] Performance < 4 segundos

---

### **1.2 Detalhes da Campanha - `getCampaignDetailsTool` (NOVA)**

#### **Comandos de Teste:**
```
✅ "detalhes da campanha [ID_REAL]"
✅ "informações da campanha 'Nome_Campanha_Real'"
✅ "dados da campanha inexistente123"
✅ "detalhes da campanha fake"
```

#### **Resultado Esperado:**
- Informações completas estruturadas da campanha
- Nome, descrição, status, datas de criação/agendamento
- Canal, mensagem, público-alvo
- Métricas (se disponíveis)
- Erro controlado para campanhas inexistentes

#### **Validações:**
- [ ] Dados completos e estruturados
- [ ] **Company isolation**: Só campanhas da empresa logada
- [ ] Formatação rica de texto
- [ ] Erro "Campanha não encontrada" para IDs inválidos
- [ ] Performance < 2 segundos
- [ ] Bloqueio de acesso a campanhas de outras empresas

---

### **1.3 Listar Contatos - `listContactsTool`**

#### **Comandos de Teste:**
```
✅ "liste os contatos"
✅ "quantos contatos temos?"
✅ "busque contatos com DDD 62"
✅ "liste contatos com telefone 11"
```

#### **Resultado Esperado:**
- Retorna **total de contatos** encontrados
- Quando filtrado por telefone, mostra apenas contatos correspondentes

#### **Validações:**
- [ ] Total correto de contatos
- [ ] Filtro por telefone/DDD funciona
- [ ] Não lista contatos individualmente (só conta)

---

### **1.3 Contar Contatos - `countContactsTool`**

#### **Comandos de Teste:**
```
✅ "quantos contatos temos?"
✅ "qual o total de contatos?"
✅ "conte os contatos"
✅ "quantos contatos do DDD 11?"
✅ "total de contatos com email?"
```

#### **Resultado Esperado:**
- Número total de contatos formatado: "**Total de contatos: 1.234**"
- Com filtros: Mostra critérios aplicados
- Resposta rápida (não lista todos os contatos)

#### **Validações:**
- [ ] Usa query COUNT otimizada (não busca todos os dados)
- [ ] Formatação HTML correta
- [ ] Filtros funcionam corretamente
- [ ] Performance rápida (< 2 segundos)

---

### **1.4 Listar Conversas - `listConversationsToolMCPHttp`**

#### **Comandos de Teste:**
```
✅ "liste as conversas recentes"
✅ "mostre minhas conversas"
✅ "quais conversas ativas?"
✅ "liste conversas fechadas"
✅ "mostre conversas arquivadas"
✅ "liste conversas dos últimos 7 dias"
✅ "conversas do último mês"
```

#### **Resultado Esperado:**
- Lista formatada com conversas encontradas (máximo 50)
- Cada conversa mostra: ID (8 chars), contato, status, responsável, datas
- Emojis para status: 🟢 (ativa), 🔴 (fechada), 📁 (arquivada)
- Formato: "🟢 **Conversa abc12345** - 👤 **João Silva** (11999999999) - 📊 **Status:** ativa"

#### **Validações:**
- [ ] Formatação com emojis e negrito aplicada
- [ ] Dados reais do banco de conversas
- [ ] Status filtrado quando especificado (active/closed/archived)
- [ ] Filtros de data funcionam (startDate/endDate)
- [ ] Informações de contato exibidas corretamente
- [ ] Máximo 50 resultados respeitado

---

### **1.5 Contar Conversas - `countConversationsToolMCPHttp`**

#### **Comandos de Teste:**
```
✅ "quantas conversas tenho?"
✅ "quantas conversas ativas?"
✅ "total de conversas fechadas"
✅ "conte conversas arquivadas"
✅ "quantas conversas dos últimos 30 dias?"
✅ "conversas de hoje"
```

#### **Resultado Esperado:**
- Número total formatado: "**Total de conversas ativas: 15**"
- Com filtros: especifica o critério aplicado
- Resposta rápida usando query COUNT otimizada

#### **Validações:**
- [ ] Query COUNT otimizada (não lista todas)
- [ ] Formatação HTML com negrito
- [ ] Filtros de status funcionam (active/closed/archived)
- [ ] Filtros de data funcionam (startDate/endDate)
- [ ] Performance rápida (< 2 segundos)

---

## 🏷️ **GRUPO 2: GESTÃO DE TAGS**

### **2.1 Criar Tag - `createTagTool`**

#### **Comandos de Teste:**
```
✅ "crie uma tag chamada 'VIP Clientes'"
✅ "criar tag 'Prospecção' com cor azul"
✅ "adicione uma nova tag 'Leads Qualificados'"
```

#### **Resultado Esperado:**
- Mensagem: "Tag 'VIP Clientes' criada com sucesso."
- Se tag já existe: "A tag 'VIP Clientes' já existe."

#### **Validações:**
- [ ] Tag criada no banco de dados
- [ ] Cor aplicada quando especificada
- [ ] Não permite duplicatas
- [ ] Associada à empresa correta

---

### **2.2 Listar Tags - `listTagsTool`**

#### **Comandos de Teste:**
```
✅ "liste todas as tags"
✅ "quais tags existem?"
✅ "mostre as tags disponíveis"
```

#### **Resultado Esperado:**
- Lista HTML formatada: `<ul><li>Nome da Tag (ID: código)</li></ul>`
- Exemplo: "- **Prospecção** (ID: `tag_123`)"

#### **Validações:**
- [ ] Todas as tags da empresa listadas
- [ ] IDs visíveis e corretos
- [ ] Formatação HTML aplicada
- [ ] Ordenação por data de criação (mais recentes primeiro)

---

### **2.3 Adicionar Contatos a Tag - `addContactsToTagTool`**

#### **Comandos de Teste:**
```
✅ "adicione os contatos do DDD 62 à tag Prospecção"
✅ "inclua contatos com DDD 11 na tag VIP"
✅ "adicione contatos 85 na tag Leads"
```

#### **⚠️ FLUXO OBRIGATÓRIO:**
1. Sistema deve usar `listTags` para obter ID da tag
2. Buscar contatos que correspondem ao critério
3. Adicionar os contatos à tag

#### **Resultado Esperado:**
- "X contatos foram adicionados à tag."

#### **Validações:**
- [ ] Apenas contatos com DDD especificado são adicionados
- [ ] Não usa parâmetros "unknown"
- [ ] Confirma quantidade de contatos adicionados
- [ ] Tag deve existir (listada anteriormente)

---

### **2.4 Remover Contatos de Tags por Busca - `removeContactsFromTagsBySearchTool`**

#### **Comandos de Teste:**
```
✅ "remova das tags os contatos do DDD 62"
✅ "retire os contatos 11 de todas as tags"
✅ "limpe as tags dos contatos do DDD 85"
```

#### **Resultado Esperado:**
- Logs detalhados mostrando operação
- "X associações de contatos removidas de todas as tags."

#### **Validações:**
- [ ] Remove apenas contatos do DDD especificado
- [ ] Remove de TODAS as tags, não apenas uma
- [ ] Parâmetro `search` é objeto: `{"phone": "62"}`
- [ ] Logs detalhados aparecem no console

---

## 📋 **GRUPO 3: GESTÃO DE LISTAS**

### **3.1 Criar Lista - `createListTool`**

#### **Comandos de Teste:**
```
✅ "crie uma lista chamada 'VIP'"
✅ "criar lista 'Newsletter' para contatos interessados"
✅ "adicione uma nova lista 'Clientes Premium'"
```

#### **Resultado Esperado:**
- "Lista 'VIP' criada com sucesso."
- Se existe: "A lista 'VIP' já existe."

#### **Validações:**
- [ ] Lista criada no banco
- [ ] Não permite duplicatas
- [ ] Descrição salva quando fornecida

---

### **3.2 Listar Listas - `listListsTool`**

#### **Comandos de Teste:**
```
✅ "liste todas as listas"
✅ "quais listas existem?"
✅ "mostre as listas de contatos"
✅ "busque a lista VIP"
```

#### **Resultado Esperado:**
- Lista HTML: `<div><h3>Listas disponíveis:</h3><ul><li><strong>Nome</strong> - ID: <code>id</code></li></ul></div>`
- Para busca específica: "Lista encontrada: **VIP** - ID: `list_123`"

#### **Validações:**
- [ ] Formatação HTML correta
- [ ] IDs visíveis para cada lista
- [ ] Busca específica por nome funciona
- [ ] Todas as listas da empresa aparecem

---

### **3.3 Adicionar Contatos a Lista - `addContactsToListTool`**

#### **Comandos de Teste:**
```
✅ "adicione os contatos do DDD 62 na lista VIP"
✅ "inclua contatos 11 na lista Newsletter"
✅ "adicione contatos 85 à lista Premium"
```

#### **⚠️ FLUXO OBRIGATÓRIO:**
1. `listLists` para obter ID da lista
2. `listContacts` para obter IDs dos contatos
3. `addContactsToList` com IDs reais

#### **Resultado Esperado:**
- "X contatos foram adicionados à lista."

#### **Validações:**
- [ ] Fluxo de 3 etapas executado
- [ ] IDs reais utilizados (não "unknown")
- [ ] Apenas contatos do DDD especificado
- [ ] Lista deve existir

---

### **3.4 Remover Contatos de Lista - `removeContactsFromListTool`**

#### **Comandos de Teste:**
```
✅ "remova os contatos [ID1,ID2] da lista VIP"
✅ "retire contatos específicos da lista Newsletter"
```

#### **Resultado Esperado:**
- "X contatos foram removidos da lista."

#### **Validações:**
- [ ] Remove apenas contatos especificados
- [ ] IDs válidos utilizados

---

## 🧹 **GRUPO 4: LIMPEZA GERAL**

### **4.1 Limpar Todas as Tags - `removeAllContactsFromTagsTool`**

#### **Comandos de Teste:**
```
✅ "remova todos os contatos de todas as tags"
✅ "limpe todas as associações de tags"
✅ "zere as tags"
```

#### **Resultado Esperado:**
- Logs detalhados da operação
- "Limpeza de TAGS concluída! X associações removidas."

#### **Validações:**
- [ ] Remove TODAS as associações contato-tag da empresa
- [ ] Logs detalhados no console
- [ ] Não afeta outras empresas

---

### **4.2 Limpar Todas as Listas - `removeAllContactsFromListsTool`**

#### **Comandos de Teste:**
```
✅ "remova todos os contatos de todas as listas"
✅ "limpe todas as listas de contatos"
✅ "zere as listas"
```

#### **Resultado Esperado:**
- "Limpeza de LISTAS concluída! X associações de LISTAS removidas."

#### **Validações:**
- [ ] Remove TODAS as associações contato-lista
- [ ] Logs detalhados
- [ ] Mantém as listas vazias (não deleta as listas)

---

### **4.3 Limpeza Completa - `removeAllContactsFromTagsAndListsTool`**

#### **Comandos de Teste:**
```
✅ "limpe tudo, remova todos os contatos de tags e listas"
✅ "zere todas as associações"
✅ "limpeza geral completa"
```

#### **Resultado Esperado:**
- "Limpeza concluída com sucesso! Associações removidas: X tags, Y listas."

#### **Validações:**
- [ ] Remove de tags E listas simultaneamente
- [ ] Relatório final com contadores
- [ ] Logs detalhados para ambas operações

---

## 🔍 **GRUPO 5: ANÁLISE DE CONVERSAS E SENTIMENTO**

### **5.1 Análise de Sentimento - `analyzeConversationSentimentToolMCPHttp`**

#### **Comandos de Teste:**
```
✅ "analise o sentimento da conversa abc123" (usar ID real)
✅ "como está o sentimento da conversa def456"
✅ "analise emocional do atendimento xyz789"
✅ "sentimento das mensagens da conversa 12345"
```

#### **Resultado Esperado:**
- **Sentimento Geral:** 😊 Muito Positivo, 🙂 Positivo, 😐 Neutro, 😞 Negativo, ou 😡 Muito Negativo
- **Score numérico** de -1.000 a +1.000
- **Distribuição percentual** dos sentimentos
- **Mensagens mais relevantes** com scores de confiança
- Análise das últimas 50 mensagens (padrão)

#### **Validações:**
- [ ] ID da conversa válido e existente no banco
- [ ] Score entre -1 e +1 exibido corretamente
- [ ] Percentuais somam 100%
- [ ] Mensagens de exemplo mostradas com emojis
- [ ] Confiança das análises exibida (0.00 a 1.00)
- [ ] Formatação com emojis apropriados

---

### **5.2 Insights de Conversas - `getConversationInsightsToolMCPHttp`**

#### **Comandos de Teste:**
```
✅ "gere insights das conversas"
✅ "estatísticas das conversas dos últimos 30 dias"
✅ "analise conversas dos últimos 7 dias"  
✅ "insights dos últimos 60 dias"
✅ "relatório de conversas do mês"
```

#### **Resultado Esperado:**
- **📈 Estatísticas Gerais:** Total, ativas, fechadas, arquivadas
- **📅 Atividade dos Últimos 7 Dias:** Conversas por dia
- **⏰ Horários Mais Movimentados:** Top 5 horários com mais conversas
- **💡 Recomendações:** Sugestões baseadas nos dados
- **Tempo Médio de Resposta** (simulado)

#### **Validações:**
- [ ] Período padrão de 30 dias respeitado
- [ ] Filtro de dias funciona (1-365)
- [ ] Estatísticas reais do banco
- [ ] Atividade por dia calculada corretamente
- [ ] Horários em formato 00:00h
- [ ] Recomendações relevantes baseadas nos dados
- [ ] Emojis apropriados em cada seção

---

### **5.3 Análise Avançada - `analyzeConversationTool`** *(Ferramenta Legada)*

#### **Status:** ⚠️ **DEPRECIADA** - Use as novas ferramentas MCP HTTP acima

#### **Comandos de Teste:**
```
❌ "analise a conversa abc123" (pode não funcionar)
❌ "faça uma análise da conversa def456" 
❌ "examine o atendimento xyz789"
```

#### **Validações:**
- [ ] ⚠️ Verificar se ainda funciona ou foi substituída
- [ ] Se funcionar, comparar com nova ferramenta de sentimento

---

## 📝 **PROTOCOLO DE TESTE**

### **Para cada ferramenta:**

1. **🔄 TESTE BÁSICO**
   - Execute o comando principal
   - Verifique se executa sem erros
   - Confirme formato de saída correto

2. **📊 VALIDAÇÃO DE DADOS**
   - Confirme que dados vêm do banco real
   - Verifique se filtros funcionam
   - Teste com dados vazios

3. **🎨 FORMATAÇÃO**
   - Confirme se HTML é renderizado
   - Verifique listas, negrito, códigos
   - Teste responsividade visual

4. **🔗 FLUXOS INTEGRADOS**
   - Teste sequências de ferramentas
   - Valide IDs passados entre ferramentas
   - Confirme que não há "unknown"

### **⚠️ Problemas Comuns a Verificar:**

- [ ] **Parâmetros "unknown"** - NUNCA devem aparecer
- [ ] **Dados fabricados** - IA inventando em vez de usar ferramentas
- [ ] **HTML não renderizado** - Texto plano em vez de formatação
- [ ] **IDs inválidos** - Ferramentas usando IDs que não existem
- [ ] **Filtros ignorados** - Buscas retornando dados incorretos

---

## 📋 **CHECKLIST FINAL**

### **Ferramentas de Dados (MCP HTTP):**
- [ ] listCampaignsTool *(legada)*
- [ ] listContactsToolMCPHttp
- [ ] countContactsToolMCPHttp
- [ ] listConversationsToolMCPHttp ⭐ **NOVA**
- [ ] countConversationsToolMCPHttp ⭐ **NOVA**

### **Gestão de Tags (MCP HTTP):**
- [ ] createTagToolMCPHttp
- [ ] listTagsToolMCPHttp
- [ ] addContactsToTagToolMCPHttp
- [ ] removeContactsFromTagsBySearchTool *(legada)*

### **Gestão de Listas (MCP HTTP):**
- [ ] createListToolMCPHttp
- [ ] listListsToolMCPHttp
- [ ] addContactsToListTool *(legada)*
- [ ] removeContactsFromListTool *(legada)*

### **Análise e IA (MCP HTTP):**
- [ ] analyzeConversationSentimentToolMCPHttp ⭐ **NOVA**
- [ ] getConversationInsightsToolMCPHttp ⭐ **NOVA**
- [ ] calculatorToolMCPHttp
- [ ] getCurrentDateTimeToolMCPHttp

### **Ferramentas de Data (MCP HTTP):**
- [ ] countContactsByDateToolMCPHttp
- [ ] addContactsByDateToolMCPHttp

### **Limpeza (Legadas):**
- [ ] removeAllContactsFromTagsTool *(pode estar depreciada)*
- [ ] removeAllContactsFromListsTool *(pode estar depreciada)*
- [ ] removeAllContactsFromTagsAndListsTool *(pode estar depreciada)*

### **🎯 Total de Ferramentas MCP HTTP: 15**
- ✅ **11 ferramentas anteriores** + **4 novas de conversas**
- ⭐ **Novas ferramentas de sentimento e insights implementadas**

---

## 🐛 **Reportando Bugs**

Para cada problema encontrado, inclua:

1. **Comando testado:** `"liste campanhas"`
2. **Resultado obtido:** Texto sem formatação
3. **Resultado esperado:** Lista HTML formatada
4. **Logs do console:** Erros ou mensagens relevantes
5. **Ambiente:** Navegador, dados de teste, etc.

---

## ✅ **Critérios de Aprovação**

**APROVADO** apenas se:
- ✅ Todas as 15 ferramentas funcionam
- ✅ Formatação HTML correta em todas
- ✅ Dados reais do banco (não fabricados)
- ✅ Fluxos integrados funcionam
- ✅ Sem parâmetros "unknown"
- ✅ Logs detalhados aparecem
- ✅ Performance adequada (< 5s por comando)

**🎯 Meta: 100% das ferramentas aprovadas antes do deploy!**
