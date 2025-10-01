# Testes Manuais - Ferramentas Internas

## 🎯 Guia de Teste Manual Direto

---

## 1. **listContacts** - Listar Contatos

### Teste Manual via Chat IA

**Comando:** "Liste 5 contatos"

**Resultado Esperado:**
```json
{
  "contacts": [
    {
      "id": "123",
      "name": "João Silva",
      "email": "joao@email.com",
      "phone": "+5511999999999",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 5
}
```

**Variações de Teste:**
- "Busque contatos com nome Maria"
- "Liste os primeiros 10 contatos"
- "Mostre contatos da página 2"

**✅ Checklist:**
- [ ] Retorna lista de contatos
- [ ] Campos obrigatórios presentes
- [ ] Busca funciona corretamente
- [ ] Paginação respeitada
- [ ] Performance < 1s

---

## 2. **countContacts** - Contar Contatos

### Teste Manual via Chat IA

**Comando:** "Quantos contatos temos no total?"

**Resultado Esperado:**
```json
{
  "total": 1247
}
```

**Variações de Teste:**
- "Qual o número total de contatos?"
- "Me diga quantos contatos existem"

**✅ Checklist:**
- [ ] Retorna número inteiro
- [ ] Valor >= 0
- [ ] Resposta rápida < 500ms
- [ ] Consistente com listContacts

---

## 3. **listCampaigns** - Listar Campanhas

### Teste Manual via Chat IA

**Comando:** "Mostre campanhas ativas"

**Resultado Esperado:**
```json
{
  "campaigns": [
    {
      "id": "456",
      "name": "Promoção Black Friday",
      "status": "active",
      "channel": "whatsapp",
      "createdAt": "2024-01-10T15:30:00Z"
    }
  ]
}
```

**Variações de Teste:**
- "Liste todas as campanhas"
- "Mostre campanhas pausadas"
- "Quais campanhas estão em rascunho?"
- "Campanhas finalizadas"

**✅ Checklist:**
- [ ] Filtra por status corretamente
- [ ] Mostra todos os campos necessários
- [ ] Ordenação por data (mais recente primeiro)
- [ ] Status válidos: draft, active, paused, completed

---

## 4. **listConversations** - Listar Conversas

### Teste Manual via Chat IA

**Comando:** "Liste as últimas conversas"

**Resultado Esperado:**
```json
{
  "conversations": [
    {
      "id": "789",
      "contactId": "123",
      "status": "active",
      "lastMessageAt": "2024-01-15T14:20:00Z"
    }
  ]
}
```

**Variações de Teste:**
- "Mostre conversas ativas"
- "Liste 20 conversas"
- "Conversas mais recentes"

**✅ Checklist:**
- [ ] Ordenação por última mensagem
- [ ] Filtra por status se especificado
- [ ] Limit respeitado
- [ ] Dados consistentes

---

## 5. **countConversations** - Contar Conversas

### Teste Manual via Chat IA

**Comando:** "Quantas conversas temos?"

**Resultado Esperado:**
```json
{
  "total": 892
}
```

**Variações de Teste:**
- "Total de conversas"
- "Número de conversas no sistema"

**✅ Checklist:**
- [ ] Retorna número correto
- [ ] Performance adequada
- [ ] Valor realista

---

## 6. **calculator** - Calculadora

### Teste Manual via Chat IA

**Comando:** "Calcule 15 + 25 * 2"

**Resultado Esperado:**
```json
{
  "result": 65
}
```

**Variações de Teste:**
- "Quanto é 100 / 4?"
- "Calcule (10 + 5) * 3"
- "Resolva 2.5 + 3.7"
- "Quanto é 50% de 200?"

**Casos de Erro:**
- "Calcule 10 / 0" → Deve retornar erro
- "Calcule abc + 123" → Deve retornar erro

**✅ Checklist:**
- [ ] Operações básicas (+, -, *, /)
- [ ] Precedência matemática correta
- [ ] Parênteses funcionam
- [ ] Números decimais suportados
- [ ] Erros tratados adequadamente

---

## 7. **getCurrentDateTime** - Data/Hora Atual

### Teste Manual via Chat IA

**Comando:** "Que horas são agora?"

**Resultado Esperado:**
```json
{
  "currentDateTime": "2024-01-15T16:45:30.123Z"
}
```

**Variações de Teste:**
- "Qual a data e hora atual?"
- "Me diga o horário"
- "Data de hoje"

**✅ Checklist:**
- [ ] Formato ISO 8601
- [ ] Timezone UTC (Z no final)
- [ ] Data/hora próxima do real (< 5s diferença)
- [ ] Formato consistente

---

## 🔍 Teste de Integração

### Cenário Completo

**Sequência de Comandos:**
1. "Quantos contatos temos?"
2. "Liste 3 contatos"
3. "Mostre campanhas ativas"
4. "Calcule quantos contatos por campanha" (usar resultado dos anteriores)
5. "Que horas são?"

**Objetivo:** Verificar se as ferramentas funcionam em sequência e os dados são consistentes.

---

## 🚨 Teste de Erro

### Cenários de Falha

1. **Parâmetros Inválidos:**
   - "Liste -5 contatos" → Deve tratar graciosamente
   - "Busque contatos com filtro muito longo" → Deve limitar

2. **Sobrecarga:**
   - "Liste 10000 contatos" → Deve respeitar limite máximo
   - Múltiplas requisições simultâneas → Deve manter performance

3. **Dados Inexistentes:**
   - "Busque contato XYZ123" → Deve retornar array vazio
   - "Campanhas com status inválido" → Deve ignorar filtro

---

## 📱 Teste em Diferentes Agentes

### ContactsAgent
- "Liste meus contatos"
- "Quantos leads temos?"
- "Busque contato por email"

### CampaignAgent  
- "Mostre campanhas do WhatsApp"
- "Quantas campanhas ativas?"
- "Status das campanhas"

### DataAnalystAgent
- "Analise o número de conversas"
- "Compare contatos vs campanhas"
- "Calcule taxa de conversão"

---

## ⏱️ Teste de Performance

### Tempos Esperados
- **listContacts**: < 800ms
- **countContacts**: < 300ms  
- **listCampaigns**: < 600ms
- **listConversations**: < 1s
- **countConversations**: < 400ms
- **calculator**: < 100ms
- **getCurrentDateTime**: < 50ms

### Como Medir
1. Abra DevTools (F12)
2. Vá para aba Network
3. Execute comando no chat
4. Verifique tempo de resposta

---

## 📋 Checklist Final

### Funcionalidade
- [ ] Todas as 7 ferramentas funcionam
- [ ] Parâmetros aceitos corretamente
- [ ] Resultados no formato esperado
- [ ] Erros tratados adequadamente

### Performance
- [ ] Tempos dentro do esperado
- [ ] Não trava a interface
- [ ] Suporta múltiplas requisições

### Usabilidade
- [ ] Comandos naturais funcionam
- [ ] Respostas são compreensíveis
- [ ] Integração fluida com chat

### Dados
- [ ] Informações consistentes
- [ ] Filtros funcionam corretamente
- [ ] Paginação adequada
- [ ] Contagens precisas

---

**Status de Teste:** ⏳ Pendente  
**Testador:** _____________  
**Data:** ___/___/2024  
**Aprovado:** [ ] Sim [ ] Não