# ✅ Checklist QA - Ferramentas AI (Validação Rápida)

## 📅 **ÚLTIMAS ATUALIZAÇÕES - 23/08/2025**

### **📅 NOVAS FUNCIONALIDADES IMPLEMENTADAS:**

#### **🚀 2 Novas Ferramentas de Campanhas:**
1. **`listCampaignsTool`** - Listar campanhas da empresa
   - Suporta filtros por status: active, completed, draft, scheduled, paused
   - Paginação com limit e offset
   - Isolamento por empresa (company-based)
   - Exemplo: *"liste campanhas ativas"*, *"mostrar todas as campanhas"*

2. **`getCampaignDetailsTool`** - Detalhes completos de campanha
   - Informações completas: nome, descrição, status, datas, métricas
   - Isolamento por empresa para segurança
   - Formatação rica para exibição
   - Exemplo: *"detalhes da campanha ID_123"*, *"informações da campanha 'Natal 2025'"*

#### **📅 2 Ferramentas de Filtro por Data:**
3. **`countContactsByDateTool`** - Contar contatos por período
   - Suporta: hoje, ontem, esta semana, este mês, data personalizada
   - Exemplo: *"Quantos cadastros tivemos hoje?"*

4. **`addContactsByDateTool`** - Adicionar contatos por data a tags/listas  
   - Filtra contatos por período temporal
   - Adiciona automaticamente a tags ou listas
   - Previne duplicatas automaticamente
   - Exemplo: *"Adicione todos os cadastros de hoje à lista 'Novos Leads'"*

#### **⚙️ 2 Ferramentas Básicas Auxiliares:**
5. **`getCurrentDateTimeTool`** - Data/hora atual do Brasil
   - Horário de Brasília (UTC-3)
   - Múltiplos formatos: completo, data, hora, ISO
   - Exemplo: *"Que horas são?"*, *"Qual a data de hoje?"*

6. **`calculatorTool`** - Calculadora básica
   - Operações: +, -, *, /, **, parênteses
   - Validação e sanitização de entrada
   - Exemplo: *"Quanto é 25 * 4 + 10?"*, *"Calcule (100/4) - 15"*

#### **🔧 Melhorias Técnicas:**
- ✅ **MCP HTTP Server**: 17 ferramentas registradas via HTTP (localhost:3001)
- ✅ **Database Schema Sync**: Esquemas sincronizados entre MCP e aplicação principal
- ✅ **Company Isolation**: Campanhas isoladas por empresa para segurança
- ✅ **Error Resolution**: Sistema de forcing corrigido (sem loops infinitos)
- ✅ **Tag Creation Fixed**: Problema "ERRO AO CRIAR TAG" completamente resolvido
- ✅ **Prevenção de duplicatas**: Sistema verifica associações existentes
- ✅ **Validação temporal**: Suporte a datas personalizadas (YYYY-MM-DD)
- ✅ **Logging completo**: Debug detalhado para todas as operações
- ✅ **Performance otimizada**: Consultas SQL eficientes com filtros temporais

#### **🎯 Total de Ferramentas: 21 (15 base + 2 campanhas + 2 data + 2 auxiliares)**

---

## 🎯 **VALIDAÇÃO EXPRESSA - 10 MINUTOS**

### **📋 PRÉ-TESTE**
- [ ] Sistema rodando em `localhost:9002`
- [ ] Usuário logado 
- [ ] Console do navegador aberto (F12)
- [ ] Página `/ai-chats` acessível

---

### **🚀 TESTE RÁPIDO DAS 21 FERRAMENTAS**

#### **📊 DADOS DA EMPRESA (5 ferramentas) - ATUALIZADO!**
- [ ] `"liste campanhas"` → Lista HTML com campanhas reais
- [ ] `"liste campanhas ativas"` → Filtra apenas campanhas com status 'active'
- [ ] `"detalhes da campanha [ID]"` → Informações completas da campanha específica
- [ ] `"quantos contatos temos?"` → Número correto de contatos  
- [ ] `"liste conversas recentes"` → Até 5 conversas com IDs

