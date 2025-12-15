# 📋 PLANO ESTRUTURADO: Templates em Automações por Webhook

## 🎯 Objetivo
**Exibir templates do provedor selecionado (APICloud/Baileys) no passo 3 (Ações), baseado na conexão escolhida no passo 1 (Gatilhos e Escopo)**

Exemplo: 
- Usuário seleciona "Webhook: Compra Aprovada" + Conexão "5865_Antonio_Rossit_BM" (Meta)
- No passo 3, templates da Meta devem aparecer automaticamente

---

## 📊 INVESTIGAÇÃO INICIAL

### Problema Identificado
- ✗ Passo 3: Campo de templates NÃO aparece atualmente
- ✗ Conexão selecionada no passo 3 não compartilha estado com passo 1
- ✗ Templates não são carregados baseado na connectionId

### Arquivos Envolvidos
| Arquivo | Função |
|---------|--------|
| `src/components/automations/automation-rule-form.tsx` | Formulário principal |
| `src/lib/types.ts` | Tipos de dados (Connection, AutomationAction) |
| `src/lib/db/schema.ts` | Schema de templates no BD |
| `src/app/api/connections/[id]/templates/route.ts` | API de templates |

---

## 🔄 FASES DE EXECUÇÃO (8 ETAPAS)

### ✅ FASE 1: INVESTIGAÇÃO DO ESTADO ATUAL
**Objetivo**: Entender fluxo atual de templates

**Ações**:
- [ ] Revisar schema do BD para templates (`db/schema.ts`)
- [ ] Verificar se existe API para carregar templates por connectionId
- [ ] Identificar estrutura de dados de AutomationAction
- [ ] Mapear onde connectionId é armazenado

**Evidências**:
- Screenshot do formulário atual
- Output de queries ao BD

---

### ✅ FASE 2: DESIGN DO FLUXO NOVO
**Objetivo**: Projetar como templates aparecerão

**Design**:
```
Passo 1: Gatilho e Escopo
├─ Selecionar Webhook: "Compra Aprovada"
├─ Aplicar Conexões: Selecionar conexão (ex: "5865_Antonio_Rossit_BM")
└─ → Estado salvo: { triggerEvent, selectedConnectionIds }

Passo 3: Ações
├─ Tipo de Ação: "📱 Enviar via APICloud (Meta)" 
├─ Conexão: [Dropdown com conexões filtradas]
├─ ⭐ Templates: [Dropdown com templates da conexão selecionada]
│  └─ Carregado via API: /api/templates?connectionId=xxx
└─ Mensagem: [Textarea com sugestões de variáveis]
```

