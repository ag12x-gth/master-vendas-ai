# ⚙️ Configuração Correta do Webhook Grapfy

## URL Correta para Configurar na Plataforma Grapfy

```
https://62863c59-d08b-44f5-a414-d7529041de1a-00-16zuyl87dp7m9.kirk.replit.dev/api/v1/webhooks/incoming/682b91ea-15ee-42da-8855-70309b237008
```

### ❌ URL ERRADA (Não funciona)
```
https://grapfy.com/api/v1/webhooks/incoming/682b91ea-15ee-42da-8855-70309b237008
```

### ✅ URL CORRETA (Deve ser configurada)
```
https://62863c59-d08b-44f5-a414-d7529041de1a-00-16zuyl87dp7m9.kirk.replit.dev/api/v1/webhooks/incoming/682b91ea-15ee-42da-8855-70309b237008
```

---

## 📊 Status dos Webhooks Testados

| ID Evento | Evento | Status | Código HTTP | Data |
|-----------|--------|--------|-------------|------|
| 49d862b7 | order_approved | ❌ Failed | 404 | 15/12 09:02 |
| 325b03be | pix_created | ❌ Failed | 404 | 13/12 17:37 |
| f6d0f811 | order_approved | ❌ Failed | 404 | 15/12 16:16 |
| bc8ba26a | order_approved | ❌ Failed | 404 | 13/12 17:38 |
| a3f041b3 | order_approved | ✅ Success | 200 | 12/12 12:02 |

---

## 🔄 Ações Necessárias

### Passo 1: Acessar Painel Grapfy
1. Faça login em sua conta Grapfy
2. Navegue até Configurações → Webhooks
3. Localize a configuração atual com domínio `grapfy.com`

### Passo 2: Atualizar URL
1. Edite o webhook
2. Altere a URL para:
```
https://62863c59-d08b-44f5-a414-d7529041de1a-00-16zuyl87dp7m9.kirk.replit.dev/api/v1/webhooks/incoming/682b91ea-15ee-42da-8855-70309b237008
```

### Passo 3: Testar Webhooks
1. Clique em "Reenviar" para os 4 eventos falhados
2. Verifique no painel Master IA se os eventos foram recebidos
3. Confirme HTTP 200 em todos

---

## 📝 Eventos Recuperados

Os 3 clientes dos eventos não recebidos foram registrados no sistema:

| Cliente | Email | Telefone | Data |
|---------|-------|----------|------|
| Marcelo Iésus Barbosa Gabriel Vieira | marceloiesus@icloud.com | 11975160344 | 15/12 |
| Luis Felipe Silva Souza | zickyclash@gmail.com | 16981619604 | 15/12 |
| Diego Abner Rodrigues Santana | admin@ag12x.com.br | 64999526870 | 15/12 |

---

## 🔍 Verificar Status Webhook

Para verificar se o webhook está configurado corretamente, faça uma chamada GET:

```bash
curl -X GET "https://62863c59-d08b-44f5-a414-d7529041de1a-00-16zuyl87dp7m9.kirk.replit.dev/api/v1/webhooks/incoming/682b91ea-15ee-42da-8855-70309b237008"
```

**Resposta esperada:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-15T19:41:46.257Z",
  "version": "1.0.0"
}
```

---

**Última atualização:** 15/12/2025 19:45Z  
**Status:** ✅ Análise Completa - Aguardando Reconfiguração Grapfy
