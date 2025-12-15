# 📋 Guia: Automações Baseadas em Webhooks

## Visão Geral

A partir da v2.4.5, o Master IA suporta automações disparadas por eventos de webhook de plataformas como Grapfy. Isso permite enviar mensagens WhatsApp automaticamente quando eventos como "PIX Gerado" ou "Compra Aprovada" ocorrem.

## Arquitetura

```
Webhook Event (Grapfy)
    ↓
incoming-handler.ts (processa evento)
    ↓
triggerAutomationForWebhook() (dispara automações)
    ↓
Regra de Automação (executa ações)
    ↓
sendUnifiedMessage() (escolhe provedor)
    ↓
APICloud (Meta) OU Baileys
    ↓
✅ Mensagem WhatsApp enviada
```

## Fluxo: Criar Automação para Webhook

### 1. Abrir Formulário de Regras
- Acesse: **Automações** → **Criar Nova Regra**

### 2. Configurar Gatilho
- **Gatilho**: Selecione um dos novos gatilhos webhook:
  - `🔔 Webhook: PIX Gerado` → Dispara quando PIX é criado na Grapfy
  - `🔔 Webhook: Compra Aprovada` → Dispara quando compra é aprovada
  - `🔔 Webhook: Lead Criado` → Dispara quando lead é criado
  - `🔔 Webhook: Evento Customizado` → Dispara para eventos customizados

### 3. Configurar Ações
Cada ação pode usar um dos dois provedores:

#### Opção A: APICloud (Meta) - Recomendado para empresas com WhatsApp Business
```
Tipo de Ação: 📱 Enviar via APICloud (Meta)
Conexão: [Selecione sua conexão Meta]
Mensagem: Olá {{customer.name}}, sua compra foi aprovada! Total: R$ {{order.total}}
```

#### Opção B: Baileys - Recomendado para automações em massa
```
Tipo de Ação: 📱 Enviar via Baileys
Conexão: [Selecione uma sessão Baileys ativa]
Mensagem: Compra aprovada com sucesso!
```

### 4. Salvar Regra
Clique em **Salvar Regra** para ativar a automação.

## Exemplo Prático: Notificação PIX

### Cenário
Quando um cliente gera um PIX na Grapfy, enviar mensagem WhatsApp com o código de confirmação.

### Passos
1. **Nome da Regra**: "Confirmação de PIX"
2. **Gatilho**: `🔔 Webhook: PIX Gerado`
3. **Ação**:
   - Tipo: `📱 Enviar via APICloud (Meta)`
   - Conexão: Sua conexão Meta ativa
   - Mensagem:
   ```
   Olá {{customer.name}}!
   
   Seu PIX foi gerado com sucesso.
   Código: {{pix.code}}
   Valor: R$ {{order.total}}
   Expira em: {{pix.expirationTime}}
   
   Obrigado!
   ```

## Variáveis Disponíveis

### Dados do Cliente (webhook_data.customer)
- `{{customer.name}}` - Nome do cliente
- `{{customer.email}}` - Email
- `{{customer.phoneNumber}}` - Telefone
- `{{customer.document}}` - CPF/CNPJ

### Dados do Pedido (webhook_data)
- `{{order.id}}` - ID do pedido
- `{{order.total}}` - Valor total
- `{{order.status}}` - Status do pedido

### Dados do PIX (webhook_data)
- `{{pix.code}}` - Código PIX
- `{{pix.expirationTime}}` - Tempo de expiração

### Dados do Produto (webhook_data.product)
- `{{product.name}}` - Nome do produto
- `{{product.quantity}}` - Quantidade

## Logs e Monitoramento

Todas as automações webhook são registradas com rastreamento completo:

```sql
SELECT * FROM automation_logs 
WHERE rule_id = 'seu-rule-id' 
AND level = 'INFO'
ORDER BY created_at DESC;
```

### Níveis de Log
- `INFO` - Ação executada com sucesso
- `WARN` - Aviso não-crítico
- `ERROR` - Erro na execução

## Troubleshooting

### Mensagem não foi enviada
1. Verifique se a regra está ativa
2. Confirme que a conexão escolhida está validada
3. Verifique logs em **Automações** → **Logs**

### Contato não encontrado
A automação cria o contato automaticamente se não existir. Verifique em **Contatos** se foi criado com o telefone correto.

### Erro "Conexão não encontrada"
- Recrie a conexão (APICloud ou Baileys)
- Valide as credenciais
- Teste a conexão antes de usar em automação

## Integração com Grapfy

URL do Webhook para Grapfy:
```
https://seu-dominio/api/v1/webhooks/incoming/seu-company-slug
```

Eventos suportados:
- `pix_created` → Mapeia para `webhook_pix_created`
- `order_approved` → Mapeia para `webhook_order_approved`

## APIs Internas

### triggerAutomationForWebhook()
```typescript
await triggerAutomationForWebhook(
  companyId: string,
  eventType: string,  // 'pix_created', 'order_approved', etc
  webhookData: Record<string, any>
);
```

### sendUnifiedMessage()
```typescript
const result = await sendUnifiedMessage({
  provider: 'apicloud' | 'baileys',
  connectionId: string,
  to: string,
  message: string,
});
```

## Próximas Melhorias Planejadas

- ✅ Suporte a templates com variáveis
- ⏳ Condições customizadas por webhook
- ⏳ Rate limiting por webhook
- ⏳ Retry automático com backoff
- ⏳ Dashboard de analytics por webhook

---

**Versão**: v2.4.5  
**Data**: 15/12/2025  
**Autor**: Master IA Dev Team
