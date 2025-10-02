# 📞 Guia de Teste Manual - Vapi Voice Calls

## 🎯 Objetivo
Validar a funcionalidade completa de iniciar chamadas de voz via Vapi diretamente do frontend.

---

## 📋 PRÉ-REQUISITOS

### ✅ Credenciais Necessárias
Antes de iniciar, confirme que estas variáveis estão configuradas no `.env`:

```bash
VAPI_API_KEY=sk-...              # API Key do Vapi
VAPI_PHONE_NUMBER=+55119...      # Número Twilio configurado no Vapi
VAPI_ASSISTANT_ID=ba9630ff-...   # ID do assistente (opcional)
```

**Como verificar:**
```bash
# No terminal Replit
echo $VAPI_API_KEY
echo $VAPI_PHONE_NUMBER
```

### ✅ Sistema Rodando
- ✅ Frontend compilado sem erros
- ✅ Banco de dados conectado
- ✅ Servidor rodando na porta 5000

---

## 🚀 PASSO-A-PASSO DO TESTE

### **ETAPA 1: Acesso ao Sistema**

1. **Abra o navegador** e acesse a URL do Replit
2. **Faça login** com suas credenciais
3. **Aguarde** o dashboard carregar completamente

**✅ Validação:** Você deve ver o dashboard com métricas e estatísticas.

---

### **ETAPA 2: Navegação para Atendimentos**

1. **Clique** no menu lateral em **"Atendimentos"**
2. **Aguarde** a lista de conversas carregar
3. **Observe** se há conversas disponíveis

**✅ Validação:** Você deve ver uma lista de conversas no lado esquerdo da tela.

**❌ Problema:** "Nenhuma conversa encontrada"
- **Solução:** Crie um contato de teste primeiro (veja Apêndice A)

---

### **ETAPA 3: Seleção de Contato**

1. **Clique** em qualquer conversa da lista lateral
2. **Aguarde** o painel direito abrir
3. **Observe** o painel "Detalhes do Contato"

**✅ Validação:** Você deve ver:
```
┌──────────────────────┐
│ [Avatar]             │
│ Nome do Contato      │
│ 🇧🇷 +55 11 9xxxx... │
├──────────────────────┤
│ [Botão Verde]        │ ← AQUI!
│ "📞 Iniciar Chamada" │
├──────────────────────┤
│ Segmentação          │
│ Notas Internas       │
└──────────────────────┘
```

**❌ Problema:** Botão não aparece
- **Solução:** Verifique se o painel direito está aberto (pode estar colapsado em mobile)

---

### **ETAPA 4: Preparação do Teste**

**IMPORTANTE:** Anote os dados do contato selecionado:

```
Nome: _______________________
Telefone: ___________________
ID do Contato: ______________
```

**Como pegar o ID do Contato:**
1. Abra o DevTools do navegador (F12)
2. Vá na aba "Console"
3. Digite: `document.querySelector('[data-contact-id]')?.getAttribute('data-contact-id')`

Ou simplesmente use o telefone para identificar depois no banco.

---

### **ETAPA 5: Iniciação da Chamada** 🎯

1. **Clique** no botão verde **"📞 Iniciar Chamada de Voz"**
2. **Observe** imediatamente:
   - ⏳ Botão muda para "Iniciando chamada..."
   - 🔄 Ícone de loading aparece
   - 🚫 Botão fica desabilitado

**✅ Validação - Estado de Loading:**
```
[🔄 Iniciando chamada...]
```

3. **Aguarde** de 2-5 segundos
4. **Observe** o toast (notificação) que aparece no canto da tela

---

### **ETAPA 6: Validação da Resposta**

#### ✅ **CENÁRIO 1: Sucesso**

**Toast exibido:**
```
📞 Chamada Iniciada!
Ligando para [Nome do Cliente]
ID: call_abc123xyz...
```

**Validações:**
- ✅ Toast verde aparece
- ✅ ID da chamada é exibido
- ✅ Botão volta ao estado normal
- ✅ Nome do cliente aparece corretamente

**Anote o ID da chamada:** `_______________________`

---

#### ❌ **CENÁRIO 2: Erro**

**Possíveis mensagens de erro:**

**1. "VAPI_API_KEY not configured"**
```json
{
  "error": "VAPI_API_KEY not configured. Please set up Vapi integration."
}
```
**Solução:** Configure a variável `VAPI_API_KEY` no `.env` e reinicie o servidor.

---

