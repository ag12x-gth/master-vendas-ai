# Template Real Submetido à Meta Cloud API - Documentação Completa

## ✅ Status Atual

**Data**: 06/11/2025 às 05:57 (Horário de Brasília)

### Template Criado e Submetido

**Nome**: `lembrete_consulta_masterial`  
**Meta ID**: `624920360610224`  
**WABA ID**: `399691246563833`  
**Categoria**: UTILITY  
**Idioma**: pt_BR  
**Status**: ⏳ **PENDING** (Aguardando aprovação da Meta)

---

## 📝 Processo Completo Realizado

### 1. Primeira Tentativa - Rejeitada

**Erro**: Emoji no HEADER não permitido

```json
{
  "error": {
    "message": "Invalid parameter",
    "code": 100,
    "error_subcode": 2388072,
    "error_user_title": "O formato do título está incorreto",
    "error_user_msg": "O cabeçalho da mensagem não pode ter novas linhas, caracteres de formatação, emojis ou asteriscos."
  }
}
```

**Ação**: Removido emoji ✅ do header

### 2. Segunda Tentativa - SUCESSO ✅

**Template Corrigido**:
```json
{
  "name": "lembrete_consulta_masterial",
  "language": "pt_BR",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Agendamento Confirmado"
    },
    {
      "type": "BODY",
      "text": "Olá {{1}}! Seu agendamento foi confirmado com sucesso.\n\nData: {{2}}\nHorário: {{3}}\nServiço: {{4}}\n\nAguardamos você!",
      "example": {
        "body_text": [
          [
            "João Silva",
            "15/11/2025",
            "14:30",
            "Consultoria Master IA"
          ]
        ]
      }
    },
    {
      "type": "FOOTER",
      "text": "Master IA - Automação Inteligente"
    }
  ]
}
```

**Resposta da Meta**:
```json
{
  "id": "624920360610224",
  "status": "PENDING",
  "category": "UTILITY"
}
```

---

## ⏳ Processo de Aprovação

### Tempo Estimado

**UTILITY Templates**: 
- Aprovação rápida: 5-30 minutos
- Aprovação normal: 1-4 horas
- Aprovação lenta: 4-24 horas

**MARKETING Templates**: 
- Pode levar 24-48 horas
- Requer documentação de opt-in

### Estados Possíveis

1. **PENDING**: Template em análise pela equipe da Meta
2. **APPROVED**: Template aprovado e pronto para uso ✅
3. **REJECTED**: Template rejeitado (verificar `rejected_reason`)

---

## 🔍 Como Verificar o Status

### Manualmente (Interface)

1. Acesse `/templates-v2` no sistema
2. Localize o template `lembrete_consulta_masterial`
3. Verifique a coluna "Status"

### Via Script

Execute o script de verificação:

```bash
node check-template-status.mjs
```

O script consulta a Meta API e atualiza o banco automaticamente.

### Via API Direta

```bash
curl -X GET "https://graph.facebook.com/v21.0/624920360610224" \
  -H "Authorization: Bearer {ACCESS_TOKEN}"
```

---

## 🚀 Quando Aprovado: Próximos Passos

### 1. Verificar Aprovação

Execute:
```bash
node check-template-status.mjs
```

Quando aprovar, verá:
```
🎉 TEMPLATE APROVADO PELA META!
   Você já pode usar este template em campanhas.
```

### 2. Testar Envio Real

Criar campanha via interface:

1. Acesse **Campanhas** → **Nova Campanha WhatsApp**
2. Selecione conexão: `roseli-5865-2`
3. Selecione template: `lembrete_consulta_masterial`
4. Mapeie as variáveis:
   - {{1}}: Nome do cliente
   - {{2}}: Data do agendamento
   - {{3}}: Horário
   - {{4}}: Tipo de serviço
5. Selecione lista de contatos teste
6. Dispare!

### 3. Verificar Entrega

1. Aguarde alguns segundos
2. Verifique WhatsApp do contato
3. Confirme recebimento da mensagem
4. Verifique `whatsapp_delivery_reports` no banco

---

## 📊 Dados do Banco de Dados

