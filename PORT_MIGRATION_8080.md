# 🔄 Migração de Porta: 5000 → 8080

**Data:** 23 de Novembro de 2025  
**Motivo:** Solicitação do usuário para usar porta 8080 ao invés de 5000

---

## ✅ Arquivos Atualizados

### 1. Código do Servidor
- ✅ `server.js` - Porta padrão alterada de 5000 para 8080
- ✅ `src/lib/socket.ts` - CORS origins atualizados para 8080
- ✅ `src/utils/get-base-url.ts` - Fallback localhost alterado para 8080

### 2. Scripts e Utilitários
- ✅ `scripts/health-check.sh` - Porta de monitoramento alterada para 8080
- ✅ `scripts/start-server-safe.sh` - Porta padrão alterada para 8080
- ✅ `scripts/send-password-reset-emails.ts` - BaseURL atualizado para 8080
- ✅ `scripts/batch-password-reset.ts` - BaseURL atualizado para 8080

### 3. Configuração de Testes
- ✅ `playwright.config.ts` - BaseURL dos testes E2E alterado para 8080

### 4. Documentação
- ✅ `fix-deployment-ports.md` - Instruções atualizadas para porta 8080
- ✅ `replit.md` - Documentação do projeto atualizada

---

## 📝 Mudanças Específicas

### Server.js
```javascript
// ANTES:
const port = process.env.PORT || 5000;

// DEPOIS:
const port = process.env.PORT || 8080;
```

### Socket.IO CORS
```javascript
// ANTES:
: ['http://localhost:5000', 'http://localhost:3000', 'http://0.0.0.0:5000']

// DEPOIS:
: ['http://localhost:8080', 'http://localhost:3000', 'http://0.0.0.0:8080']
```

### Playwright Tests
```typescript
// ANTES:
baseURL: 'http://localhost:5000'

// DEPOIS:
baseURL: 'http://localhost:8080'
```

---

## ⚠️ AÇÃO NECESSÁRIA

### Editar `.replit` Manualmente

**VOCÊ PRECISA FAZER:**

1. Abra o arquivo `.replit` no editor do Replit
2. Localize TODAS as seções `[[ports]]` (há 13 no total)
3. DELETE todas EXCETO esta:

```toml
[[ports]]
localPort = 8080
externalPort = 80
```

4. Salve o arquivo

**Por que manual?**  
Por questões de segurança, o arquivo `.replit` não pode ser editado automaticamente pelo agente.

---

## 🧪 Como Testar

### 1. Desenvolvimento Local
```bash
# O servidor deve iniciar na porta 8080
npm run start:prod

# Verificar health check
curl http://localhost:8080/health
```

### 2. Acessar a Aplicação
```
http://localhost:8080
```

### 3. Testes E2E
```bash
# Os testes agora usam porta 8080
npm run test:e2e
```

---

## 🚀 Deploy

Após editar o `.replit`:

1. ✅ Edite `.replit` (remova portas extras, mantenha 8080→80)
2. 💾 Salve o arquivo
3. 📦 Clique em "Publish" no Replit
4. ⚙️ Selecione "VM" deployment
5. ✓ Confirme configuração
6. ⏳ Aguarde 2-5 minutos
7. 🎉 Acesse URL de produção

---

## 📊 Impactos da Mudança

### ✅ Sem Impacto
- Lógica de negócio
- Autenticação
- Base de dados
- APIs externas
- Funcionalidades

### ⚙️ Requer Atualização
- `.replit` (manual pelo usuário)
- Variável de ambiente `PORT` (se definida explicitamente)
- Links hardcoded em código customizado (se houver)

---

## 🔍 Verificação de Integridade

### Portas Verificadas
- ✅ Servidor HTTP: 8080
- ✅ Socket.IO: 8080
- ✅ Health Check: 8080
- ✅ Playwright Tests: 8080
- ✅ Scripts utilitários: 8080

### Arquivos Não Afetados
- Configurações do Next.js (usa variáveis de ambiente)
- Configurações do PostgreSQL
- Configurações do Redis
- APIs de terceiros (Meta, OpenAI, etc.)

---

## 💡 Notas Importantes

1. **Porta Externa Sempre 80**  
   No deployment Replit, a porta externa é sempre 80 (HTTP) ou 443 (HTTPS), independente da porta interna.

2. **Variável de Ambiente PORT**  
   Se você definir `PORT=8080` como variável de ambiente, o servidor usará essa porta.

3. **Desenvolvimento vs Produção**  
   - **Dev:** `localhost:8080`
   - **Prod:** `seu-app.replit.app` (porta 80/443 automaticamente)

4. **Health Checks**  
   O endpoint `/health` responde corretamente em qualquer porta configurada.

---

## ✅ Status

**Migração Completa:** ✅  
**Código Atualizado:** ✅  
**Testes Atualizados:** ✅  
**Documentação Atualizada:** ✅  
**Aguardando:** Edição manual do `.replit` pelo usuário

---

**Última Atualização:** 23 de Novembro de 2025  
**Responsável:** Replit Agent  
**Validado:** Pendente (após edição do .replit e restart)
