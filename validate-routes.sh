#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIyMDdjM2Q5My0yZDVlLTRhYTgtYjY3Yi0yNTIzMWY3MTUwNWEiLCJjb21wYW55SWQiOiIxN2Y5ZjE3Yy1lZmVlLTQwMzMtYWNhNy1iMzFiYzRlMzc5M2IiLCJlbWFpbCI6ImplZmVyc29uQG1hc3Rlcmlhb2ZpY2lhbC5jb20uYnIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTg3NTUyNTksImV4cCI6MTc1ODg0MTY1OX0.Kexy02Yyc8tCoD9x23kDIxT80F1c8inb0VpP-LM-28A"

echo "==================================================="
echo "🧪 VALIDAÇÃO COMPLETA DO SISTEMA ZAPMASTER"
echo "==================================================="
echo ""

echo "✅ 1. TESTANDO WEBHOOK LOCALMENTE"
echo "---------------------------------"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/webhooks/meta/f046c0b7-ff2c-4ec2-9b9e-7f3fb70e02b7?hub.mode=subscribe&hub.verify_token=zapmaster_verify_2024&hub.challenge=test123" | xargs echo "Webhook verification GET:"
echo ""

echo "✅ 2. TESTANDO AUTENTICAÇÃO"
echo "----------------------------"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/v1/auth/session" -H "Cookie: __session=$TOKEN" | xargs echo "Auth session check:"
echo ""

echo "✅ 3. TESTANDO ROTAS PRINCIPAIS"
echo "--------------------------------"

# Dashboard stats
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/v1/dashboard/stats" -H "Cookie: __session=$TOKEN" | xargs echo "Dashboard stats:"

# Conversations
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/v1/conversations" -H "Cookie: __session=$TOKEN" | xargs echo "Conversations list:"

# Contacts
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/v1/contacts" -H "Cookie: __session=$TOKEN" | xargs echo "Contacts list:"

# Campaigns
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/v1/campaigns" -H "Cookie: __session=$TOKEN" | xargs echo "Campaigns list:"

# Templates
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/v1/templates" -H "Cookie: __session=$TOKEN" | xargs echo "Templates list:"

# Connections
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/v1/connections" -H "Cookie: __session=$TOKEN" | xargs echo "Connections list:"

# IA Personas
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/v1/ia/personas" -H "Cookie: __session=$TOKEN" | xargs echo "IA Personas list:"

# Automations
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/v1/automations" -H "Cookie: __session=$TOKEN" | xargs echo "Automations list:"

# Tags
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/v1/tags" -H "Cookie: __session=$TOKEN" | xargs echo "Tags list:"

# Lists
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/v1/lists" -H "Cookie: __session=$TOKEN" | xargs echo "Lists:"

echo ""
echo "✅ 4. TESTANDO WEBHOOKS DE INTEGRAÇÃO"
echo "--------------------------------------"

# Webhook para recepção de mensagens (POST test)
WEBHOOK_DATA='{"object":"whatsapp_business_account","entry":[{"id":"test","changes":[{"field":"messages","value":{"messaging_product":"whatsapp","metadata":{"display_phone_number":"5511999999999","phone_number_id":"test"},"statuses":[{"id":"wamid.test","status":"sent","timestamp":"1234567890"}]}}]}]}'

echo "$WEBHOOK_DATA" | curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:5000/api/webhooks/meta/f046c0b7-ff2c-4ec2-9b9e-7f3fb70e02b7" \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=test" \
  -d @- | xargs echo "Webhook POST (message receipt):"

echo ""
echo "✅ 5. TESTANDO HEALTH CHECKS"
echo "-----------------------------"

# Connections health
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/v1/connections/health" -H "Cookie: __session=$TOKEN" | xargs echo "Connections health:"

# AI agents health
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/v1/agents/health" -H "Cookie: __session=$TOKEN" | xargs echo "AI agents health:"

echo ""
echo "==================================================="
echo "📊 RESUMO DA VALIDAÇÃO"
echo "==================================================="
echo ""
echo "Códigos HTTP:"
echo "  200 = ✅ Sucesso"
echo "  201 = ✅ Criado com sucesso"
echo "  307 = ⚠️  Redirecionamento temporário"
echo "  401 = ❌ Não autorizado"
echo "  403 = ❌ Proibido"
echo "  404 = ❌ Não encontrado"
echo "  500 = ❌ Erro do servidor"
echo ""
echo "==================================================="