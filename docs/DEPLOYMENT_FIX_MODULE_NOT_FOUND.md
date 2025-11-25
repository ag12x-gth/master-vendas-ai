# 🚀 Correção: Erro de Deployment - Module not found: '@/lib/auth'

## ❌ **Erro Reportado**

```
Module not found: Can't resolve '@/lib/auth'

./src/app/api/v1/ia/personas/[personaid]/sections/[sectionId]/route.ts
Module not found: Can't resolve '@/lib/auth'

https://nextjs.org/docs/messages/module-not-found

> Build failed because of webpack errors
```

---

## 🔍 **Diagnóstico**

### Arquivo Problemático
`src/app/api/v1/ia/personas/[personaId]/sections/[sectionId]/route.ts`

### Código Incorreto
```typescript
// ❌ ANTES - Import incorreto
import { getUserFromSession } from '@/lib/auth';
```

**Problemas:**
1. **Módulo não existe**: `@/lib/auth` não existe no projeto
2. **Função errada**: `getUserFromSession` não existe - a correta é `getUserSession`
3. **Caminho errado**: Deveria importar de `@/app/actions`

---

## ✅ **Solução Aplicada**

### 1. Import Correto
```typescript
// ✅ DEPOIS - Import correto
import { getUserSession } from '@/app/actions';
```

### 2. Uso Correto da Função
```typescript
// ❌ ANTES
const user = await getUserFromSession();
if (!user) {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
}

// ✅ DEPOIS
const session = await getUserSession();
if (session.error || !session.user) {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
}
const user = session.user;
```

### 3. Alterações Realizadas

**Arquivo**: `src/app/api/v1/ia/personas/[personaId]/sections/[sectionId]/route.ts`

**PUT Method** (linha 1-16):
- ✅ Mudou import de `@/lib/auth` para `@/app/actions`
- ✅ Mudou `getUserFromSession` para `getUserSession`
- ✅ Adicionou tratamento correto do objeto `session`

**DELETE Method** (linha 80-89):
- ✅ Mesmas correções aplicadas

---

## 📊 **Validação**

### Build Next.js
```bash
npm run build
```

**Resultado**: ✅ **Sucesso Total**
- Diretório `.next` criado
- Sem erros de webpack
- Sem erros de TypeScript
- Sem erros de ESLint (apenas warnings permitidos)
- Todas as rotas compiladas

### Correções Adicionais Necessárias

Após a correção inicial do import, o build revelou outros erros de type safety:

1. **5 Erros de ESLint**: Corrigidos
   - Aspas não escapadas em JSX
   - `let` que deveria ser `const`
   - Comentários ESLint para hooks do Baileys
   - `var` em `declare global`

2. **TypeScript Null Safety**: Corrigidos em 5 arquivos
   - `src/app/actions.ts` (2 locais)
   - `src/lib/facebookApiService.ts` (2 funções)
   - `src/app/api/v1/connections/[connectionId]/configure-webhook/route.ts`
   - `src/app/(main)/kanban/[funnelId]/page.tsx`

**Padrão corrigido**:
```typescript
// ❌ ANTES
const token = decrypt(connection.accessToken); // Erro se null

// ✅ DEPOIS
if (!connection.accessToken) {
  throw new Error('Token não configurado');
}
const token = decrypt(connection.accessToken);
```

### Arquivos Gerados
```
.next/
├── app-build-manifest.json  ✅
├── build-manifest.json       ✅
├── server/                   ✅
├── static/                   ✅
└── trace                     ✅
```

---

## 🎯 **Root Cause**

### Por que o erro aconteceu?
1. **Arquivo legado**: Route criado com import antigo/incorreto
2. **Módulo inexistente**: `@/lib/auth` nunca foi criado no projeto
3. **Função correta**: `getUserSession` está em `@/app/actions.ts` (linha 28)

### Estrutura Correta de Auth
```typescript
// src/app/actions.ts
export async function getUserSession(): Promise<{
  user: UserWithCompany | null,
  error?: string,
  errorCode?: string
}> {
  // Implementação...
}

export async function getCompanyIdFromSession(): Promise<string> {
  // Usa getUserSession internamente
}

export async function getUserIdFromSession(): Promise<string> {
  // Usa getUserSession internamente
}
```

---

## 📝 **Como Usar Corretamente**

### Padrão Recomendado

```typescript
// Em qualquer API Route
import { getUserSession } from '@/app/actions';

export async function GET(request: NextRequest) {
  // 1. Obter sessão
  const session = await getUserSession();
  
  // 2. Verificar autorização
  if (session.error || !session.user) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    );
  }
  
  // 3. Usar dados do usuário
  const user = session.user;
  const companyId = user.companyId;
  
  // ... resto da lógica
}
```

### Alternativa Simplificada

Se precisar apenas do `companyId`:

```typescript
import { getCompanyIdFromSession } from '@/app/actions';

export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyIdFromSession();
    // ... usar companyId
  } catch (error) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    );
  }
}
```

---

## ⚠️ **Checklist para Evitar este Erro**

Ao criar novos API routes:

- [ ] ✅ Importar de `@/app/actions` (não `@/lib/auth`)
- [ ] ✅ Usar `getUserSession()` (não `getUserFromSession()`)
- [ ] ✅ Tratar `session.error` e `session.user`
- [ ] ✅ Testar build antes de deployment (`npm run build`)

---

## 🚀 **Status do Deployment**

✅ **Erro corrigido**
✅ **Build compilando sem erros**
✅ **Pronto para deployment**

**Próximo passo**: Tentar deploy novamente no Replit.

---

**Data**: 06 de Novembro de 2025  
**Versão**: 2.4.1  
**Status**: ✅ RESOLVIDO
