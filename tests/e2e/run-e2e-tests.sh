#!/bin/bash

# ===================================
# E2E Test Runner - Voice Calls Vapi AI
# ===================================
# Descrição: Script automatizado para executar testes E2E completos
# Autor: Master IA Oficial Team
# Data: 2025-10-03
# ===================================

set -e

echo "🚀 Iniciando E2E Tests - Voice Calls Vapi AI"
echo "=============================================="

# Step 1: Verificar se o servidor está rodando
echo ""
echo "📡 [1/4] Verificando servidor Next.js..."
if ! curl -s http://localhost:5000 > /dev/null; then
    echo "❌ ERRO: Servidor não está rodando em localhost:5000"
    echo "   Execute 'npm run dev:server' antes de rodar os testes"
    exit 1
fi
echo "✅ Servidor rodando"

# Step 2: Executar seed de dados
echo ""
echo "🌱 [2/4] Executando seed de dados no banco..."
if [ -f "tests/e2e/seed-vapi-data.sql" ]; then
    psql $DATABASE_URL -f tests/e2e/seed-vapi-data.sql
    echo "✅ Seed executado com sucesso"
else
    echo "❌ ERRO: Arquivo seed-vapi-data.sql não encontrado"
    exit 1
fi

# Step 3: Criar diretório de screenshots
echo ""
echo "📸 [3/4] Preparando diretório de screenshots..."
mkdir -p /tmp/e2e-screenshots
mkdir -p tests/e2e/screenshots
echo "✅ Diretórios criados"

# Step 4: Executar testes Playwright
echo ""
echo "🧪 [4/4] Executando testes Playwright E2E..."
npx playwright test tests/e2e/voice-calls.spec.ts --reporter=list

# Resultado final
echo ""
echo "=============================================="
echo "✅ Testes E2E concluídos!"
echo ""
echo "📊 Relatórios gerados:"
echo "  - Screenshots: /tmp/e2e-screenshots/"
echo "  - Metadata: /tmp/e2e-screenshots/test-metadata.json"
echo "  - Playwright report: playwright-report/"
echo ""
echo "Para visualizar o relatório HTML:"
echo "  npx playwright show-report"
echo ""
