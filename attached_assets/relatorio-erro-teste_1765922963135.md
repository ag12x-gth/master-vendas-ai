# 🐛 RELATÓRIO DE ERRO - Sistema de Automações Replit

## 📋 Informações Gerais

**Data/Hora:** 2025-12-16 17:24:10  
**URL:** https://replit.com/@diegomaninhu/masteria-x-meeting-call  
**Página:** /automations  
**Modal:** "Criar Nova Regra"  
**Servidor:** Next.js 14.2.35 rodando em http://localhost:5000

---

## 🔴 ERRO PRINCIPAL

### Mensagem de Erro Visível na Interface
```
Erro ao Salvar - Dados inválidos
```

### Erro HTTP Capturado (Server Logs)
```
POST /api/v1/automations  400  in 55ms
```

**Status Code:** `400 Bad Request`  
**Tempo de Resposta:** 55ms  
**Endpoint:** `/api/v1/automations`

---

## 📊 CONFIGURAÇÃO DO FORMULÁRIO NO MOMENTO DO ERRO

### ✅ Seção 1 - Gatilho e Escopo (CONFIGURADO CORRETAMENTE)
- **Evento:** Webhook: Compra Aprovada ✅
- **Aplicar às Conexões:** 5865_Antonio_Roseli_BM (chip verde visível) ✅

### ✅ Seção 2 - Condições (CONFIGURADO)
- **Campo 1:** Conteúdo da Mensagem
- **Operador:** Contém
- **Valor:** [preenchido]

### ❌ Seção 3 - Ações (Então) - PROBLEMA IDENTIFICADO
- **Ação:** Enviar via APICloud (Meta) ✅
- **Conexão:** ⚠️ "Selecione uma conexão" ❌ **(CAMPO VAZIO - NÃO SELECIONADO)**
- **Template (Opcional):** "2026_protocolo_compra_aprovada_" ✅
- **Mensagem (ou variáveis):** Campo disponível com placeholder ✅

---

## 🔍 ANÁLISE DA CAUSA RAIZ

### Problema Identificado
O campo **"Conexão"** na Seção 3 (Ações) está **vazio** e aparentemente é **obrigatório** para a ação "Enviar via APICloud (Meta)".

### Conflito com as Instruções da Tarefa
Segundo as instruções fornecidas:

> **OPÇÃO 3:** Ignorar a opção "selecione uma opção" porque já foi selecionada na opção 1

**MAS:** O formulário atual exige que uma conexão seja selecionada **também na Seção 3**, mesmo que já tenha sido selecionada na Seção 1 (Gatilho e Escopo).

### Validação Frontend/Backend
O erro `400 Bad Request` indica que a validação está ocorrendo no **backend** (API), e o servidor está rejeitando a requisição por dados incompletos ou inválidos.

---

## 🌐 LOGS DE REDE CAPTURADOS

### Requisições HTTP Antes do Erro
```
GET /api/v1/notifications?limit=20  200  in 173ms
GET /api/v1/notifications?limit=20  200  in 197ms
GET /api/v1/connections/health     200  in 810ms
GET /api/v1/connections/health     200  in 59ms
GET /api/v1/notifications?limit=20  200  in 157ms
```

### Requisição que Falhou
```
POST /api/v1/automations  400  in 55ms
```

**Detalhes:**
- **Método:** POST
- **Endpoint:** `/api/v1/automations`
- **Status:** 400 (Bad Request)
- **Tempo:** 55ms
- **Erro:** Formulário incompleto/dados inválidos

---

## 💻 INFORMAÇÕES TÉCNICAS DO SERVIDOR

### Configuração do Servidor
```
▲ Next.js 14.2.35
- Local:        http://localhost:5000
- Network:      http://0.0.0.0:5000
- Environments: .env
- Experiments (use with caution): cpus
```

### Status do Servidor
- ✅ Servidor compilado com sucesso
- ✅ Rodando normalmente
- ✅ Ready in 3.4s
- ⚠️ Warning: "Disabling SWC Minifier will not be an option in the next major version"