**UI Melhorias**:
- Templates como dropdown (não textbox)
- Sugestões de variáveis ao digitar {{
- Preview de template renderizado
- Validação: template deve ter telefone do destinatário

---

### ✅ FASE 3: CRIAR/ATUALIZAR API DE TEMPLATES
**Objetivo**: Endpoint que retorna templates por connectionId

**Implementação**:
```typescript
// GET /api/templates?connectionId=xxx&companyId=yyy
// Retorna: { templates: [...], provider: 'meta'|'baileys' }

// Lógica:
if (provider === 'meta') {
  // Buscar templates via facebookApiService.getTemplates()
}
if (provider === 'baileys') {
  // Retornar lista vazia (ou templates salvos localmente)
}
```

**Arquivos**:
- `src/app/api/templates/by-connection/route.ts` (NOVO)

---

### ✅ FASE 4: MODIFICAR FORMULÁRIO (PARTE 1: STATE)
**Objetivo**: Estruturar estado para rastrear connectionId selecionada

**Modificações em `automation-rule-form.tsx`**:

```typescript
// NOVO: State para conexão selecionada no passo 1
const [selectedTriggerConnection, setSelectedTriggerConnection] = useState<string>('');

// NOVO: State para templates carregados
const [availableTemplates, setAvailableTemplates] = useState<Template[]>([]);
const [loadingTemplates, setLoadingTemplates] = useState(false);

// NOVO: Effect para carregar templates quando connectionId mudar
useEffect(() => {
  if (selectedTriggerConnection) {
    loadTemplatesForConnection(selectedTriggerConnection);
  }
}, [selectedTriggerConnection]);

// NOVO: Função para carregar templates
const loadTemplatesForConnection = async (connectionId: string) => {
  setLoadingTemplates(true);
  try {
    const res = await fetch(`/api/templates/by-connection?connectionId=${connectionId}`);
    const data = await res.json();
    setAvailableTemplates(data.templates || []);
  } catch (error) {
    console.error('Erro ao carregar templates:', error);
  } finally {
    setLoadingTemplates(false);
  }
};
```

---

### ✅ FASE 5: MODIFICAR FORMULÁRIO (PARTE 2: UI - PASSO 1)
**Objetivo**: Capturar conexão selecionada no passo 1

**Modificação**:
```typescript
// No renderizador de "Aplicar Conexões"
const handleConnectionChange = (connectionIds: string[]) => {
  setSelectedConnectionIds(connectionIds);
  // NOVO: Se apenas 1 conexão, setar como conexão de template
  if (connectionIds.length === 1) {
    setSelectedTriggerConnection(connectionIds[0]);
  }
};
```

**UI**:
- Ao selecionar 1 conexão em "Aplicar Conexões" → ativa carregamento de templates
- Visual feedback: spinner durante carregamento

---

### ✅ FASE 6: MODIFICAR FORMULÁRIO (PARTE 3: UI - PASSO 3)
**Objetivo**: Exibir templates no passo 3

**Nova função renderizadora**:
```typescript
const renderActionValueInput = (
  action,
  onChange,
  tags,
  users,
  lists,
  connections,
  templates = [], // ← NOVO PARÂMETRO
  loadingTemplates = false // ← NOVO PARÂMETRO
) => {
  switch(action.type) {
    case 'send_message_apicloud':
    case 'send_message_baileys':
      return (
        <div className="space-y-3">
          {/* Conexão */}
          <div>
            <Label>Conexão</Label>
            <Select value={action.connectionId || ''} 
                    onValueChange={(val) => onChange(action.id!, 'connectionId', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conexão" />
              </SelectTrigger>
              <SelectContent>
                {/* Filtrar por tipo */}
              </SelectContent>
            </Select>
          </div>

          {/* NOVO: Templates */}
          <div>
            <Label>Template (Opcional)</Label>
            <Select value={action.templateId || ''} 
                    disabled={loadingTemplates}
                    onValueChange={(val) => onChange(action.id!, 'templateId', val)}>
              <SelectTrigger>
                <SelectValue placeholder={loadingTemplates ? "Carregando..." : "Selecione um template"} />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mensagem */}
          <div>
            <Label>Mensagem ou Variáveis</Label>
            <Textarea 
              placeholder="Digite a mensagem ou {{variable}}" 
              value={action.value || ''} 
              onChange={(e) => onChange(action.id!, 'value', e.target.value)} 
            />
          </div>
        </div>
      );
  }
};
```

---

### ✅ FASE 7: ATUALIZAR SCHEMA DB
**Objetivo**: Adicionar campo `templateId` em AutomationAction

**Modificação em `db/schema.ts`**:
```typescript
// automation_actions table
templateId: varchar('template_id').references(() => templates.id),
```

**Modificação em tipos**:
```typescript
export interface AutomationAction {
  id: string;
  type: string;
  value?: string;
  connectionId?: string;
  templateId?: string; // ← NOVO
  metadata?: Record<string, any>;
}
```

---

### ✅ FASE 8: VALIDAÇÃO RESPONSIVENESS + TESTES
**Objetivo**: Validar em mobile/tablet/desktop

**Testes**:
- [ ] Mobile: Dropdowns aparecem corretamente
- [ ] Carregamento: Spinner mostra durante carregamento
- [ ] Erro: Mensagem aparece se templates falharem
- [ ] Seleção: Template + Mensagem funcionam juntos
- [ ] Preview: Mostrar preview do template renderizado

**Evidências**:
- Screenshots mobile/tablet/desktop
- Logs de API
- Teste com webhook real

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

- [ ] **Fase 1**: Investigação concluída
- [ ] **Fase 2**: Design validado
- [ ] **Fase 3**: API criada e testada
- [ ] **Fase 4**: State preparado
- [ ] **Fase 5**: Passo 1 capturando conexão
- [ ] **Fase 6**: Passo 3 mostrando templates
- [ ] **Fase 7**: BD atualizado
- [ ] **Fase 8**: Responsiveness validado

---

## 🚀 FLUXO FINAL

```
Usuário cria regra de automação
    ↓
[Passo 1] Seleciona webhook + conexão
    → setSelectedTriggerConnection(connectionId)
    ↓
[Passo 2] Define condições (opcional)
    ↓
[Passo 3] Seleciona ação
    ↓
Effect dispara: loadTemplatesForConnection()
    ↓
API: GET /api/templates/by-connection?connectionId=xxx
    ↓
Retorna: [{ id, name, content, variables }, ...]
    ↓
Templates aparecem em dropdown
    ↓
Usuário seleciona template
    → Sugestões de variáveis aparecem
    ↓
Salva regra com { action, templateId, message }
    ↓
✅ Webhook → Automação → Template → WhatsApp
```

---

## 📊 IMPACTO

| Aspecto | Antes | Depois |
|--------|-------|--------|
| Templates | ❌ Não aparecem | ✅ Carregam por conexão |
| UX | Manual text | ✅ Dropdown + Preview |
| Suporte | Apenas texto | ✅ Templates + Variáveis |
| Mobile | N/A | ✅ Responsivo |

---

## 🔒 PROTOCOLOS E OBRIGAÇÕES

✅ Seguir padrão: Investigação → Design → Implementação → Testes  
✅ Validar responsiveness em todas as telas  
✅ LSP sem erros antes de finalizar  
✅ Documentar cada fase com evidências  
✅ Manter compatibilidade com versão anterior  

---

## 📝 REFERÊNCIAS

- **Documentação de Automações**: `docs/GUIA-AUTOMACOES-WEBHOOK.md`
- **API Services**: `src/lib/facebookApiService.ts`
- **Schema DB**: `src/lib/db/schema.ts`
- **Tipos**: `src/lib/types.ts`

---

**Status**: 🟡 AGUARDANDO APROVAÇÃO DO PLANO  
**Data**: 15/12/2025  
**Próxima Ação**: Executar fases 1-8 após OK do usuário