#### **🏷️ GESTÃO DE TAGS (4 ferramentas)**
- [ ] `"crie uma tag chamada 'TesteQA'"` → "Tag criada com sucesso"
- [ ] `"liste todas as tags"` → Lista HTML com IDs das tags
- [ ] `"adicione contatos 62 à tag TesteQA"` → Executa fluxo de 3 etapas
- [ ] `"remova das tags os contatos do DDD 99"` → Remove sem "unknown"

#### **📋 GESTÃO DE LISTAS (4 ferramentas)**
- [ ] `"crie uma lista chamada 'TesteQA'"` → "Lista criada com sucesso"
- [ ] `"liste todas as listas"` → Lista HTML com IDs das listas  
- [ ] `"adicione contatos 62 na lista TesteQA"` → Executa fluxo de 3 etapas
- [ ] `"remova contatos da lista TesteQA"` → Remove contatos especificados

#### **📅 FILTROS POR DATA (2 ferramentas) - NOVO!**
- [ ] `"quantos cadastros tivemos hoje?"` → Conta contatos cadastrados hoje
- [ ] `"quantos contatos foram cadastrados ontem?"` → Conta contatos de ontem
- [ ] `"quantos cadastros tivemos esta semana?"` → Conta contatos da semana
- [ ] `"adicione os cadastros de hoje à tag 'Novos Leads'"` → Filtra e adiciona por data
- [ ] `"adicione contatos cadastrados ontem à lista 'Prospects'"` → Filtra e adiciona por data

#### **⚙️ FERRAMENTAS AUXILIARES (2 ferramentas) - NOVO!**
- [ ] `"que horas são?"` → Data e hora atual de Brasília
- [ ] `"qual é a data de hoje?"` → Data formatada em português
- [ ] `"quanto é 25 * 4 + 10?"` → Resultado: 25 * 4 + 10 = 110
- [ ] `"calcule (100 / 4) - 15"` → Resultado: (100 / 4) - 15 = 10

#### **🧹 LIMPEZA GERAL (3 ferramentas)**
- [ ] `"remova todos os contatos de todas as tags"` → Logs detalhados
- [ ] `"remova todos os contatos de todas as listas"` → Logs detalhados
- [ ] `"limpe tudo"` → Remove de tags E listas

#### **🔍 ANÁLISE (1 ferramenta)**
- [ ] `"liste conversas recentes"` → Obter ID real
- [ ] `"analise a conversa [ID_REAL]"` → Análise detalhada da conversa

---

### **🎨 VALIDAÇÃO DE FORMATAÇÃO HTML**

#### **Comandos que DEVEM retornar HTML formatado:**
- [ ] `"liste campanhas"` → `<div><h3>📋 Campanhas:</h3><ul><li>...</li></ul></div>`
- [ ] `"liste campanhas ativas"` → Filtra por status com formatação HTML
- [ ] `"detalhes da campanha [ID]"` → Informações detalhadas em formato estruturado
- [ ] `"liste tags"` → `<ul><li>Nome (ID: código)</li></ul>`
- [ ] `"liste listas"` → `<div><h3>Listas:</h3><ul><li>...</li></ul></div>`
- [ ] `"liste conversas"` → `<ul><li>Atendimento com <b>Nome</b>...</li></ul>`

#### **Comandos que DEVEM retornar texto formatado (ATUALIZADOS):**
- [ ] `"quantos cadastros tivemos hoje?"` → "Foram cadastrados X contatos hoje."
- [ ] `"adicione cadastros de hoje à tag 'Teste'"` → "X novos contatos foram adicionados à tag..."
- [ ] `"cadastros desta semana na lista 'Leads'"` → "X contatos foram adicionados à lista..."
- [ ] `"detalhes da campanha [ID]"` → Informações estruturadas em texto rico

#### **Verificação Visual:**
- [ ] **Negrito** aparece nos nomes
- [ ] **Listas** aparecem como bullet points
- [ ] **Códigos** aparecem destacados
- [ ] **Títulos** aparecem em destaque
- [ ] **Contadores** aparecem formatados (NOVO)

---

### **🔍 VALIDAÇÃO DE LOGS (Console F12)**