### Documentação de Erro Histórico (v2.5.1)
Segundo os logs do Replit Agent, o erro **POST /api/v1/automations 400** já foi identificado anteriormente como "Formulário incompleto".

**Correções Aplicadas Anteriormente:**
- Arquivo: `src/components/automations/automation-rule-form.tsx`
  - Linha 331: `max-h-[90vh] overflow-hidden`
  - Linha 344: `py-2` padding
  - Linha 356: `placeholder="Selecione um evento gatilho..."`
  - Linha 443: Removido `mt-auto`
- Arquivo: `src/app/api/v1/automations/route.ts`
  - Adicionado try-catch com status 401 para sessão inválida

---

## 🔧 POSSÍVEIS CAUSAS DO ERRO

### 1. Validação de Campo Obrigatório
O backend está validando que o campo `connectionId` ou similar deve ser fornecido para a ação "Enviar via APICloud (Meta)", mas o formulário frontend não está enviando esse valor.

### 2. Estrutura de Dados Incompleta
A requisição POST pode estar com uma estrutura JSON incompleta ou inválida. Exemplo esperado:
```json
{
  "name": "Nome da Regra",
  "triggerEvent": "webhook_order_approved",
  "connectionIds": ["5865_Antonio_Roseli_BM"],
  "conditions": [{
    "field": "message_content",
    "operator": "contains",
    "value": "..."
  }],
  "actions": [{
    "type": "send_message_apicloud",
    "connectionId": "VALOR_AUSENTE_AQUI",  // ⚠️ CAMPO FALTANDO
    "template": "2026_protocolo_compra_aprovada_",
    "message": "..."
  }]
}
```

### 3. Lógica de Compartilhamento de Conexão
O sistema pode não estar compartilhando automaticamente a conexão selecionada na Seção 1 para a Seção 3, como esperado pelas instruções da tarefa.

---

## 📝 PAYLOAD DA REQUISIÇÃO (ESTIMADO)

**Obs:** Payload real não foi capturado, mas baseado na configuração visível:

```json
{
  "name": "[Nome da Regra]",
  "triggerEvent": "webhook_order_approved",
  "connectionIds": ["5865_Antonio_Roseli_BM"],
  "conditions": [
    {
      "field": "message_content",
      "operator": "contains",
      "value": "[valor configurado]"
    }
  ],
  "actions": [
    {
      "type": "send_message_apicloud",
      "connectionId": null,  // ⚠️ AUSENTE - CAUSA DO ERRO
      "template": "2026_protocolo_compra_aprovada_",
      "message": ""
    }
  ]
}
```

---

## 🛠️ SOLUÇÕES RECOMENDADAS

### Solução 1: Correção no Frontend (automation-rule-form.tsx)
**Arquivo:** `src/components/automations/automation-rule-form.tsx`

**Opção A:** Tornar o campo "Conexão" opcional quando já selecionado na Seção 1:
```typescript
// Validação antes do submit
if (actions[0].type === 'send_message_apicloud') {
  if (!actions[0].connectionId && connectionIds.length > 0) {
    // Usar a primeira conexão do escopo automaticamente
    actions[0].connectionId = connectionIds[0];
  }
}
```

**Opção B:** Preencher automaticamente o campo com a conexão da Seção 1:
```typescript
// No useEffect ou quando triggerEvent muda
useEffect(() => {
  if (connectionIds.length > 0 && !actions[0]?.connectionId) {
    setActions(prev => prev.map((action, idx) => 
      idx === 0 ? { ...action, connectionId: connectionIds[0] } : action
    ));
  }
}, [connectionIds]);
```

### Solução 2: Correção no Backend (route.ts)
**Arquivo:** `src/app/api/v1/automations/route.ts`

