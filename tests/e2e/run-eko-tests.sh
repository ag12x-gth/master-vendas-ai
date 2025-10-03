#!/bin/bash

# ============================================================================
# Master IA Oficial - Execução de Testes E2E com Eko (Fellou.ai)
# ============================================================================
# Este script executa testes autônomos E2E usando:
# - Eko framework com visão computacional
# - Claude Sonnet 4.5 thinking via OpenRouter
# - Browser automation com Playwright integrado
# - Validação inteligente com IA
# ============================================================================

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 MASTER IA OFICIAL - TESTES E2E COM EKO (FELLOU.AI)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# ETAPA 1: VERIFICAR SE SERVIDOR ESTÁ RODANDO
# ============================================================================
echo "📡 ETAPA 1/5: Verificando se o servidor está rodando..."

if curl -s http://localhost:5000 > /dev/null 2>&1; then
  echo "✅ Servidor está rodando em http://localhost:5000"
else
  echo "❌ ERRO: Servidor não está rodando!"
  echo "   Por favor, inicie o servidor primeiro:"
  echo "   $ npm run dev:server"
  echo ""
  exit 1
fi

echo ""

# ============================================================================
# ETAPA 2: VERIFICAR API KEYS
# ============================================================================
echo "🔑 ETAPA 2/5: Verificando API keys..."

if [ -z "$OPENROUTER_API_KEY" ]; then
  echo "❌ ERRO: OPENROUTER_API_KEY não está configurado!"
  echo "   Configure a chave OpenRouter antes de executar:"
  echo "   $ export OPENROUTER_API_KEY='sua-chave-aqui'"
  echo ""
  exit 1
fi

echo "✅ OPENROUTER_API_KEY configurado"
echo ""

# ============================================================================
# ETAPA 3: SEED DE DADOS (SE NECESSÁRIO)
# ============================================================================
echo "🌱 ETAPA 3/5: Verificando dados de teste..."

if [ -f "tests/e2e/seed-vapi-data.sql" ]; then
  echo "   Executando seed de dados..."
  psql $DATABASE_URL -f tests/e2e/seed-vapi-data.sql > /dev/null 2>&1 || echo "   ⚠️  Seed já executado anteriormente"
  echo "✅ Dados de teste preparados"
else
  echo "⚠️  Arquivo de seed não encontrado, continuando sem seed..."
fi

echo ""

# ============================================================================
# ETAPA 4: CRIAR DIRETÓRIOS DE OUTPUT
# ============================================================================
echo "📁 ETAPA 4/5: Preparando diretórios de output..."

mkdir -p /tmp/e2e-eko-screenshots
mkdir -p /tmp/e2e-eko-reports

echo "✅ Diretórios criados:"
echo "   - /tmp/e2e-eko-screenshots/ (screenshots)"
echo "   - /tmp/e2e-eko-reports/ (reports)"
echo ""

# ============================================================================
# ETAPA 5: EXECUTAR TESTES EKO
# ============================================================================
echo "🤖 ETAPA 5/5: Executando testes E2E com Eko..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 INICIANDO TESTES AUTÔNOMOS COM VISÃO COMPUTACIONAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Configuração:"
echo "   - Framework: Eko by Fellou.ai"
echo "   - LLM: Claude Sonnet 4.5 (thinking)"
echo "   - Provider: OpenRouter"
echo "   - Browser: Playwright integrado"
echo "   - URL Base: http://localhost:5000"
echo ""
echo "⏳ Aguarde... Eko está executando testes autônomos..."
echo ""

# Executar testes Eko com TypeScript
npx tsx tests/e2e/voice-calls.eko.ts

EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ TESTES EKO CONCLUÍDOS COM SUCESSO!"
else
  echo "❌ TESTES EKO FALHARAM (Exit code: $EXIT_CODE)"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# RESUMO E EVIDÊNCIAS
# ============================================================================
echo "📊 RESUMO DA EXECUÇÃO:"
echo ""
echo "📸 Screenshots:"
ls -lh /tmp/e2e-eko-screenshots/ 2>/dev/null || echo "   Nenhum screenshot encontrado"
echo ""
echo "📄 Localização dos artefatos:"
echo "   - Screenshots: /tmp/e2e-eko-screenshots/"
echo "   - Reports: /tmp/e2e-eko-reports/"
echo ""

if [ $EXIT_CODE -eq 0 ]; then
  echo "🎉 Pipeline E2E Eko finalizado com sucesso!"
  echo ""
  echo "💡 Próximos passos:"
  echo "   1. Revise os screenshots em /tmp/e2e-eko-screenshots/"
  echo "   2. Analise os logs acima para detalhes dos testes"
  echo "   3. Verifique se todos os 10 testes passaram"
  echo ""
else
  echo "⚠️  Testes falharam! Verifique os logs acima para detalhes."
  echo ""
fi

exit $EXIT_CODE