**2. "Failed to initiate call"**
```json
{
  "error": "Failed to initiate call",
  "details": {...}
}
```
**Solução:** 
- Verifique se `VAPI_PHONE_NUMBER` está correto
- Confirme se o número Twilio está ativo no Vapi
- Verifique o console do backend para mais detalhes

---

**3. "Vapi API error: 401"**
```json
{
  "error": "Vapi API error: 401 - Unauthorized"
}
```
**Solução:** API Key inválida ou expirada. Gere uma nova no dashboard do Vapi.

---

**4. "Vapi API error: 429"**
```json
{
  "error": "Vapi API error: 429 - Too Many Requests"
}
```
**Solução:** Limite de chamadas atingido. Aguarde alguns minutos ou upgrade no plano Vapi.

---

**5. "Missing required field: phoneNumber"**
```json
{
  "error": "Missing required field: phoneNumber"
}
```
**Solução:** O contato não possui telefone cadastrado. Edite o contato e adicione um telefone.

---

### **ETAPA 7: Verificação no Backend**

1. **Abra o terminal Replit**
2. **Procure** no log do servidor por:

```bash
# Buscar logs de sucesso
✅ Vapi call initiated: call_abc123xyz...
```

**Como visualizar logs:**
```bash
# Últimas 50 linhas do log
tail -n 50 /tmp/logs/Frontend_*.log | grep "Vapi"
```

---

### **ETAPA 8: Verificação no Banco de Dados** 🗄️

**Método 1: Via SQL Tool (Recomendado)**

Execute a seguinte query no console SQL do Replit:

```sql
-- Buscar chamadas recentes (últimas 10)
SELECT 
  vapi_call_id,
  customer_name,
  customer_phone,
  status,
  duration,
  TO_CHAR(started_at, 'DD/MM/YYYY HH24:MI:SS') as inicio,
  TO_CHAR(ended_at, 'DD/MM/YYYY HH24:MI:SS') as fim,
  summary
FROM vapi_calls 
ORDER BY created_at DESC 
LIMIT 10;
```

**✅ Validação Esperada:**
```
vapi_call_id      | customer_name  | status      | inicio
------------------|----------------|-------------|-------------------
call_abc123xyz... | João Silva     | in-progress | 02/10/2025 15:30:15
```

**Status possíveis:**
- `in-progress` = Chamada em andamento ✅
- `completed` = Chamada finalizada ✅
- `failed` = Chamada falhou ❌
- `no-answer` = Cliente não atendeu ⚠️

---

**Método 2: Verificar Transcrições**

```sql
-- Buscar transcrições da última chamada
SELECT 
  role,
  text,
  TO_CHAR(timestamp, 'HH24:MI:SS') as horario
FROM vapi_transcripts vt
JOIN vapi_calls vc ON vt.call_id = vc.id
WHERE vc.vapi_call_id = 'SEU_CALL_ID_AQUI'
ORDER BY vt.timestamp;
```

**✅ Validação Esperada:**
```
role      | text                                    | horario
----------|----------------------------------------|----------
assistant | Olá, aqui é o assistente da Master IA  | 15:30:16
user      | Olá, preciso de ajuda                  | 15:30:20
assistant | Claro! Como posso ajudar?              | 15:30:22
```

---

**Método 3: Via API**

```bash
# Criar arquivo de teste
cat > test-db-check.js << 'EOF'
const { db } = require('./src/lib/db');
const { vapiCalls, vapiTranscripts } = require('./shared/schema');
const { desc, eq } = require('drizzle-orm');

async function checkLatestCall() {
  const calls = await db.select()
    .from(vapiCalls)
    .orderBy(desc(vapiCalls.createdAt))
    .limit(5);
  
  console.log('📞 Últimas chamadas:', JSON.stringify(calls, null, 2));
}

checkLatestCall().catch(console.error).finally(() => process.exit());
EOF

# Executar
node test-db-check.js
```

---

### **ETAPA 9: Teste do Webhook (Avançado)**

Para validar que o webhook está recebendo eventos:

1. **Monitore** o arquivo de log do webhook:

```bash
tail -f /tmp/logs/Frontend_*.log | grep "📞 VAPI WEBHOOK"
```

2. **Após iniciar a chamada**, você deve ver:

```
📞 VAPI WEBHOOK RECEIVED: call-started
  Call ID: call_abc123xyz...
  Customer: João Silva (+55119...)
  
📞 VAPI WEBHOOK RECEIVED: transcript
  Role: assistant
  Text: Olá, aqui é o assistente...

📞 VAPI WEBHOOK RECEIVED: call-ended
  Duration: 45s
  Status: completed
```