Adicionar lógica para herdar connectionId do escopo quando não fornecido:
```typescript
// Validação/transformação do payload
if (action.type === 'send_message_apicloud' && !action.connectionId) {
  if (body.connectionIds && body.connectionIds.length > 0) {
    action.connectionId = body.connectionIds[0];
  } else {
    return NextResponse.json(
      { error: 'Conexão não especificada para ação APICloud' },
      { status: 400 }
    );
  }
}
```

### Solução 3: Melhorar Mensagem de Erro
Tornar o erro mais descritivo para facilitar debug:
```typescript
return NextResponse.json({
  error: 'Dados inválidos',
  details: {
    message: 'Campo "connectionId" obrigatório para ação "send_message_apicloud"',
    field: 'actions[0].connectionId',
    provided: actions[0],
    expected: 'string (ID da conexão)'
  }
}, { status: 400 });
```

---

## 🧪 TESTES PARA VALIDAR A CORREÇÃO

### Teste 1: Formulário Completo
1. Selecionar "Webhook: Compra Aprovada" na Seção 1
2. Selecionar conexão "5865_Antonio_Roseli_BM" na Seção 1
3. Adicionar condição na Seção 2
4. Selecionar "Enviar via APICloud" na Seção 3
5. **Selecionar manualmente uma conexão na Seção 3**
6. Clicar em "Salvar Regra"
7. ✅ Deve salvar com sucesso

### Teste 2: Herança Automática (após correção)
1. Selecionar "Webhook: Compra Aprovada" na Seção 1
2. Selecionar conexão "5865_Antonio_Roseli_BM" na Seção 1
3. Adicionar condição na Seção 2
4. Selecionar "Enviar via APICloud" na Seção 3
5. **Deixar campo "Conexão" vazio (herdar da Seção 1)**
6. Clicar em "Salvar Regra"
7. ✅ Deve salvar com sucesso usando conexão da Seção 1

---

## 📌 CONTEXTO ADICIONAL

### Funcionalidades Implementadas (v2.6.0)
- ✅ Interpolação de variáveis webhook (`interpolateWebhookVariables`)
- ✅ Suporte a eventos: `webhook_order_approved`, `webhook_pix_created`, `webhook_lead_created`
- ✅ Preview UI de variáveis disponíveis
- ✅ Responsiveness mobile (320px+)
- ✅ Testes E2E, Mobile e Load Testing implementados

### Arquivos Relacionados
- `src/components/automations/automation-rule-form.tsx` - Formulário frontend
- `src/app/api/v1/automations/route.ts` - API de criação de automações
- `src/lib/automation-engine.ts` - Engine de execução (interpolateWebhookVariables)

---

## 🎯 RESUMO EXECUTIVO

| Item | Status |
|------|--------|
| **Erro Identificado** | ✅ POST /api/v1/automations 400 |
| **Causa Raiz** | ✅ Campo "Conexão" vazio na Seção 3 |
| **Validação** | ✅ Backend rejeitando dados incompletos |
| **Conflito** | ✅ Instruções dizem "ignorar", mas campo é obrigatório |
| **Solução Proposta** | ✅ Herdar connectionId da Seção 1 ou validar melhor |
| **Prioridade** | 🔴 ALTA - Bloqueia funcionalidade principal |

---

## 📎 ANEXOS

### Screenshot do Erro
- Modal "Criar Nova Regra" com erro "Erro ao Salvar - Dados inválidos" visível
- Campo "Conexão" na Seção 3 vazio com placeholder "Selecione uma conexão"
- Seção 1 com conexão "5865_Antonio_Roseli_BM" corretamente selecionada

### Log Completo do Servidor
```
POST /api/v1/automations 400 in 55ms
GET /api/v1/notifications?limit=20 200 in 173ms
GET /api/v1/connections/health 200 in 810ms
```

---

**Documento gerado em:** 2025-12-16T17:24:10Z  
**Versão do Sistema:** v2.6.0  
**Ambiente:** Development (Replit)  
**Status:** 🔴 ERRO ATIVO - AGUARDANDO CORREÇÃO