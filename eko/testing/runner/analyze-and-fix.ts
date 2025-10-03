import fs from 'fs/promises';
import path from 'path';

interface TestFailure {
  test: string;
  error: string;
  file: string;
}

interface FailureAnalysis {
  category: 'ui' | 'logic' | 'integration' | 'timing' | 'data' | 'auth';
  severity: 'low' | 'medium' | 'high';
  rootCause: string;
  suggestedFix: string;
  patchCode?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

function categorizeFailure(failure: TestFailure): FailureAnalysis {
  const error = failure.error.toLowerCase();
  
  if (error.includes('timeout') || error.includes('waiting')) {
    return {
      category: 'timing',
      severity: 'medium',
      rootCause: 'Timeout ao aguardar elemento ou ação',
      suggestedFix: 'Aumentar timeout ou adicionar espera explícita (waitForLoadState)',
      patchCode: `await page.waitForLoadState('networkidle');\nawait page.waitForTimeout(1000);`,
      riskLevel: 'low'
    };
  }
  
  if (error.includes('not found') || error.includes('locator') || error.includes('visible')) {
    return {
      category: 'ui',
      severity: 'high',
      rootCause: 'Elemento não encontrado ou não visível na página',
      suggestedFix: 'Verificar seletor CSS, atualizar locator ou adicionar espera condicional',
      patchCode: `const element = page.locator('selector').first();\nif (await element.isVisible()) {\n  await element.click();\n}`,
      riskLevel: 'medium'
    };
  }
  
  if (error.includes('redirect') || error.includes('url') || error.includes('navigation')) {
    return {
      category: 'logic',
      severity: 'medium',
      rootCause: 'Navegação ou redirecionamento não ocorreu como esperado',
      suggestedFix: 'Verificar lógica de autenticação ou fluxo de navegação',
      patchCode: `await page.waitForURL(/.*expected-path/, { timeout: 10000 });`,
      riskLevel: 'medium'
    };
  }
  
  if (error.includes('auth') || error.includes('login') || error.includes('credential')) {
    return {
      category: 'auth',
      severity: 'high',
      rootCause: 'Falha na autenticação ou credenciais inválidas',
      suggestedFix: 'Verificar credenciais de teste, estado do banco ou sessão',
      riskLevel: 'high'
    };
  }
  
  if (error.includes('data') || error.includes('expect') || error.includes('assertion')) {
    return {
      category: 'data',
      severity: 'medium',
      rootCause: 'Dados não correspondem ao esperado',
      suggestedFix: 'Verificar seed de dados de teste ou lógica de validação',
      riskLevel: 'low'
    };
  }
  
  return {
    category: 'integration',
    severity: 'medium',
    rootCause: 'Erro não categorizado - requer análise manual',
    suggestedFix: 'Revisar logs e trace para diagnóstico detalhado',
    riskLevel: 'high'
  };
}

async function analyzeFailures(): Promise<void> {
  console.log('🔍 Analisando falhas de teste...\n');
  
  const artifactsDir = path.join(process.cwd(), 'eko', 'testing', 'artifacts', 'test-runs');
  const dirs = await fs.readdir(artifactsDir);
  
  const timestampDirs = dirs.filter(d => d !== 'latest').sort().reverse();
  
  if (timestampDirs.length === 0) {
    console.log('❌ Nenhum teste executado ainda. Execute: npx tsx eko/testing/runner/run-tests.ts\n');
    return;
  }
  
  const latestRun = timestampDirs[0];
  const summaryPath = path.join(artifactsDir, latestRun, 'summary.json');
  
  try {
    const summaryContent = await fs.readFile(summaryPath, 'utf-8');
    const summary = JSON.parse(summaryContent);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 EKO FAILURE ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`📅 Test Run: ${latestRun}`);
    console.log(`❌ Failures: ${summary.failures.length}\n`);
    
    if (summary.failures.length === 0) {
      console.log('✅ Nenhuma falha encontrada!\n');
      return;
    }
    
    const analyses: Array<{ failure: TestFailure; analysis: FailureAnalysis }> = [];
    
    summary.failures.forEach((failure: TestFailure, idx: number) => {
      const analysis = categorizeFailure(failure);
      analyses.push({ failure, analysis });
      
      console.log(`${idx + 1}. ${failure.test}`);
      console.log(`   📂 File: ${failure.file}`);
      console.log(`   🏷️  Category: ${analysis.category.toUpperCase()}`);
      console.log(`   ⚠️  Severity: ${analysis.severity.toUpperCase()}`);
      console.log(`   🔍 Root Cause: ${analysis.rootCause}`);
      console.log(`   💡 Suggested Fix: ${analysis.suggestedFix}`);
      console.log(`   ⚡ Risk Level: ${analysis.riskLevel.toUpperCase()}\n`);
      
      if (analysis.patchCode) {
        console.log(`   📝 Patch Code:\n`);
        console.log(`   ${analysis.patchCode.split('\n').join('\n   ')}\n`);
      }
    });
    
    const analysisReport = {
      timestamp: latestRun,
      totalFailures: summary.failures.length,
      analyses: analyses,
      recommendations: [
        'Revisar cada falha e aplicar correção sugerida',
        'Priorizar falhas de severity "high" primeiro',
        'Executar testes novamente após aplicar correções',
        'Se falhas persistirem, revisar traces e vídeos'
      ]
    };
    
    const reportPath = path.join(artifactsDir, latestRun, 'analysis-report.json');
    await fs.writeFile(reportPath, JSON.stringify(analysisReport, null, 2));
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📄 Análise completa salva em:', reportPath);
    console.log('\n🔧 Próximos passos:');
    console.log('   1. Revisar patches sugeridos acima');
    console.log('   2. Aplicar correções manualmente ou via patch-applier.ts');
    console.log('   3. Re-executar testes: npx tsx eko/testing/runner/run-tests.ts\n');
    
    const lowRiskFixes = analyses.filter(a => a.analysis.riskLevel === 'low');
    if (lowRiskFixes.length > 0) {
      console.log(`✅ ${lowRiskFixes.length} correção(ões) de baixo risco podem ser aplicadas automaticamente.\n`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao analisar falhas:', error);
  }
}

analyzeFailures().catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
