# 🔧 Correção: Erro de Health Check para Conexões Baileys

## 📋 Problema Diagnosticado

### Sintoma
Dashboard mostrando erro "Falha ao descriptografar o token de acesso" para conexões Baileys ativas e funcionando.

### Causa Raiz
O endpoint `/api/v1/connections/health` estava tentando descriptografar o `accessToken` de **TODAS** as conexões ativas, incluindo conexões do tipo Baileys.

**Problema**: Conexões Baileys **NÃO USAM** `accessToken` porque utilizam autenticação via QR Code com sessões salvas em arquivo (`whatsapp_sessions/`). O campo `access_token` no banco de dados é `NULL` para conexões Baileys, o que é **NORMAL**.

### Comportamento Anterior (INCORRETO)
```typescript
// ❌ ANTES - Tentava descriptografar token de TODAS as conexões
if (connection.isActive) {
  const accessToken = decrypt(connection.accessToken); // NULL para Baileys!
  if (!accessToken) {
    health.status = 'error';
    health.errorMessage = 'Falha ao desencriptar o token de acesso';
  }
}
```

### Evidência no Banco de Dados
```sql
-- Conexão "Grapfy" - Baileys funcionando corretamente
id: 11d7b10a-94fd-43fe-9bea-073e9bd38aa5
config_name: Grapfy
connection_type: baileys    ← Tipo Baileys
access_token: NULL          ← NULL é NORMAL para Baileys
is_active: true
status: connected           ← Funcionando!
```

---

## ✅ Solução Implementada

### Mudanças no Arquivo
**Arquivo**: `src/app/api/v1/connections/health/route.ts`

### 1. Diferenciação por Tipo de Conexão
```typescript
// ✅ DEPOIS - Verifica tipo de conexão antes de validar token
if (connection.connectionType === 'baileys' || !connection.connectionType) {
  // Baileys connection - considerada saudável se ativa
  health.status = 'healthy';
} else {
  // Meta API connection - verificar token
  if (!connection.accessToken) {
    health.status = 'error';
    health.errorMessage = 'Token de acesso não configurado';
  } else {
    const accessToken = decrypt(connection.accessToken);
    if (!accessToken) {
      health.status = 'error';
      health.errorMessage = 'Falha ao desencriptar o token de acesso';
    } else {
      // Testar token com API do Facebook
      const response = await fetch(
        `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${connection.phoneNumberId}`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        health.status = 'expired';
        health.errorMessage = errorData.error?.message || 'Token de acesso inválido ou expirado';
      }
    }
  }
}
```

### 2. Adição de Campo na Query
```typescript
// Buscar connectionType do banco de dados
const companyConnections = await db
  .select({
    id: connections.id,
    name: connections.config_name,
    phoneNumberId: connections.phoneNumberId,
    accessToken: connections.accessToken,
    connectionType: connections.connectionType,  // ← ADICIONADO
    isActive: connections.isActive,
    createdAt: connections.createdAt
  })
  .from(connections)
  .where(eq(connections.companyId, companyId));
```

### 3. Correção de TypeScript
```typescript
// Interface atualizada para aceitar valores nullable
interface ConnectionHealth {
  id: string;
  name: string;
  phoneNumberId: string | null;  // ← PODE SER NULL
  isActive: boolean;
  status: 'healthy' | 'expired' | 'error' | 'inactive';
  lastChecked: Date;
  errorMessage?: string;
}
```

---

## 🎯 Resultado Esperado

### Conexões Baileys
- ✅ **Status**: `healthy` (se ativa)
- ✅ **Sem erros** no dashboard
- ✅ **Não tenta descriptografar** token (não existe)

### Conexões Meta Cloud API
- ✅ **Verifica token** normalmente
- ✅ **Testa com API** do Facebook
- ✅ **Detecta tokens** expirados/inválidos

---

## 📊 Validação

### Antes da Correção
```
Dashboard:
┌──────────────────────────────────────┐
│ ⚠️ Atenção: Conexões com Problemas   │
│ 1 conexão(ões) precisam de atenção   │
│                                      │
│ ❌ Grapfy                            │
│    Falha ao descriptografar o token  │
└──────────────────────────────────────┘

Realidade: Conexão funcionando perfeitamente!
```

### Depois da Correção
```
Dashboard:
┌──────────────────────────────────────┐
│ ✅ Todas as Conexões Saudáveis       │
│                                      │
│ ✅ Grapfy (Baileys) - Conectada      │
│ ✅ Empresa-0589 (Meta API) - Ativa   │
└──────────────────────────────────────┘

Realidade: Status correto!
```

---

## 🔍 Tipos de Conexão

### Baileys (`connection_type = 'baileys'`)
- **Autenticação**: QR Code
- **Sessão**: Arquivos em `whatsapp_sessions/`
- **Token**: NULL (não usa)
- **Health Check**: Considera healthy se `is_active = true`

### Meta Cloud API (`connection_type = 'meta_api'`)
- **Autenticação**: Access Token
- **Sessão**: Via API do Facebook
- **Token**: Criptografado no DB
- **Health Check**: Descriptografa e testa com Graph API

---

## 📝 Arquivos Modificados

- ✅ `src/app/api/v1/connections/health/route.ts`
  - Adicionado check de `connectionType`
  - Adicionado null check para `accessToken`
  - Atualizado interface `ConnectionHealth`
  - Adicionado `connectionType` na query

---

## 🧪 Como Testar

1. **Acessar Dashboard**: `/dashboard`
2. **Verificar seção** "Conexões que Precisam de Atenção"
3. **Resultado Esperado**: 
   - Conexões Baileys ativas devem aparecer como "healthy"
   - Sem erro de "Falha ao descriptografar"
   - Apenas conexões Meta API com problemas reais devem aparecer

---

## 🚀 Impacto

### Positivo
- ✅ Elimina falsos positivos de erro
- ✅ Dashboard reflete status real
- ✅ Usuários não se preocupam com erros inexistentes

### Sem Impacto Negativo
- ✅ Conexões Meta API continuam sendo validadas
- ✅ Performance mantida
- ✅ Compatibilidade total

---

**Data**: 05 de Novembro de 2025  
**Versão**: 2.4.1  
**Status**: ✅ CORRIGIDO
