# 📸 PROTOCOLO OBRIGATÓRIO: SCREENSHOT DO DASHBOARD
## Para Agents/Subagents/Tools - Testes/Validação/Diagnóstico

**Data Criação:** 2025-12-12  
**Última Atualização:** 2025-12-12T20:30Z  
**Status:** ✅ ATIVO - OBRIGATÓRIO PARA TODOS OS AGENTES  

---

## 🎯 DESCRIÇÃO GERAL

Este protocolo documenta o processo COMPROVADO de obtenção do screenshot do dashboard autenticado (`tests/e2e/screenshots/dashboard-visible.png`).

Usado para: **Testes, validação, diagnóstico e investigação de funcionalidades da interface autenticada.**

---

## 📋 PROCESSO COMPROVADO (Evidência empírica: 29/11/2025 15:20:01)

### Pré-requisitos:
- ✅ Servidor rodando em `http://localhost:5000`
- ✅ Credenciais válidas: `diegomaninhu@gmail.com` / `MasterIA2025!`
- ✅ Playwright @playwright/test instalado
- ✅ Diretório `tests/e2e/screenshots/` criado

### Fluxo Completo (7 Etapas):

#### ETAPA 1: Inicializar Teste Playwright
```typescript
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const TEST_USER = {
  email: 'diegomaninhu@gmail.com',
  password: 'MasterIA2025!'
};

const SCREENSHOT_DIR = 'tests/e2e/screenshots';
```

#### ETAPA 2: Garantir Diretório Existe
```typescript
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}
```

#### ETAPA 3: Acessar Página de Login
```typescript
await page.goto('http://localhost:5000/login');
await page.waitForLoadState('networkidle');

// Validação
expect(page.url()).toContain('/login');
```

#### ETAPA 4: Preencher e Submeter Credenciais
```typescript
const emailInput = page.locator('input[type="email"]').first();
const passwordInput = page.locator('input[type="password"]').first();
const submitButton = page.locator('button[type="submit"]').first();

// Validações prévias
await expect(emailInput).toBeVisible({ timeout: 10000 });
await expect(passwordInput).toBeVisible();

// Preenchimento
await emailInput.fill(TEST_USER.email);
await passwordInput.fill(TEST_USER.password);

// Submissão
await submitButton.click();
```

#### ETAPA 5: Aguardar Redirecionamento para Dashboard
```typescript
// CRÍTICO: Aguardar URL contendo /dashboard
await page.waitForURL('**/dashboard', { timeout: 30000 });
await page.waitForLoadState('networkidle');

// Validação
const url = page.url();
expect(url).toContain('/dashboard');
console.log(`✓ Dashboard carregado: ${url}`);
```

#### ETAPA 6: Executar Screenshot Completo
```typescript
const screenshotPath = path.join(SCREENSHOT_DIR, 'dashboard-visible.png');

await page.screenshot({
  path: screenshotPath,
  fullPage: true  // IMPORTANTE: Captura página inteira
});

console.log(`✓ Screenshot salvo: ${screenshotPath}`);
```

#### ETAPA 7: Validar Arquivo Criado
```typescript
if (fs.existsSync(screenshotPath)) {
  const stats = fs.statSync(screenshotPath);
  console.log(`✓ Arquivo: ${screenshotPath}`);
  console.log(`  Tamanho: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`  Criado: ${stats.mtime}`);
} else {
  throw new Error(`Screenshot não criado: ${screenshotPath}`);
}
```

---

## ✅ RESULTADO ESPERADO

**Arquivo:** `tests/e2e/screenshots/dashboard-visible.png`

| Propriedade | Valor |
|-------------|-------|
| Tamanho | ~115 KB |
| Formato | PNG (fullPage) |
| URL | `/dashboard` ou `/super-admin` |
| Estado de Autenticação | ✅ Autenticado |
| Título | Master IA |

---

## 🔍 VALIDAÇÕES CRÍTICAS

### 1. URL Final
```bash
✓ Deve conter "/dashboard" ou "/super-admin"
✗ NÃO pode estar em "/login"
```

### 2. Arquivo Gerado
```bash
✓ Deve existir em: tests/e2e/screenshots/dashboard-visible.png
✓ Tamanho > 50 KB (imagem real, não vazia)
✓ Formato: PNG válido
```

### 3. Conteúdo da Imagem
```bash
✓ Deve mostrar interface do dashboard autenticado
✓ Pode incluir: navbar, sidebar, cards, tabelas
✗ Não deve mostrar página de login
✗ Não deve mostrar erro 404 ou 500
```

### 4. Cookies de Sessão
```typescript
const cookies = await page.context().cookies();
const sessionCookie = cookies.find(c => 
  c.name === '__session' || c.name === 'session_token'
);

