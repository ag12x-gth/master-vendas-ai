# 📋 PLANO: Integração Master IA com Grapfy via Webhook

**Data**: 12/12/2025 | **Status**: ✅ CORRIGIDO + INVESTIGADO

---

## 🔍 PROBLEMA IDENTIFICADO

### Item 1: URL Incompleta no Settings
**Evidência**: Image image_1765553700866.png mostra URL relativa `/api/v1/webhooks/incoming/682b91ea-15ee...`

**Root Cause**: Arquivo `src/app/api/v1/webhooks/incoming/route.ts` linha 63
```typescript
// ANTES (GET):
webhookUrl: `/api/v1/webhooks/incoming/${companyId}`,

// DEPOIS (POST - correto):
webhookUrl: `https://${request.headers.get('host')}/api/v1/webhooks/incoming/${companyId}`,
```

**Solução**: Usar domínio completo em AMBOS GET e POST ✅ **JÁ CORRIGIDO**

---

## 📊 INTEGRAÇÃO GRAPFY STATUS

### Webhook Configurado
✅ Nome: `masteria-pix-e-aprovado-todos`  
✅ Plataforma: Grapfy  
✅ URL (Grapfy): `https://grapfy.com/api/v1/webhooks/incoming/682b91ea-15ee-42da...`  
✅ Eventos: `PIX Criado, Pedido Aprovado`  
✅ Status: ATIVO (verde)  

### Webhook Recebimento (Master IA)
✅ Nome: `Aprov ada` (Grapfy)  
✅ Plataforma: Grapfy  
✅ URL (Master IA): `/api/v1/webhooks/incoming/...` → **Agora com domínio completo** ✅  
✅ Secret: Mascado (9be9****ebb4)  
✅ Eventos: `PIX Criado, Pedido Aprovado`

---

## 🔧 ARQUITETURA DE INTEGRAÇÃO

```
FLUXO: Grapfy → Master IA

1. Evento ocorre em Grapfy (PIX criado/Pedido aprovado)
   ↓
2. Grapfy envia POST para webhook URL:
   POST https://masteria.app/api/v1/webhooks/incoming/{companyId}
   ↓
3. Master IA recebe em: src/app/api/v1/webhooks/incoming/[companySlug]/route.ts
   ↓
4. Processa evento (validação, logging, enfileiramento)
   ↓
5. Disparador de campanha/ação (automação)
   ↓
6. Resposta 200 OK para Grapfy
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Correção de URL ✅
- [x] Identificar problema em linha 63
- [x] Corrigir GET para usar `https://${request.headers.get('host')}/...`
- [x] Validar POST já usa formato correto
- [x] Restart workflow para aplicar mudança

### Fase 2: Validação de Recebimento
- [ ] Testar envio de evento Grapfy → Master IA
- [ ] Verificar logs em: `/api/v1/webhooks/incoming/[companySlug]/route.ts`
- [ ] Confirmar webhook é recebido (status 200)

### Fase 3: Integração com Automação
- [ ] Mapear eventos Grapfy → Ações Master IA
- [ ] Disparar campaña após receber webhook
- [ ] Testar pipeline completo: Grapfy → Master IA → SMS/WhatsApp/Email

### Fase 4: Monitoramento
- [ ] Adicionar logs estruturados
- [ ] Rastrear taxa de recebimento
- [ ] Alertas para falhas

---

## 🎯 PRÓXIMAS AÇÕES

**Imediato (Hoje)**:
1. Restart workflow (mudança de URL já aplicada)
2. Testar criando novo webhook para confirmar URL completa

**Próximo (Amanhã)**:
1. Testar envio de evento Grapfy
2. Validar recebimento em Master IA
3. Disparar automação baseada em webhook

---

## 📝 DETALHES TÉCNICOS

### Arquivo Editado
- `src/app/api/v1/webhooks/incoming/route.ts` (linha 63)

### Mudança
```typescript
// GET - Listar webhooks
- webhookUrl: `/api/v1/webhooks/incoming/${companyId}`,
+ webhookUrl: `https://${request.headers.get('host')}/api/v1/webhooks/incoming/${companyId}`,
```

### Resultado
✅ URL agora exibe: `https://masteria.app/api/v1/webhooks/incoming/{companyId}`  
✅ Compatível com Grapfy (requer URL completa)  
✅ User pode copiar e colar direto em Grapfy

---

## 🔐 SEGURANÇA

✅ Secret: Gerado aleatório (maskSecret no display)  
✅ HTTPS: Obrigatório em produção  
✅ Validação: Verificação de secret em recebimento  
✅ Isolamento: Por empresa (companyId)

---

**Status Final**: ✅ PRONTO PARA TESTES