**⏱️ Timeline esperado:**
- `call-started`: Imediato (0-2s após clicar)
- `transcript`: Durante a chamada (múltiplos eventos)
- `call-ended`: Ao finalizar (depende da duração)

---

## 🔍 CHECKLIST DE VALIDAÇÃO COMPLETA

Use este checklist para garantir que tudo está funcionando:

### ✅ Frontend
- [ ] Botão "Iniciar Chamada de Voz" aparece no painel lateral
- [ ] Botão é verde com ícone de telefone
- [ ] Estado de loading funciona (texto muda + ícone gira)
- [ ] Botão é desabilitado durante a chamada
- [ ] Toast de sucesso aparece com ID da chamada
- [ ] Toast de erro aparece com mensagem clara (se falhar)

### ✅ Backend API
- [ ] Endpoint `/api/vapi/initiate-call` responde HTTP 200
- [ ] Payload enviado contém: phoneNumber, customerName, context, conversationId
- [ ] Log do servidor mostra "✅ Vapi call initiated"
- [ ] Resposta contém: success, callId, status, message

### ✅ Vapi Cloud
- [ ] Chamada é criada no dashboard do Vapi
- [ ] Telefone do cliente toca (se número válido)
- [ ] Assistente fala a mensagem inicial corretamente
- [ ] Transcrição em português funciona

### ✅ Webhook
- [ ] Evento `call-started` é recebido e persistido
- [ ] Eventos `transcript` são recebidos e persistidos
- [ ] Evento `call-ended` é recebido e atualiza status
- [ ] Logs mostram: "✅ Call started persisted"

### ✅ Database
- [ ] Registro na tabela `vapi_calls` é criado
- [ ] Campos preenchidos: vapi_call_id, customer_name, customer_phone, status
- [ ] Foreign keys corretas: contact_id, company_id
- [ ] Transcrições na tabela `vapi_transcripts` (se houver)
- [ ] Status é atualizado para "completed" após a chamada

---

## ⚠️ TROUBLESHOOTING

### 🔴 **Problema: Botão não aparece**

**Sintomas:**
- Painel lateral está aberto
- Contato está selecionado
- Mas botão não está visível

**Soluções:**
1. **Limpe o cache do navegador** (Ctrl+Shift+R)
2. **Verifique o console do navegador** (F12) por erros de compilação
3. **Reinicie o servidor Next.js**
4. **Verifique se o componente está importado corretamente**

---

### 🔴 **Problema: Erro "VAPI_API_KEY not configured"**

**Sintomas:**
- Toast vermelho aparece
- Mensagem: "VAPI_API_KEY not configured"

**Soluções:**
1. Verifique o `.env`:
   ```bash
   cat .env | grep VAPI
   ```
2. Se não existir, adicione:
   ```bash
   echo "VAPI_API_KEY=sk-your-key-here" >> .env
   ```
3. **Reinicie o servidor** (obrigatório!)

---

### 🔴 **Problema: Chamada criada mas não toca no telefone**

**Sintomas:**
- Frontend mostra "Chamada Iniciada!"
- Banco tem o registro
- Mas telefone não toca

**Soluções:**
1. **Verifique o número de telefone:**
   - Deve estar no formato internacional: `+5511987654321`
   - Sem espaços, parênteses ou hífens
   
2. **Verifique o VAPI_PHONE_NUMBER:**
   ```bash
   echo $VAPI_PHONE_NUMBER
   ```
   - Deve ser um número Twilio válido e ativo
   
3. **Verifique o dashboard do Vapi:**
   - Acesse https://dashboard.vapi.ai
   - Vá em "Calls"
   - Procure pelo call_id
   - Veja o status e erros

4. **Verifique limites do Twilio:**
   - Conta trial do Twilio só liga para números verificados
   - Verifique o número de destino no console Twilio

---

### 🔴 **Problema: Webhook não está recebendo eventos**

**Sintomas:**
- Chamada é criada
- Mas não há logs de webhook
- Banco não é atualizado

**Soluções:**
1. **Verifique a URL do webhook no código:**
   ```bash
   grep "serverUrl" src/app/api/vapi/initiate-call/route.ts
   ```
   Deve apontar para: `https://seu-dominio.replit.dev/api/vapi/webhook`

2. **Teste o webhook diretamente:**
   ```bash
   curl -X POST https://seu-dominio.replit.dev/api/vapi/webhook \
     -H "Content-Type: application/json" \
     -H "x-signature: test" \
     -d '{"message":{"type":"call-started"}}'
   ```

