# 🤖 Scripts de Teste Automatizado - Ferramentas AI

## 🎯 **Visão Geral**

Este documento contém scripts e comandos prontos para testar todas as ferramentas de IA de forma sistemática e organizada.

---

## 📋 **ROTEIRO DE TESTE SEQUENCIAL**

### **🚀 FASE 1: CONFIGURAÇÃO INICIAL**

Execute na seguinte ordem para preparar dados de teste:

```bash
# 1. Criar tags de teste
"crie uma tag chamada 'Prospecção'"
"crie uma tag chamada 'VIP' com cor verde"
"crie uma tag chamada 'Leads'"

# 2. Criar listas de teste  
"crie uma lista chamada 'VIP' para clientes especiais"
"crie uma lista chamada 'Newsletter'"
"crie uma lista chamada 'Premium'"

# 3. Verificar criação
"liste todas as tags"
"liste todas as listas"
```

---

### **🔍 FASE 2: TESTE DE LISTAGEM**

```bash
# Campanhas
"liste o nome de todas as campanhas"
"liste campanhas ativas"
"liste campanhas completas"
"quais campanhas existem?"

# Contatos
"quantos contatos temos?"
"liste contatos com DDD 62"
"busque contatos com telefone 11"
"liste os contatos"

# Conversas
"liste as conversas recentes"
"mostre os atendimentos"
"quais conversas abertas?"
"liste conversas arquivadas"
```

---

### **🏷️ FASE 3: GESTÃO DE TAGS**

```bash
# Listar tags existentes
"liste todas as tags"

# Adicionar contatos às tags (substitua pelos IDs reais obtidos acima)
"adicione os contatos do DDD 62 à tag Prospecção"
"adicione contatos com DDD 11 na tag VIP"
"inclua contatos 85 na tag Leads"

# Verificar associações
"liste todas as tags"

# Remover contatos específicos
"remova das tags os contatos do DDD 62"
```

---

### **📋 FASE 4: GESTÃO DE LISTAS**

```bash
# Listar listas existentes
"liste todas as listas"

# Buscar lista específica
"busque a lista VIP"

# Adicionar contatos às listas
"adicione os contatos do DDD 62 na lista VIP"
"inclua contatos 11 na lista Newsletter"
"adicione contatos 85 à lista Premium"

# Verificar listas
"liste todas as listas"
```

---

### **🧹 FASE 5: LIMPEZA (CUIDADO!)**

```bash
# ⚠️ ATENÇÃO: Estes comandos apagam dados!
# Teste apenas em ambiente de desenvolvimento

# Limpeza de tags
"remova todos os contatos de todas as tags"

# Limpeza de listas
"remova todos os contatos de todas as listas"

# Limpeza completa
"limpe tudo, remova todos os contatos de tags e listas"

# Verificar limpeza
"liste todas as tags"
"liste todas as listas"
```

---

### **🔍 FASE 6: ANÁLISE DE CONVERSAS**

```bash
# Primeiro, obter IDs de conversas
"liste as conversas recentes"

# Depois, analisar uma conversa específica (use ID real)
"analise a conversa [ID_REAL_AQUI]"
"faça uma análise da conversa [ID_REAL_AQUI]"
"examine o atendimento [ID_REAL_AQUI]"
```

---

## ⚡ **TESTE RÁPIDO DE VALIDAÇÃO**

### **Sequência de 5 minutos para validação básica:**

```bash
# 1. Teste básico de listagem
"liste campanhas"

# 2. Teste de formatação HTML
"liste todas as tags" 

# 3. Teste de fluxo integrado
"adicione contatos 62 na lista VIP"

# 4. Teste de busca
"quantos contatos com DDD 11?"

# 5. Teste de logs
"remova das tags os contatos do DDD 99"
```

---

## 🔧 **COMANDOS DE DEBUG**

### **Para verificar logs detalhados:**

Abra o Console do navegador (F12) e execute:

```javascript
// Filtrar apenas logs das ferramentas
console.clear();
// Depois execute qualquer comando AI e veja os logs [TOOL START], [TOOL END], etc.
```