### Template na Tabela `message_templates`

```sql
SELECT id, name, meta_template_id, status, category, submitted_at, approved_at
FROM message_templates
WHERE name = 'lembrete_consulta_masterial';
```

**Resultado Esperado**:
- ID: `654dc056-c71e-4eba-9d8f-701fe7de27f2`
- Meta Template ID: `624920360610224`
- Status: `PENDING` → `APPROVED` (quando aprovar)
- Category: `UTILITY`
- Submitted At: `2025-11-06 05:55:XX`
- Approved At: `NULL` → timestamp (quando aprovar)

### Template na Tabela `templates` (Legacy)

O template também foi inserido na tabela antiga `templates` para compatibilidade com o sistema de campanhas existente.

---

## 🎓 Lições Aprendidas

### ✅ O Que Funcionou

1. **Template UTILITY** tem alta taxa de aprovação
2. **Conteúdo transacional claro** (confirmação de agendamento)
3. **Variáveis bem definidas** com exemplos válidos
4. **Footer com identificação** da empresa
5. **Sem emojis no HEADER** (regra crítica da Meta)

### ❌ O Que Não Funciona

1. **Emojis no HEADER** → Rejeitado imediatamente
2. **Conteúdo promocional em UTILITY** → Mudar para MARKETING
3. **Variáveis sem exemplos** → Rejeição provável
4. **Gramática ruim** → Rejeição provável
5. **URLs sem domínio verificado** → Problemas

---

## 🔧 Scripts Criados

### 1. `create-real-template.mjs`

Cria e submete template à Meta Cloud API.

**Uso**:
```bash
node create-real-template.mjs
```

### 2. `check-template-status.mjs`

Verifica status do template na Meta e atualiza banco.

**Uso**:
```bash
node check-template-status.mjs
```

### 3. `wait-for-approval.mjs`

Loop automático que verifica a cada 30s por até 10 minutos.

**Uso**:
```bash
node wait-for-approval.mjs
```

---

## 📞 Informações Técnicas

### Conexão Utilizada

- **Nome**: roseli-5865-2
- **ID**: `194c93a8-ba37-4342-91a6-6faf84fb4a7a`
- **WABA ID**: `399691246563833`
- **Phone Number ID**: `391262387407327`
- **Tipo**: Meta Cloud API v21.0

### Endpoints Utilizados

**Criar Template**:
```
POST https://graph.facebook.com/v21.0/{waba_id}/message_templates
```

**Verificar Status**:
```
GET https://graph.facebook.com/v21.0/{template_id}
```

**Enviar Mensagem** (quando aprovado):
```
POST https://graph.facebook.com/v21.0/{phone_number_id}/messages
```

---

## ✅ Conclusão

O processo de submissão de template REAL à Meta Cloud API foi **100% bem-sucedido**:

1. ✅ Template criado com boas práticas
2. ✅ Primeiro erro identificado e corrigido
3. ✅ Template submetido com sucesso
4. ✅ Resposta positiva da Meta (PENDING)
5. ⏳ Aguardando aprovação (processo normal)

**Próximo Marco**: Aguardar aprovação da Meta e realizar teste de envio real de mensagem usando o template aprovado.

---

## 📝 Comandos Úteis

### Verificar Status Rapidamente

```bash
node check-template-status.mjs
```

### Listar Todos Templates

```sql
SELECT name, status, category, meta_template_id, submitted_at
FROM message_templates
WHERE company_id = '682b91ea-15ee-42da-8855-70309b237008'
ORDER BY created_at DESC;
```

### Verificar Campanhas com Este Template

```sql
SELECT c.id, c.name, c.status, COUNT(wdr.id) as total_sent
FROM campaigns c
LEFT JOIN whatsapp_delivery_reports wdr ON wdr.campaign_id = c.id
WHERE c.template_id = '654dc056-c71e-4eba-9d8f-701fe7de27f2'
GROUP BY c.id, c.name, c.status;
```

---

**Última atualização**: 06/11/2025 às 05:58  
**Status**: Template PENDING - Aguardando aprovação da Meta  
**Tempo decorrido**: ~3 minutos desde submissão
