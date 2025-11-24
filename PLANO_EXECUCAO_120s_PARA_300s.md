# PLANO DE EXECUÇÃO: 120s → 300s Timeout
**Data Solicitação**: 2025-11-24 06:30  
**Arquivos Afetados**: server.js (5 linhas)  
**Risco**: MUITO BAIXO  
**Tempo Estimado**: 15 minutos

---

## 📋 FASE 1: PREPARAÇÃO (Pré-Execução)

### Status Atual
```
✅ Análise concluída (ANALISE_IMPACTO_120s_PARA_300s.md)
✅ Código identificado (server.js linhas 271, 274, 278, 283, 343)
✅ Backup não necessário (mudança simples, reversível em 1 min)
✅ Replit workflow parado (porta 8080 já liberada)
⏳ AGUARDANDO: Aprovação do usuário com "OK"
```

### Pré-Requisitos
- [x] Entendimento da mudança
- [x] Impacto analisado (zero regressões)
- [x] Rollback plan pronto (git revert 1 commit)
- [ ] ⏳ Aprovação do usuário (FALTA ISTO)

---

## 🔧 FASE 2: IMPLEMENTAÇÃO (Após "OK")

### Mudança #1: Atualizar timeout default (linha 271)
**Arquivo**: `server.js`  
**Linha**: 271  
**Antes**:
```javascript
  console.log('🔄 Preparing Next.js in background (timeout: 120s)...');
```
**Depois**:
```javascript
  console.log('🔄 Preparing Next.js in background (timeout: 300s)...');
```

---

### Mudança #2: Atualizar função prepareWithTimeout default (linha 274)
**Arquivo**: `server.js`  
**Linha**: 274  
**Antes**:
```javascript
  const prepareWithTimeout = (timeoutMs = 120000) => {
```
**Depois**:
```javascript
  const prepareWithTimeout = (timeoutMs = 300000) => {
```

---

### Mudança #3: Atualizar mensagem de erro (linha 278)
**Arquivo**: `server.js`  
**Linha**: 278  
**Antes**:
```javascript
        setTimeout(() => reject(new Error('Next.js prepare timeout after 120s')), timeoutMs)
```
**Depois**:
```javascript
        setTimeout(() => reject(new Error('Next.js prepare timeout after 300s')), timeoutMs)
```

---

### Mudança #4: Atualizar chamada inicial (linha 283)
**Arquivo**: `server.js`  
**Linha**: 283  
**Antes**:
```javascript
  prepareWithTimeout(120000)
```
**Depois**:
```javascript
  prepareWithTimeout(300000)
```

---

### Mudança #5: Atualizar retry (linha 343)
**Arquivo**: `server.js`  
**Linha**: 343  
**Antes**:
```javascript
        prepareWithTimeout(120000)
```
**Depois**:
```javascript
        prepareWithTimeout(300000)
```

---

## 🧪 FASE 3: TESTE LOCAL (Após Implementação)

### Teste 1: Validar Código
```bash
# Procurar por "120000" em server.js (não deve encontrar nada)
grep "120000" server.js
# Expected: (vazio - nenhuma ocorrência)

# Procurar por "300000" em server.js (deve encontrar 2)
grep "300000" server.js
# Expected: 2 ocorrências (prepareWithTimeout default + chamada inicial)

# Procurar por "300s" em server.js (deve encontrar 2)
grep "300s" server.js
# Expected: 2 ocorrências (console.log e mensagem de erro)
```

### Teste 2: Health Check Local
```bash
# Aguardar workflow iniciar
# Executar 5 health checks
curl -s http://localhost:8080/health | jq .
# Expected:
#  {
#    "status": "healthy",
#    "nextReady": true,
#    ...
#  }
```

### Teste 3: Verificar Logs
```
Procurar por:
  ✅ "Preparing Next.js in background (timeout: 300s)"
  ✅ "Next.js ready!" ou "Next.js prepare timeout after 300s"
  ✅ Nenhuma referência a "120s"
```

---

## 🚀 FASE 4: DEPLOY PRODUÇÃO (Após Testes Local OK)

### Passo 1: Commit (automático)
```
Git commit das 5 mudanças será criado automaticamente
Mensagem: "fix: increase app.prepare() timeout from 120s to 300s"
```

### Passo 2: Publicar
```
Clique em "Publish" no Replit
Selecione: Autoscale (ou VM)
Aguarde: ~5 minutos
```

### Passo 3: Monitorar Deploy
```
Procurar nos logs por:
  ✅ "Preparing Next.js in background (timeout: 300s)"
  ✅ "Next.js ready!" (esperado em < 3 min)
  ✅ "Health checks" passando
  
Se demorar:
  ⏳ 2-3 min: Normal (primeira deploy)
  ⏳ 3-5 min: OK (DB pode estar lento)
  ⏳ 5+ min: Verificar logs se há erros
```