if (sessionCookie) {
  console.log('✓ Sessão persistida');
} else {
  throw new Error('Sessão não criada - login falhou');
}
```

---

## 🚨 POSSÍVEIS FALHAS E SOLUÇÕES

### Falha: "Timeout waiting for URL /dashboard"
**Causa:** Login falhou ou redirecionamento lento  
**Solução:**
```typescript
// Aumentar timeout
await page.waitForURL('**/dashboard', { timeout: 60000 });

// Verificar credenciais
console.log(`Email: ${TEST_USER.email}`);
console.log(`Senha: ${TEST_USER.password}`);

// Verificar se botão existe
const btn = await page.locator('button[type="submit"]').first();
if (!btn) throw new Error('Botão de submit não encontrado');
```

### Falha: "Screenshot path directory does not exist"
**Causa:** Diretório não foi criado  
**Solução:**
```typescript
import { mkdirSync } from 'fs';
mkdirSync('tests/e2e/screenshots', { recursive: true });
```

### Falha: "Arquivo PNG vazio ou corrompido"
**Causa:** Page.screenshot() executado antes de carregar  
**Solução:**
```typescript
// Adicionar wait adicional
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);  // Buffer adicional
```

---

## 📊 USO PARA AGENTS/SUBAGENTS/TOOLS

### Quando usar este protocolo:

1. **Testes de Funcionalidade**
   - Validar dashboard renderiza corretamente
   - Confirmar redirecionamento após login

2. **Diagnóstico de Problemas**
   - Verificar se interface está visível
   - Coletar evidência visual de erros

3. **Validação de UI/UX**
   - Comparar screenshots antes/depois de mudanças
   - Validar responsividade

4. **Testes de Regressão**
   - Rodar screenshot após deploy
   - Comparar com versão anterior

### Comando para rodar via CLI:

```bash
# Rodar teste específico
npx playwright test tests/e2e/complete-user-flow.spec.ts

# Com output detalhado
npx playwright test tests/e2e/complete-user-flow.spec.ts --reporter=list

# Com debug
npx playwright test --debug tests/e2e/complete-user-flow.spec.ts
```

---

## 🔐 INFORMAÇÕES SENSÍVEIS

**Credenciais para uso em testes:**
```
Email: diegomaninhu@gmail.com
Senha: MasterIA2025!
```

⚠️ **OBRIGATÓRIO:**
- Nunca commitar credenciais em código
- Usar variáveis de ambiente em produção
- Credenciais acima são APENAS para testes locais
- Sempre comparar screenshots de antes e depois da implementacao com objetivo de verificar o sucesso ou nao do que foi implementado no plano de execucao, ate que esteja fiel ao proposto no plano.

---

## 📈 HISTÓRICO DE EXECUÇÕES

| Data | Ferramenta | Arquivo | Tamanho | Status |
|------|-----------|---------|---------|--------|
| 2025-11-29 15:20 | Playwright | dashboard-visible.png | 115 KB | ✅ |
| 2025-12-12 20:22 | Playwright | dashboard-authenticated.png | 92 KB | ✅ |

---

## ✅ CHECKLIST OBRIGATÓRIO PARA AGENTES

Antes de usar este protocolo:

- [ ] Servidor está rodando em `http://localhost:5000`
- [ ] Credenciais diegomaninhu@gmail.com / MasterIA2025! estão corretas
- [ ] Playwright está instalado (`npm list @playwright/test`)
- [ ] Diretório `tests/e2e/screenshots/` existe
- [ ] Teste Playwright criado seguindo as 7 etapas
- [ ] URL final contém `/dashboard` (não `/login`)
- [ ] Arquivo PNG foi criado com tamanho > 50 KB
- [ ] Conteúdo mostra dashboard autenticado (não erro)
- [ ] Sessão cookie foi criada (`__session` ou `session_token`)
- [ ] Documentação atualizada com evidências

---

## 🎯 RESULTADO FINAL

✅ **Protocolo testado e validado:** 2025-11-29 15:20:01  
✅ **Evidência:** `tests/e2e/screenshots/dashboard-visible.png` (115 KB)  
✅ **Aplicável para:** Agents, Subagents, Ferramentas de Teste/Validação/Diagnóstico  

---

**Este protocolo é OBRIGATÓRIO para todos os agentes ao executar testes ou diagnósticos de funcionalidades autenticadas do Master IA.**