#### **Para cada comando, deve aparecer:**
- [ ] `[FLOW ENTRY]` - Flow iniciado
- [ ] `[TOOL START]` - Ferramenta iniciada  
- [ ] `[TOOL DEBUG]` - Dados da ferramenta
- [ ] `[TOOL END]` - Ferramenta concluída
- [ ] `[FLOW END]` - Flow finalizado

#### **⚡ NÃO deve aparecer:**
- [ ] ❌ `"unknown"` em qualquer parâmetro
- [ ] ❌ `Error:` ou exceções não tratadas
- [ ] ❌ `Failed to` ou falhas de conexão
- [ ] ❌ Loops infinitos de criação (erro resolvido)
- [ ] ❌ Schema mismatches (erro resolvido)

---

### **🔗 VALIDAÇÃO DE FLUXOS INTEGRADOS**

#### **Fluxo: Adicionar Contatos à Tag**
- [ ] Executa `listTags` automaticamente
- [ ] Obtém ID real da tag
- [ ] Busca contatos pelo critério
- [ ] Adiciona apenas contatos correspondentes

#### **Fluxo: Adicionar Contatos à Lista**  
- [ ] Executa `listLists` automaticamente
- [ ] Obtém ID real da lista
- [ ] Busca contatos pelo critério  
- [ ] Adiciona apenas contatos correspondentes

#### **Fluxo: Campanhas (NOVOS)**
- [ ] `listCampaigns` executa consulta isolada por empresa
- [ ] Filtra por status quando especificado
- [ ] `getCampaignDetails` obtém informações completas
- [ ] Formata dados para exibição rica
- [ ] Valida permissões de acesso por empresa

#### **Fluxo: Filtros por Data (EXISTENTES)**
- [ ] `countContactsByDateTool` executa consulta SQL com filtro temporal
- [ ] `addContactsByDateTool` busca tag/lista automaticamente
- [ ] Filtra contatos pelo `createdAt` no período correto
- [ ] Evita duplicatas verificando associações existentes
- [ ] Retorna feedback detalhado com contadores

#### **Fluxo: Análise de Conversa**
- [ ] Aceita ID real de conversa
- [ ] Gera análise com IA
- [ ] Retorna conteúdo estruturado

---

### **📅 TESTES ESPECÍFICOS PARA FERRAMENTAS DE DATA (EXISTENTES)**

#### **Teste de Contagem por Período:**
- [ ] `"quantos cadastros tivemos hoje?"` → Número correto de contatos de hoje
- [ ] `"quantos contatos foram cadastrados ontem?"` → Contagem de ontem  
- [ ] `"quantos cadastros desta semana?"` → Contagem da semana atual
- [ ] `"quantos cadastros deste mês?"` → Contagem do mês atual
- [ ] `"quantos cadastros no dia 2025-08-20?"` → Data personalizada válida
- [ ] `"quantos cadastros no dia 2099-01-01?"` → Data futura (deve retornar 0)

#### **Teste de Adição por Período:**
- [ ] `"adicione cadastros de hoje à tag 'DiáriosQA'"` → Cria tag e adiciona
- [ ] `"adicione contatos de ontem à lista 'OntemQA'"` → Cria lista e adiciona  
- [ ] `"cadastros desta semana na tag 'SemanaisQA'"` → Filtra e adiciona por semana
- [ ] `"contatos do mês na lista 'MensaisQA'"` → Filtra e adiciona por mês

---

### **🚀 TESTES ESPECÍFICOS PARA CAMPANHAS (NOVOS)**

#### **Teste de Listagem de Campanhas:**
- [ ] `"liste todas as campanhas"` → Lista completa formatada em HTML
- [ ] `"liste campanhas ativas"` → Apenas campanhas com status 'active'
- [ ] `"mostar campanhas concluídas"` → Apenas campanhas 'completed'
- [ ] `"campanhas em rascunho"` → Apenas campanhas 'draft'
- [ ] `"campanhas agendadas"` → Apenas campanhas 'scheduled'
- [ ] `"campanhas pausadas"` → Apenas campanhas 'paused'

#### **Teste de Detalhes de Campanhas:**
- [ ] `"detalhes da campanha [ID_REAL]"` → Informações completas da campanha
- [ ] `"informações da campanha 'Nome_Real'"` → Busca por nome da campanha
- [ ] `"dados da campanha inexistente"` → Erro controlado "Campanha não encontrada"

