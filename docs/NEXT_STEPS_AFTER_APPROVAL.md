# Próximos Passos Após Aprovação do Template

## Status Atual

**Template**: `lembrete_consulta_masterial`  
**Meta ID**: `624920360610224`  
**Status**: ⏳ PENDING (aguardando aprovação da Meta)  
**Submetido em**: 06/11/2025 às 05:56

---

## Como Verificar se Foi Aprovado

### Opção 1: Interface Web

1. Acesse: `http://localhost:5000/templates-v2`
2. Localize o template: **lembrete_consulta_masterial**
3. Verifique a coluna "Status"
   - ⏳ **PENDING**: Ainda em análise
   - ✅ **APPROVED**: Aprovado e pronto para usar
   - ❌ **REJECTED**: Rejeitado (ver motivo)

### Opção 2: Console do Navegador

```javascript
// Abra o DevTools (F12) na página /templates-v2 e execute:
fetch('/api/v1/message-templates')
  .then(r => r.json())
  .then(data => {
    const template = data.templates.find(t => t.name === 'lembrete_consulta_masterial');
    console.log('Status:', template?.status);
  });
```

### Opção 3: Verificar Diretamente na Meta API

```bash
# Acesse a Meta Business Manager
https://business.facebook.com/wa/manage/message-templates/

# Ou consulte via cURL (precisa do access token):
curl -X GET "https://graph.facebook.com/v21.0/624920360610224" \
  -H "Authorization: Bearer {ACCESS_TOKEN}"
```

---

## Quando o Template for APROVADO

### Teste Automático de Envio Real

Criei um plano de teste completo para validar o envio de mensagens reais:

#### 1. Preparar Dados de Teste

**Contatos disponíveis**:
- Marco: +5512996616441
- Walison: +553891620033
- Diego: +5513996889590
- José: +5528999898714
- LEAD SOROCABA 4: +5515981731112

**Variáveis do template**:
- `{{1}}`: Nome do cliente
- `{{2}}`: Data do agendamento
- `{{3}}`: Horário
- `{{4}}`: Tipo de serviço

#### 2. Criar Campanha de Teste (Interface)

**Passo a passo**:

1. **Acesse**: `http://localhost:5000/campaigns/new`

2. **Configure a campanha**:
   - Nome: "Teste Template Aprovado"
   - Tipo: WhatsApp
   - Conexão: **roseli-5865-2**
   - Template: **lembrete_consulta_masterial**

3. **Mapeie as variáveis**:
   ```
   {{1}} → Nome do contato (usar campo "name" da lista)
   {{2}} → 15/11/2025
   {{3}} → 14:30
   {{4}} → Consultoria Master IA
   ```

4. **Selecione contatos**:
   - Adicionar: Marco, Diego (2 contatos para teste inicial)
   - Ou criar lista de teste com esses contatos

5. **Agendar**:
   - Envio imediato
   - Ou agendar para horário específico

6. **Disparar campanha**

#### 3. Validar Envio

**O que verificar**:

✅ **No Sistema**:
- Dashboard mostra campanha "Em andamento"
- Contador de mensagens enviadas aumenta
- Status muda para "Concluída"

✅ **No Banco de Dados**:
```sql
-- Verificar delivery reports
SELECT 
  wdr.phone_number,
  wdr.status,
  wdr.message_id,
  wdr.sent_at,
  wdr.delivered_at,
  wdr.error_message
FROM whatsapp_delivery_reports wdr
WHERE wdr.template_name = 'lembrete_consulta_masterial'
ORDER BY wdr.sent_at DESC;
```

✅ **No WhatsApp dos Contatos**:
- Abrir WhatsApp do Marco/Diego
- Confirmar recebimento da mensagem
- Verificar formatação correta
- Validar que variáveis foram substituídas:
  - Nome aparece corretamente
  - Data: 15/11/2025
  - Horário: 14:30
  - Serviço: Consultoria Master IA

✅ **Formato Esperado da Mensagem**:
```
━━━━━━━━━━━━━━━━━━━
Agendamento Confirmado
━━━━━━━━━━━━━━━━━━━

Olá Marco! Seu agendamento foi confirmado com sucesso.

Data: 15/11/2025
Horário: 14:30
Serviço: Consultoria Master IA

Aguardamos você!

━━━━━━━━━━━━━━━━━━━
Master IA - Automação Inteligente
```

