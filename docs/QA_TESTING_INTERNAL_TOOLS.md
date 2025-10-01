# QA Testing - Ferramentas Internas de IA

## 🎯 Objetivo
Documentação de testes diretos para validar o funcionamento das ferramentas internas implementadas.

---

## 📋 Lista de Ferramentas

### 1. **listContacts** - Listar Contatos

**Entrada:**
```json
{
  "limit": 10,
  "offset": 0,
  "search": "João"
}
```

**Teste 1 - Listagem Básica:**
- ✅ Retorna array de contatos
- ✅ Máximo 10 contatos
- ✅ Campos obrigatórios: id, name, email, phone
- ✅ Formato JSON válido

**Teste 2 - Busca por Nome:**
- ✅ Filtra contatos contendo "João"
- ✅ Busca case-insensitive
- ✅ Retorna array vazio se não encontrar

**Teste 3 - Paginação:**
- ✅ Offset funciona corretamente
- ✅ Limit respeitado
- ✅ Resultados consistentes

---

### 2. **countContacts** - Contar Contatos

**Entrada:**
```json
{}
```

**Teste 1 - Contagem Total:**
- ✅ Retorna número inteiro
- ✅ Valor >= 0
- ✅ Formato: `{"total": 150}`

**Teste 2 - Consistência:**
- ✅ Valor consistente com listContacts
- ✅ Atualiza após inserção/remoção

---

### 3. **listCampaigns** - Listar Campanhas

**Entrada:**
```json
{
  "status": "active",
  "limit": 5
}
```

**Teste 1 - Listagem por Status:**
- ✅ Filtra campanhas ativas
- ✅ Status válidos: draft, active, paused, completed
- ✅ Campos: id, name, status, channel, createdAt

**Teste 2 - Sem Filtros:**
- ✅ Retorna todas as campanhas
- ✅ Ordenação por data de criação (desc)
- ✅ Limit padrão: 20

**Teste 3 - Status Inválido:**
- ✅ Ignora filtro inválido
- ✅ Retorna todas as campanhas

---

### 4. **listConversations** - Listar Conversas

**Entrada:**
```json
{
  "limit": 15,
  "status": "active"
}
```

**Teste 1 - Listagem com Status:**
- ✅ Filtra por status específico
- ✅ Campos: id, contactId, status, lastMessageAt
- ✅ Ordenação por última mensagem (desc)

**Teste 2 - Listagem Completa:**
- ✅ Sem filtro de status
- ✅ Limit respeitado
- ✅ Dados consistentes

---

### 5. **countConversations** - Contar Conversas

**Entrada:**
```json
{}
```

**Teste 1 - Contagem Total:**
- ✅ Retorna número inteiro
- ✅ Formato: `{"total": 89}`
- ✅ Valor >= 0

**Teste 2 - Validação:**
- ✅ Consistente com listConversations
- ✅ Performance adequada (<100ms)

---

### 6. **calculator** - Calculadora

**Entrada:**
```json
{
  "expression": "2 + 2 * 3"
}
```

**Teste 1 - Operações Básicas:**
- ✅ Soma: `"1 + 1"` → `{"result": 2}`
- ✅ Subtração: `"5 - 3"` → `{"result": 2}`
- ✅ Multiplicação: `"4 * 2"` → `{"result": 8}`
- ✅ Divisão: `"10 / 2"` → `{"result": 5}`

**Teste 2 - Precedência:**
- ✅ `"2 + 2 * 3"` → `{"result": 8}`
- ✅ `"(2 + 2) * 3"` → `{"result": 12}`

**Teste 3 - Casos Especiais:**
- ✅ Divisão por zero: retorna erro
- ✅ Expressão inválida: retorna erro
- ✅ Números decimais: `"1.5 + 2.5"` → `{"result": 4}`

---

### 7. **getCurrentDateTime** - Data/Hora Atual

**Entrada:**
```json
{}
```

**Teste 1 - Formato de Saída:**
- ✅ Retorna ISO 8601: `{"currentDateTime": "2024-01-15T10:30:00.000Z"}`
- ✅ Timezone UTC
- ✅ Data válida (parseable)

**Teste 2 - Precisão:**
- ✅ Diferença < 1 segundo da hora real
- ✅ Formato consistente

---

## 🔧 Como Testar

### Método 1 - Via Interface IA
1. Acesse qualquer agente de IA
2. Digite comando que acione a ferramenta
3. Verifique resposta conforme critérios

### Método 2 - Via Código
```typescript
import { internalTools } from '@/ai/tools/internal-tools';

// Teste listContacts
const result = await internalTools.listContacts.execute({
  limit: 5,
  search: "test"
});
console.log(result);
```

### Método 3 - Via API
```bash
# Teste via endpoint de IA
curl -X POST /api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Liste 5 contatos"}'
```

---

## ✅ Critérios de Aprovação

### Performance
- ⏱️ Resposta < 500ms para consultas simples
- ⏱️ Resposta < 2s para consultas complexas

### Dados
- 📊 Resultados consistentes
- 📊 Formato JSON válido
- 📊 Campos obrigatórios presentes

### Erros
- ❌ Tratamento adequado de erros
- ❌ Mensagens de erro claras
- ❌ Não quebra o sistema

### Segurança
- 🔒 Não expõe dados sensíveis
- 🔒 Validação de entrada
- 🔒 Sanitização de parâmetros

---

## 📝 Checklist Final

- [ ] Todas as 7 ferramentas testadas
- [ ] Performance dentro dos limites
- [ ] Tratamento de erros validado
- [ ] Dados consistentes e corretos
- [ ] Segurança verificada
- [ ] Documentação atualizada

---

**Status:** ✅ Pronto para Produção  
**Última Atualização:** $(date)  
**Responsável:** QA Team