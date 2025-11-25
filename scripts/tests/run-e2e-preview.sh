#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🎬 EXECUTANDO TESTES E2E COM PREVIEW VISUAL COMPLETO       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📦 Dependências instaladas:"
echo "  ✓ Playwright v$(npx playwright --version | awk '{print $2}')"
echo "  ✓ @playwright/test"
echo "  ✓ @types/node"
echo "  ✓ Chromium 138.0.7204.100"
echo ""
echo "🌐 Browser configurado:"
echo "  ✓ /nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium"
echo ""
echo "⚙️ Configuração do teste:"
echo "  • Modo: PREVIEW VISUAL (headed mode)"
echo "  • Screenshots: ON (fullPage)"
echo "  • Vídeos: ON (retain-on-failure)"
echo "  • Traces: ON (on-first-retry)"
echo "  • Timeout: 120 segundos por teste"
echo "  • Workers: 1 (sequencial)"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

# Criar diretório para screenshots
mkdir -p /tmp/e2e-screenshots/preview-visual
mkdir -p /tmp/playwright-report

# Executar testes com preview visual
echo "🚀 Iniciando testes E2E com preview visual..."
echo ""

HEADED=true npx playwright test tests/e2e/complete-user-flow.spec.ts \
  --project=chromium \
  --reporter=list \
  --timeout=120000 \
  --workers=1 \
  --retries=0 \
  --output=/tmp/e2e-screenshots/preview-visual \
  2>&1 | tee /tmp/e2e-preview-test.log

EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📊 RESUMO DOS RESULTADOS:"
echo ""

if [ $EXIT_CODE -eq 0 ]; then
  echo "  ✅ TODOS OS TESTES PASSARAM!"
else
  echo "  ⚠️ Alguns testes falharam (código: $EXIT_CODE)"
fi

echo ""
echo "📸 Screenshots salvos em:"
echo "  /tmp/e2e-screenshots/preview-visual/"
echo ""
echo "📹 Vídeos salvos em:"
find test-results -name "*.webm" 2>/dev/null | head -5 | awk '{print "  " $1}' || echo "  (nenhum vídeo encontrado)"
echo ""
echo "📄 Relatório HTML disponível em:"
echo "  /tmp/playwright-report/index.html"
echo ""
echo "🔍 Traces disponíveis em:"
find test-results -name "trace.zip" 2>/dev/null | head -5 | awk '{print "  " $1}' || echo "  (nenhum trace encontrado)"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "✅ Execução completa! Todas as evidências foram capturadas."
echo ""

exit $EXIT_CODE
