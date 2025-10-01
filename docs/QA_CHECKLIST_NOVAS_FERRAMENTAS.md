# ✅ QA Checklist Rápido - Novas Ferramentas MCP

**Data:** 25 de agosto de 2025  
**Ferramentas Adicionadas:** `countLists` e `addContactsToList`  
**Status:** Pronto para teste  

## 🎯 **PRÉ-REQUISITOS PARA TESTE**

### **Ambiente:**
- [ ] Aplicação rodando em `http://localhost:9002`
- [ ] MCP Server rodando com **20 ferramentas**
- [ ] Usuário logado com dados de empresa
- [ ] Console do navegador aberto (F12)

### **Dados de Teste Necessários:**
- [ ] Pelo menos 2-3 listas criadas na empresa
- [ ] Pelo menos 3-5 contatos na empresa  
- [ ] IDs reais de contatos e listas disponíveis

## 🧪 **TESTE RÁPIDO - NOVA FERRAMENTA: `countLists`**

### **Comando de Teste:**
```
Acesse: http://localhost:9002/ai-chats
Digite: "quantas listas de contatos existem na empresa?"
```

### **✅ Checklist de Validação:**
- [ ] **Execução:** Ferramenta foi chamada sem erro?
- [ ] **Resposta:** Retornou número correto de listas?  
- [ ] **Formato:** Mensagem clara tipo "A empresa possui X lista(s)"?
- [ ] **Logs:** Console mostra `[MCP LISTS COUNT]` logs?
- [ ] **Tempo:** Resposta em menos de 3 segundos?

### **📊 Resultados Esperados:**
```
✅ SUCESSO: "A empresa possui 3 listas de contatos."
❌ FALHA: Erro de execução ou contagem incorreta
```

---

## 🧪 **TESTE RÁPIDO - NOVA FERRAMENTA: `addContactsToList`**

### **⚠️ Preparação Necessária:**
Primeiro, obtenha IDs reais:
```
"liste todas as listas" (para pegar ID da lista)
"liste os contatos" (para pegar IDs dos contatos)
```

### **Comando de Teste:**
```
Digite: "adicione os contatos [ID1], [ID2] à lista [NOME_DA_LISTA]"
Exemplo: "adicione os contatos abc123, def456 à lista Newsletter"
```

### **✅ Checklist de Validação:**
- [ ] **Validação:** Verifica se a lista existe?
- [ ] **Execução:** Adiciona contatos sem erro?
- [ ] **Resposta:** Confirma quantos contatos foram adicionados?
- [ ] **Formato:** Mensagem tipo "Adicionados X contatos à lista Y"?
- [ ] **Logs:** Console mostra `[MCP LISTS ADD CONTACTS]` logs?
- [ ] **Integridade:** Não permite duplicatas?

### **📊 Resultados Esperados:**
```
✅ SUCESSO: "Adicionados 2 contatos à lista Newsletter."
❌ FALHA: Erro de execução ou lista não encontrada
```

---

## 🔄 **TESTE DE INTEGRAÇÃO COMPLETA**

### **Fluxo de Teste Completo:**
```
1. "quantas listas existem?" → Deve retornar N listas
2. "crie uma lista chamada 'Teste QA'" → Nova lista criada  
3. "quantas listas existem?" → Deve retornar N+1 listas
4. "liste os contatos" → Pegar IDs de contatos
5. "adicione contato [ID] à lista Teste QA" → Adicionar contato
6. "liste todas as listas" → Verificar se 'Teste QA' aparece
```

### **✅ Checklist Final:**
- [ ] **Consistência:** Contadores sempre corretos?
- [ ] **Performance:** Todas as respostas < 5 segundos?
- [ ] **Usabilidade:** Mensagens claras e úteis?
- [ ] **Robustez:** Trata erros graciosamente?
- [ ] **Logs:** Todos os logs aparecem no console?

---

## 📊 **FORMULÁRIO DE RESULTADO**

### **Teste `countLists`:**
- **Status:** [ ] ✅ PASSOU [ ] ❌ FALHOU [ ] ⚠️ PARCIAL
- **Observações:** _______________

### **Teste `addContactsToList`:**
- **Status:** [ ] ✅ PASSOU [ ] ❌ FALHOU [ ] ⚠️ PARCIAL  
- **Observações:** _______________

### **Teste de Integração:**
- **Status:** [ ] ✅ PASSOU [ ] ❌ FALHOU [ ] ⚠️ PARCIAL
- **Observações:** _______________

---

## 🚨 **PROBLEMAS CONHECIDOS PARA VERIFICAR**

### **Possíveis Issues:**
1. **IDs inválidos:** Sistema deve retornar erro claro
2. **Lista inexistente:** Deve validar antes de adicionar  
3. **Contatos duplicados:** Não deve permitir duplicação
4. **Permissões:** Só deve contar/modificar listas da própria empresa

### **Comandos de Teste de Erro:**
```
❌ "adicione contato inexistente123 à lista Newsletter"
❌ "adicione contato [ID] à lista ListaQueNaoExiste"  
❌ "quantas listas existem na empresa XYZ?" (empresa diferente)
```

---

## 🎯 **CRITÉRIOS DE APROVAÇÃO**

### **Para APROVAR as novas ferramentas:**
- [x] **Build:** Compila sem erros ✅
- [x] **Registro:** Aparece nas 20 ferramentas MCP ✅  
- [ ] **countLists:** Executa e retorna contagem correta
- [ ] **addContactsToList:** Executa e adiciona contatos corretamente
- [ ] **Validação:** Trata erros apropriadamente
- [ ] **Performance:** Respostas rápidas (< 5s)
- [ ] **UX:** Mensagens claras para o usuário

### **Status Geral:**
**[ ] 🟢 APROVADO PARA PRODUÇÃO**  
**[ ] ⚠️ APROVADO COM RESSALVAS**  
**[ ] ❌ REPROVADO - NECESSITA CORREÇÕES**

---

**Responsável pelo teste:** _______________  
**Data do teste:** _______________  
**Versão testada:** v2.3.1 (20 ferramentas MCP)