#### **Validação de Isolamento por Empresa:**
- [ ] Campanhas listadas pertencem apenas à empresa do usuário
- [ ] Detalhes só são exibidos para campanhas da mesma empresa
- [ ] Tentativa de acesso a campanhas de outras empresas é bloqueada

#### **Validação de Performance Campanhas:**
- [ ] Listagem de campanhas < 3 segundos
- [ ] Detalhes de campanha < 2 segundos  
- [ ] Filtros por status < 4 segundos

#### **Validação de Duplicatas:**
- [ ] Executar mesmo comando 2x → 2ª execução deve reportar "já estavam na tag/lista"
- [ ] Verificar logs: deve aparecer contadores de novos vs existentes
- [ ] Validar no banco: não deve haver registros duplicados

#### **Validação de Performance:**
- [ ] Consultas temporais < 3 segundos
- [ ] Operações com muitos contatos < 5 segundos  
- [ ] Logs detalhados aparecem em tempo real

---

### **⚡ TESTE DE CASOS EXTREMOS**

#### **Comandos que devem funcionar sem erro:**
- [ ] `"liste campanhas ativas"` → Filtra por status
- [ ] `"detalhes da campanha [ID]"` → Informações da campanha específica
- [ ] `"busque contatos 11"` → Filtra por DDD
- [ ] `"busque a lista VIP"` → Busca lista específica
- [ ] `"adicione contatos 00 à tag Teste"` → Não encontra contatos, mas executa

#### **Comandos de Data que devem funcionar (EXISTENTES):**
- [ ] `"quantos cadastros tivemos no dia 2025-01-01?"` → Data personalizada
- [ ] `"adicione cadastros desta semana à tag 'Semanais'"` → Cria tag se necessário
- [ ] `"cadastros de ontem na lista 'Diários'"` → Cria lista se necessário
- [ ] `"quantos contatos de hoje?"` → Variação do comando padrão

#### **Comandos de Campanhas que devem funcionar (NOVOS):**
- [ ] `"campanhas da empresa"` → Lista campanhas da empresa
- [ ] `"status das campanhas"` → Informações de status
- [ ] `"detalhes campanha vazia"` → ID inválido ou inexistente

#### **Comandos que devem dar erro controlado:**
- [ ] `"analise a conversa fake123"` → "Conversa não encontrada"
- [ ] `"adicione à tag InexistentE"` → Cria tag automaticamente ou avisa
- [ ] `"cadastros do dia 2099-12-31"` → "Não foram encontrados contatos..." (EXISTENTE)
- [ ] `"detalhes da campanha inexistente123"` → "Campanha não encontrada" (NOVO)
- [ ] `"campanhas da empresa fake"` → Erro de permissão/acesso (NOVO)

---

### **📊 VALIDAÇÃO DE DADOS REAIS**

#### **Verificar que os dados vêm do banco:**
- [ ] Campanhas listadas existem no sistema
- [ ] Status de campanhas correspondem aos dados reais
- [ ] IDs de campanhas são válidos e funcionais
- [ ] Contagem de contatos confere com banco
- [ ] Conversas têm IDs e datas reais  
- [ ] Tags e listas criadas aparecem no sistema

#### **⚠️ NÃO deve acontecer:**
- [ ] ❌ IA inventar campanhas que não existem
- [ ] ❌ Mostrar campanhas de outras empresas
- [ ] ❌ Retornar dados em cache/desatualizados  
- [ ] ❌ Mostrar dados de outras empresas

---

### **⏱️ VALIDAÇÃO DE PERFORMANCE**

#### **Tempos aceitáveis:**
- [ ] Listagens simples: < 3 segundos
- [ ] Listagem de campanhas: < 4 segundos
- [ ] Detalhes de campanha: < 2 segundos
- [ ] Operações com filtros: < 5 segundos
- [ ] Fluxos integrados: < 8 segundos
- [ ] Análise de conversa: < 10 segundos

#### **⚠️ Alertar se:**
- [ ] ❌ Qualquer comando > 15 segundos
- [ ] ❌ Interface trava ou fica não-responsiva
- [ ] ❌ Loading sem fim