---

## 📊 CHECKLIST DE EXECUÇÃO

### PRÉ-IMPLEMENTAÇÃO
- [ ] Usuário confirmou com "OK"
- [ ] Análise de impacto revisada
- [ ] Plano de rollback entendido

### IMPLEMENTAÇÃO
- [ ] Mudança #1: Linha 271 ✅
- [ ] Mudança #2: Linha 274 ✅
- [ ] Mudança #3: Linha 278 ✅
- [ ] Mudança #4: Linha 283 ✅
- [ ] Mudança #5: Linha 343 ✅
- [ ] Arquivo salvo sem erros

### TESTE LOCAL
- [ ] Teste 1: Código validado (grep check)
- [ ] Teste 2: Health check OK (HTTP 200)
- [ ] Teste 3: Logs corretos
- [ ] Zero erros em server.js
- [ ] Workflow running normalmente

### PRODUÇÃO
- [ ] Deploy iniciado (Publish button)
- [ ] "Preparing Next.js in background (timeout: 300s)" nos logs
- [ ] Health checks passando
- [ ] "Next.js ready!" em < 3 min

---

## 🔄 ROLLBACK PLAN (Se Necessário)

Se algo der errado, REVERTER é simples:

### Rollback Option 1: Git Revert
```bash
git revert HEAD  # Reverter último commit
npm run start:prod  # Reiniciar
```

### Rollback Option 2: Manual
Mudar de volta 5 linhas em server.js:
- Linha 271: "300s" → "120s"
- Linha 274: `300000` → `120000`
- Linha 278: "300s" → "120s"
- Linha 283: `300000` → `120000`
- Linha 343: `300000` → `120000`

**Tempo de Rollback**: < 2 minutos

---

## ⏱️ ESTIMATIVA DE TEMPO

| Fase | Tempo | Status |
|------|-------|--------|
| Análise | ✅ Concluída | ~10 min (já feito) |
| Implementação | ⏳ Aguardando OK | ~2 min |
| Teste Local | ⏳ Após OK | ~3 min |
| Deploy Prod | ⏳ Após OK | ~5-7 min |
| Validação | ⏳ Após Deploy | ~2 min |
| **TOTAL** | - | **~15 min** |

---

## 🎯 CRITÉRIOS DE SUCESSO

### ✅ Sucesso = Todos Estes Aparecerem

1. **Código**
   - ✅ Nenhum "120000" em server.js
   - ✅ 2x "300000" em server.js
   - ✅ 2x "300s" em server.js

2. **Local**
   - ✅ Workflow rodando sem erros
   - ✅ Health check: HTTP 200 em < 10ms
   - ✅ nextReady: true nos logs

3. **Produção**
   - ✅ Deploy completa (botão Publish verde)
   - ✅ Logs mostram "timeout: 300s"
   - ✅ Health checks passando em produção
   - ✅ "Next.js ready!" em < 3 minutos

### ❌ Falha = Qualquer Uma Destas

1. ❌ Erros em server.js na execução
2. ❌ Health checks falhando (HTTP != 200)
3. ❌ Deploy cancelado pelo Replit
4. ❌ "Next.js prepare timeout" em < 300 segundos (indica erro real, não timeout falso)

---

## 📝 NOTAS IMPORTANTES

### Mudança é Reversível
- ✅ Simples: 5 números + 2 strings
- ✅ Não quebra DB
- ✅ Não quebra código
- ✅ Reverte em 1 minuto se necessário

### Sem Breaking Changes
- ✅ API não muda
- ✅ Environment variables não mudam
- ✅ Banco de dados não muda
- ✅ Frontend não precisa mudar nada

### Production-Safe
- ✅ Aumenta timeout é SEMPRE mais seguro que diminuir
- ✅ Zero risco de performance piorar
- ✅ Zero risco de regressão funcional

---

## 🚦 PRÓXIMO PASSO

**TIPO**: Aprovação do Usuário

**AÇÃO NECESSÁRIA**: Responda com `OK` para iniciar execução

**O QUE VOCÊ ENVIARÁ**:
1. ✅ Implementação das 5 mudanças
2. ✅ Testes locais (5/5 health checks)
3. ✅ Relatório de sucesso
4. ✅ Instruções para Deploy (Publish)

**ESPERADO**: ~15 minutos até tudo pronto

---

**Status Atual**: ⏳ AGUARDANDO APROVAÇÃO  
**Riscos**: ZERO identificados  
**Confiança**: 99.9% (mudança muito simples)  
**Autorização Necessária**: Sim, com `OK`