3. **Verifique firewall/CORS:**
   - Replit deve permitir requisições externas
   - Webhook deve ser público (sem autenticação adicional além do HMAC)

---

### 🔴 **Problema: Transcrições vazias**

**Sintomas:**
- Chamada completa
- Mas tabela `vapi_transcripts` está vazia

**Soluções:**
1. **Verifique se houve fala:**
   - Assistente falou?
   - Cliente falou?
   
2. **Verifique o transcriber:**
   ```bash
   grep "transcriber" src/app/api/vapi/initiate-call/route.ts
   ```
   Deve ter: `provider: "deepgram", language: "pt-BR"`

3. **Verifique logs de webhook:**
   ```bash
   grep "transcript" /tmp/logs/Frontend_*.log
   ```

---

## 📊 DADOS DE TESTE SUGERIDOS

Para um teste completo, use estes dados:

```json
{
  "nome": "Cliente Teste Vapi",
  "telefone": "+5511987654321",
  "notas": "Cliente solicitou suporte técnico urgente sobre integração API"
}
```

**Números de teste válidos (se usar Twilio trial):**
- Seu próprio celular (verificado no Twilio)
- Números de teste do Twilio

---

## 🎯 CENÁRIO DE TESTE IDEAL

### **Teste 1: Fluxo Completo (Happy Path)**
1. ✅ Login no sistema
2. ✅ Navegar para Atendimentos
3. ✅ Selecionar contato com número válido
4. ✅ Clicar em "Iniciar Chamada"
5. ✅ Validar toast de sucesso
6. ✅ Verificar log do backend
7. ✅ Verificar registro no BD
8. ✅ Atender o telefone e conversar com assistente
9. ✅ Finalizar chamada
10. ✅ Verificar status "completed" no BD
11. ✅ Verificar transcrições salvas

### **Teste 2: Erro de API Key**
1. ❌ Remover `VAPI_API_KEY` temporariamente
2. ❌ Tentar iniciar chamada
3. ✅ Validar toast de erro correto
4. ✅ Recolocar API Key
5. ✅ Validar que voltou a funcionar

### **Teste 3: Contato sem Telefone**
1. ❌ Criar contato sem telefone
2. ❌ Tentar iniciar chamada
3. ✅ Validar erro apropriado
4. ✅ Adicionar telefone
5. ✅ Validar que funciona

---

## 📈 MÉTRICAS DE SUCESSO

**Um teste é considerado bem-sucedido quando:**

### ✅ **Funcionalidade**
- [ ] 100% dos cliques no botão resultam em tentativa de chamada
- [ ] 100% das chamadas bem-sucedidas são persistidas no BD
- [ ] 100% dos webhooks são recebidos e processados
- [ ] 0 erros não tratados no console

### ✅ **Performance**
- [ ] Tempo de resposta da API < 3s
- [ ] Loading state visível durante todo o processo
- [ ] Interface não trava durante a chamada

### ✅ **UX**
- [ ] Feedback visual claro em todos os momentos
- [ ] Mensagens de erro compreensíveis
- [ ] Botão sempre acessível quando apropriado

---

## 🚀 PRÓXIMOS PASSOS APÓS TESTE

Após validar que tudo está funcionando:

1. **Documentar resultados:**
   - Anotar problemas encontrados
   - Registrar tempo de resposta
   - Listar melhorias necessárias

2. **Testar em diferentes cenários:**
   - Diferentes navegadores (Chrome, Firefox, Safari)
   - Dispositivos móveis
   - Diferentes horários/carga do sistema

3. **Implementar melhorias:**
   - Dashboard de métricas (próxima prioridade!)
   - Histórico de chamadas na interface
   - Notificações em tempo real

---

## 📞 SUPORTE

**Se encontrar problemas:**

1. **Verifique os logs:**
   ```bash
   tail -n 100 /tmp/logs/Frontend_*.log
   ```

2. **Console do navegador:**
   - F12 → Console
   - Procure por erros em vermelho

3. **Banco de dados:**
   ```sql
   SELECT * FROM vapi_calls ORDER BY created_at DESC LIMIT 5;
   ```

4. **Vapi Dashboard:**
   - https://dashboard.vapi.ai
   - Calls → Ver detalhes da chamada

---

## ✅ CONCLUSÃO

Este guia cobre **100% do fluxo de teste** da funcionalidade de chamadas Vapi.

**Tempo estimado do teste completo:** 15-20 minutos

**Boa sorte com os testes!** 🚀📞

---

**Versão:** 1.0  
**Data:** 02/10/2025  
**Autor:** Agent 3 (Expert Ultra Premium) 💪✨