---

### **🎯 CRITÉRIOS DE APROVAÇÃO**

#### **✅ APROVADO se:**
- [ ] **21/21 ferramentas** funcionam sem erro (15 anteriores + 2 campanhas + 2 data + 2 auxiliares)
- [ ] **Campanhas isoladas por empresa** funcionam corretamente
- [ ] **Formatação HTML** funciona em todas as listas
- [ ] **Dados reais** em todas as consultas  
- [ ] **Logs detalhados** aparecem no console
- [ ] **Zero parâmetros "unknown"**
- [ ] **Performance adequada** (< 10s médio)
- [ ] **Fluxos integrados** executam corretamente
- [ ] **Filtros por data** funcionam para hoje/ontem/semana/mês (EXISTENTES)
- [ ] **Prevenção de duplicatas** nas operações de data (EXISTENTES)
- [ ] **MCP HTTP Server** registra 17 ferramentas corretamente
- [ ] **Sistema de forcing** não causa loops infinitos (CORRIGIDO)

#### **❌ REPROVADO se qualquer item falha:**
- [ ] Ferramenta não executa
- [ ] Formatação quebrada (texto plano)
- [ ] Dados inventados pela IA
- [ ] Parâmetros "unknown" aparecem
- [ ] Erros não tratados no console
- [ ] Performance inaceitável (> 15s)

---

### **📝 TEMPLATE DE RELATÓRIO**

```
✅ RESULTADO: [APROVADO/REPROVADO]

🛠️ FERRAMENTAS: [X]/21 funcionando (15 base + 2 campanhas + 2 filtros data + 2 auxiliares)
🚀 CAMPANHAS: [SIM/NÃO] - Listagem e detalhes funcionais
� ISOLAMENTO EMPRESA: [SIM/NÃO] - Campanhas isoladas corretamente
�🎨 FORMATAÇÃO HTML: [SIM/NÃO]
📊 DADOS REAIS: [SIM/NÃO] 
🔍 LOGS DETALHADOS: [SIM/NÃO]
⚡ PERFORMANCE: [BOA/RUIM]
🔗 FLUXOS INTEGRADOS: [SIM/NÃO]
📅 FILTROS POR DATA: [SIM/NÃO] - EXISTENTES
🛡️ PREVENÇÃO DUPLICATAS: [SIM/NÃO] - EXISTENTES
🖥️ MCP HTTP SERVER: [SIM/NÃO] - 17 ferramentas registradas
🔄 SISTEMA FORCING: [SIM/NÃO] - Sem loops infinitos

❌ PROBLEMAS ENCONTRADOS:
- [listar problemas ou "Nenhum"]

📋 OBSERVAÇÕES:
- [notas adicionais ou "N/A"]

🆕 NOVAS FUNCIONALIDADES TESTADAS:
- listCampaignsTool: [OK/FALHA]
- getCampaignDetailsTool: [OK/FALHA] 
- Isolamento por empresa: [OK/FALHA]
- Filtros de status: [OK/FALHA]
- countContactsByDateTool: [OK/FALHA] - EXISTENTE
- addContactsByDateTool: [OK/FALHA] - EXISTENTE
- Filtros temporais (hoje/ontem/semana/mês): [OK/FALHA] - EXISTENTE
- Prevenção de duplicatas: [OK/FALHA] - EXISTENTE

🔧 CORREÇÕES IMPLEMENTADAS:
- Tag creation error: [CORRIGIDO/PENDENTE]
- Database schema sync: [CORRIGIDO/PENDENTE]
- Infinite loops: [CORRIGIDO/PENDENTE]

⏰ TEMPO DE TESTE: [X] minutos
👤 TESTADO POR: [Nome do QA]
📅 DATA: [Data do teste]
```

---

### **🚨 AÇÃO EM CASO DE FALHA**

1. **Documentar** o problema exato
2. **Capturar** screenshot + logs do console  
3. **Reportar** para desenvolvimento
4. **Re-testar** após correção
5. **Aprovar** apenas com 100% funcionando

**🎯 Meta: Não prosseguir para produção até APROVAÇÃO COMPLETA!**
