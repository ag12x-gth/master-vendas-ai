# 📧 Instruções de Reset de Senha em Massa

## ✅ Status
Script de reset de senha em massa foi criado e está pronto para uso!

## 📍 Localização do Endpoint
`/api/admin/send-password-reset`

## 🚀 Como Executar

### Opção 1: Via curl
```bash
curl -X POST http://localhost:5000/api/admin/send-password-reset \
  -H "Authorization: Bearer YOUR_ADMIN_RESET_TOKEN" \
  -H "Content-Type: application/json"
```

### Opção 2: Via fetch (JavaScript)
```javascript
const response = await fetch('/api/admin/send-password-reset', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.ADMIN_RESET_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

const result = await response.json();
console.log(result);
```

## 🔐 Segurança
- Requer token de autorização: `ADMIN_RESET_TOKEN`
- Deve ser configurado como variável de ambiente
- Apenas admins autorizados podem executar

## 📊 O que o Script Faz

1. **Busca todos os usuários** do banco de dados
2. **Gera tokens únicos** para cada usuário (válidos por 24h)
3. **Insere tokens** na tabela `password_reset_tokens`
4. **Envia emails** com links de reset via Replit Mail
5. **Retorna estatísticas** de sucesso/erro

## 📧 Emails Enviados

Cada usuário receberá:
- **Assunto:** 🔐 Reset de Senha - Master IA Oficial
- **Conteúdo:** HTML personalizado com botão de reset
- **Link:** `{NEXT_PUBLIC_BASE_URL}/reset-password?token={TOKEN_ÚNICO}`
- **Validade:** 24 horas

## 📝 Exemplo de Resposta

```json
{
  "success": true,
  "message": "Reset de senha enviado para 38 usuários",
  "stats": {
    "total": 38,
    "sent": 38,
    "errors": 0
  },
  "results": [
    {
      "name": "Fabiana Consoni",
      "email": "ecoorsolar@gmail.com",
      "status": "enviado"
    },
    ...
  ]
}
```

## ⚙️ Configuração Necessária

Adicione ao arquivo `.env`:
```env
# Token de autorização para reset de senha em massa
ADMIN_RESET_TOKEN=seu_token_secreto_aqui

# URL pública da aplicação
NEXT_PUBLIC_BASE_URL=https://seu-dominio.com

# Serviço de email Replit
REPLIT_MAIL_SERVICE_URL=http://localhost:3000/api/send-email
```

## 📊 Usuários Afetados

**Total: 38 usuários**
- 36 Admins
- 2 Atendentes  
- 1 SuperAdmin

## 🔄 Próximos Passos

1. ✅ Script criado
2. ⏳ Configurar `ADMIN_RESET_TOKEN`
3. ⏳ Executar POST para `/api/admin/send-password-reset`
4. ⏳ Verificar logs de envio
5. ⏳ Usuários receberão emails com links de reset

## 📞 Suporte

Se tiver problemas:
1. Verificar se `ADMIN_RESET_TOKEN` está configurado
2. Verificar logs do servidor
3. Testar envio para um usuário primeiro
4. Validar configuração de email Replit

---

**Criado em:** 21/11/2025
**Status:** Pronto para deploy
