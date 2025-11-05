# 🔧 Configuração de Webhook Meta API Cloud

## ⚠️ PROBLEMA IDENTIFICADO (05/nov/2025)

**Sintoma:** Mensagens de WhatsApp não aparecem em `/atendimentos`  
**Causa:** Meta enviando webhooks para conexão inativa (`roseli-5865-1`)  
**Solução:** Atualizar webhook URL na Meta para conexão ativa (`roseli-5865-2`)

---

## 📊 INFORMAÇÕES DA CONEXÃO ATIVA

### Conexão: `roseli-5865-2`

| Campo | Valor |
|-------|-------|
| **Phone Number ID** | `391262387407327` |
| **WABA ID** | `399691246563833` |
| **Company ID** | `682b91ea-15ee-42da-8855-70309b237008` |
| **Webhook Slug** | `0e07d508-a498-4082-be0e-8602f8d17b07` |
| **Status** | ✅ ATIVA |

---

## 🌐 URL CORRETA DO WEBHOOK

### **URL Completa:**
```
https://62863c59-d08b-44f5-a414-d7529041de1a-00-16zuyl87dp7m9.kirk.replit.dev/api/webhooks/meta/0e07d508-a498-4082-be0e-8602f8d17b07
```

### **Formato Geral:**
```
https://{REPLIT_DOMAIN}/api/webhooks/meta/{WEBHOOK_SLUG}
```

---

## 🔧 PASSOS PARA ATUALIZAR NO META BUSINESS MANAGER

### 1. Acessar Meta Business Manager
1. Acesse: https://business.facebook.com/
2. Navegue até **WhatsApp Business** > **API Setup**
3. Selecione o número de telefone: **391262387407327**

### 2. Configurar Webhook
1. Clique em **Configure Webhooks** ou **Edit**
2. Cole a **URL correta** (veja acima)
3. **Callback URL:** 
   ```
   https://62863c59-d08b-44f5-a414-d7529041de1a-00-16zuyl87dp7m9.kirk.replit.dev/api/webhooks/meta/0e07d508-a498-4082-be0e-8602f8d17b07
   ```
4. **Verify Token:** (usar valor da env `META_VERIFY_TOKEN`)

### 3. Subscrever Eventos
Marque os seguintes campos webhook:
- ✅ **messages** (obrigatório - recebe mensagens)
- ✅ **message_echoes** (opcional - confirma envio)
- ✅ **message_status** (opcional - status de entrega)

### 4. Verificar Webhook
1. Clique em **Verify and Save**
2. Meta enviará requisição GET para validação
3. Aguarde confirmação: ✅ **Webhook Verified**

---

## 🧪 TESTE APÓS CONFIGURAÇÃO

### Teste Manual
1. Envie mensagem WhatsApp do seu celular para o número conectado
2. Aguarde 3-5 segundos
3. Verifique logs do servidor:
   ```bash
   grep "POST /api/webhooks/meta" logs
   ```
4. Verifique `/atendimentos` - conversa deve aparecer

### Teste de Verificação
```bash
curl -X GET "https://62863c59-d08b-44f5-a414-d7529041de1a-00-16zuyl87dp7m9.kirk.replit.dev/api/webhooks/meta/0e07d508-a498-4082-be0e-8602f8d17b07?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=TEST123"
```

**Resposta esperada:** `TEST123` (status 200)

---

## 🛡️ SEGURANÇA

### HMAC Validation
- Todo webhook é validado com **assinatura HMAC SHA-256**
- Header: `x-hub-signature-256`
- Usa `app_secret` criptografado da conexão
- Rejeita webhooks com assinatura inválida (403)

### Filtros de Segurança
- Apenas conexões ativas (`is_active = true`)
- Apenas tipo `meta_api`
- Validação de `webhookSlug` da empresa
- Descriptografia segura de secrets

---

## ⚙️ VARIÁVEIS DE AMBIENTE NECESSÁRIAS

```env
META_VERIFY_TOKEN=seu_token_secreto_aqui
ENCRYPTION_KEY=sua_chave_32_bytes_aqui
```

---

## 📝 PROCEDIMENTO DE MIGRAÇÃO DE CONEXÃO

**Quando trocar de uma conexão Meta para outra:**

1. ✅ Criar nova conexão no sistema (ex: `roseli-5865-2`)
2. ✅ Marcar nova conexão como `is_active = true`
3. ✅ Marcar conexão antiga como `is_active = false`
4. ⚠️ **ATUALIZAR WEBHOOK NA META** (este passo é CRÍTICO!)
5. ✅ Testar com mensagem real
6. ✅ Verificar logs do servidor
7. ✅ Confirmar aparição em `/atendimentos`

**❌ ERRO COMUM:** Esquecer passo 4 - webhooks continuam indo para conexão antiga!

---

## 🔍 DEBUGGING

### Webhook não chega no servidor?
```bash
# Verificar logs por webhooks recentes
grep "POST /api/webhooks/meta" logs | tail -20

# Verificar erros de verificação
grep "Webhook Verification" logs | tail -10
```

### Mensagem não aparece em /atendimentos?
1. Verificar se webhook chegou (logs acima)
2. Verificar se mensagem foi salva no banco:
   ```sql
   SELECT * FROM messages 
   ORDER BY sent_at DESC 
   LIMIT 5;
   ```
3. Verificar erros de processamento:
   ```bash
   grep "ERROR" logs | tail -20
   ```

---

## 📊 MONITORAMENTO

### Logs Importantes
- ✅ `[Webhook Verification]` - Verificação de webhook
- ✅ `POST /api/webhooks/meta` - Webhook recebido
- ❌ `Webhook recebido para slug não encontrado` - Slug inválido
- ❌ `App Secret não encontrado` - Problema de descriptografia
- ❌ `Assinatura do webhook inválida` - HMAC falhou

### Alertas Recomendados
- ⚠️ Nenhum webhook recebido em >5 minutos
- ⚠️ Taxa de erro >10% em webhooks
- ⚠️ Falhas de descriptografia

---

**Documentação criada em:** 05/nov/2025  
**Última atualização:** 05/nov/2025  
**Responsável:** Sistema de Diagnóstico