#### 4. Validar Métricas

**Delivery Reports**:
- Status: `sent` → `delivered` → `read` (opcional)
- Message ID da Meta preenchido
- Timestamp de envio e entrega
- Sem erros (`error_message` vazio)

**Logs do Sistema**:
```bash
# Verificar logs do workflow
grep -i "lembrete_consulta_masterial" /tmp/logs/Frontend_*.log
```

---

## Se o Template for REJEITADO

### Ações Necessárias

1. **Verificar motivo da rejeição**:
   ```sql
   SELECT rejected_reason 
   FROM message_templates 
   WHERE meta_template_id = '624920360610224';
   ```

2. **Analisar problema**:
   - Violação de política da Meta
   - Conteúdo promocional em categoria UTILITY
   - Gramática/ortografia ruim
   - Conteúdo sensível/proibido

3. **Corrigir e resubmeter**:
   - Ajustar conteúdo conforme feedback
   - Mudar categoria se necessário (UTILITY → MARKETING)
   - Resubmeter template corrigido

---

## Script Automatizado de Teste (Quando Aprovar)

```javascript
// docs/test-approved-template.mjs
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testApprovedTemplate() {
  try {
    console.log('🧪 Iniciando teste automatizado...\n');
    
    // 1. Verificar se template está aprovado
    const template = await pool.query(
      "SELECT status FROM message_templates WHERE name = 'lembrete_consulta_masterial'"
    );
    
    if (template.rows[0]?.status !== 'APPROVED') {
      console.log('❌ Template ainda não está aprovado');
      return;
    }
    
    console.log('✅ Template aprovado! Criando campanha de teste...\n');
    
    // 2. Criar campanha de teste
    const campaignId = crypto.randomUUID();
    await pool.query(`
      INSERT INTO campaigns (
        id, company_id, connection_id, name, type, 
        template_id, status, scheduled_at
      ) VALUES (
        $1, '682b91ea-15ee-42da-8855-70309b237008',
        '194c93a8-ba37-4342-91a6-6faf84fb4a7a',
        'Teste Template Aprovado', 'whatsapp',
        (SELECT id FROM message_templates WHERE name = 'lembrete_consulta_masterial'),
        'scheduled', NOW()
      )
    `, [campaignId]);
    
    console.log('✅ Campanha criada:', campaignId);
    console.log('\n📱 Acesse o dashboard para disparar a campanha!');
    
  } finally {
    await pool.end();
  }
}

await testApprovedTemplate();
```

---

## Checklist Completo

### Antes do Envio
- [ ] Template com status APPROVED
- [ ] Conexão roseli-5865-2 ativa
- [ ] Contatos de teste válidos
- [ ] Variáveis mapeadas corretamente

### Durante o Envio
- [ ] Dashboard mostra progresso
- [ ] Logs sem erros
- [ ] Queue processando mensagens

### Após o Envio
- [ ] Mensagens entregues no WhatsApp
- [ ] Delivery reports preenchidos
- [ ] Formatação correta
- [ ] Variáveis substituídas
- [ ] Sem erros no banco

---

## Tempo Estimado para Aprovação

**UTILITY Templates (categoria atual)**:
- ⚡ Rápido: 5-30 minutos
- 🕐 Normal: 1-4 horas
- 🐌 Lento: 4-24 horas

**Taxa de Aprovação Estimada**: ~85% para conteúdo transacional bem escrito

**Horários de Maior Aprovação**:
- Dias úteis: mais rápido
- Fins de semana: pode demorar mais

---

## Contato de Suporte

Se o template não for aprovado em 24h ou for rejeitado sem motivo claro:

1. **Meta Business Support**: https://business.facebook.com/business/help
2. **WhatsApp API Docs**: https://developers.facebook.com/docs/whatsapp/message-templates
3. **Status da API**: https://developers.facebook.com/status/

---

**Última atualização**: 06/11/2025 às 06:05  
**Próxima ação**: Aguardar aprovação da Meta (verificar periodicamente)