### **Para testar formatação HTML:**

```bash
# Estes comandos devem retornar HTML formatado
"liste campanhas"
"liste tags" 
"liste listas"
"liste conversas"
```

### **Para testar parâmetros válidos:**

```bash
# Estes NÃO devem gerar "unknown"
"adicione contatos 62 à tag VIP"  # Deve usar listTags primeiro
"adicione contatos 11 na lista Premium"  # Deve usar listLists primeiro
```

---

## 📊 **BATERIA DE TESTE DE STRESS**

### **Teste todos os comandos em sequência:**

```bash
"crie uma tag chamada 'Teste1'"
"crie uma lista chamada 'Teste1'"
"liste campanhas ativas"
"liste contatos com DDD 62"
"liste conversas abertas"
"liste todas as tags"
"liste todas as listas"
"adicione contatos 62 à tag Teste1"
"adicione contatos 62 na lista Teste1"
"busque a lista Teste1"
"quantos contatos temos?"
"remova das tags os contatos do DDD 99"
"liste campanhas completas"
```

---

## 🎯 **CASOS DE BORDA PARA TESTAR**

### **Situações especiais:**

```bash
# Tags inexistentes
"adicione contatos à tag NaoExiste"

# Listas inexistentes  
"adicione contatos na lista NaoExiste"

# DDDs sem contatos
"adicione contatos 00 à tag VIP"

# Conversas inexistentes
"analise a conversa id-fake-123"

# Comandos ambíguos
"liste"
"adicione"
"remova"
```

---

## ✅ **CHECKLIST DE VALIDAÇÃO RÁPIDA**

Para cada comando testado, verificar:

- [ ] **Executou sem erro** (não apareceu mensagem de erro)
- [ ] **Usou ferramentas** (não respondeu com conhecimento prévio)
- [ ] **HTML formatado** (listas, negrito, etc. aparecem formatados)
- [ ] **Dados reais** (não inventou dados, consultou banco)
- [ ] **Logs aparecem** (console mostra [TOOL START] / [TOOL END])
- [ ] **Sem "unknown"** (nunca deve aparecer unknown nos parâmetros)
- [ ] **Tempo < 10s** (resposta rápida)

---

## 🚨 **ALERTAS DE FALHA CRÍTICA**

**Pare o teste imediatamente se:**

🔴 **Qualquer comando retorna "unknown" nos parâmetros**
🔴 **IA responde sem usar ferramentas (dados inventados)**  
🔴 **Formatação HTML não funciona (texto plano)**
🔴 **Erro 500 ou falha de conexão**
🔴 **Operações executam mas não modificam banco de dados**

---

## 📈 **RELATÓRIO DE TESTE**

### **Template para reportar resultados:**

```markdown
## Relatório de Teste - [DATA]

### Ferramentas Testadas: ✅ XX/15

### Sucessos:
- listCampaignsTool: ✅ Funcionando, HTML OK
- createTagTool: ✅ Cria corretamente
- [etc...]

### Falhas:
- addContactsToTagTool: ❌ Parâmetro "unknown"
- [descrição do problema...]

### Formatação HTML:
- [ ] Campanhas: Lista formatada
- [ ] Tags: Lista formatada  
- [ ] Listas: Lista formatada
- [ ] Conversas: Lista formatada

### Performance:
- Tempo médio por comando: Xs
- Comandos mais lentos: [lista]

### Observações:
[Notas adicionais do teste]
```

---

## 🎯 **RESULTADO ESPERADO FINAL**

**✅ APROVAÇÃO** se todos os itens estiverem funcionando:

1. **15 ferramentas funcionando** sem erros
2. **HTML formatado** em todas as listas
3. **Dados reais** do banco em todas as consultas
4. **Fluxos integrados** funcionando (ID passing)
5. **Logs detalhados** aparecem no console
6. **Performance adequada** (< 10s por comando)
7. **Zero parâmetros "unknown"**

**🚀 Meta: Aprovação 100% antes do deploy de produção!**
