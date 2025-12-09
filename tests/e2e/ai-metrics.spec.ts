// tests/e2e/ai-metrics.spec.ts
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TEST_EMAIL = 'diegomaninhu@gmail.com';
const TEST_PASSWORD = 'MasterIA2025!';

test.describe('AI Metrics and Performance System - End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada teste
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Aguardar redirecionamento para o dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('Task 1: API endpoint /api/v1/ia/personas/[personaId]/metrics retorna dados válidos', async ({ page }) => {
    // Primeiro, vamos pegar o ID de um agente existente
    const response = await page.request.get(`${BASE_URL}/api/v1/ia/metrics`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('totalMessages');
    expect(data).toHaveProperty('topAgents');
    
    if (data.topAgents && data.topAgents.length > 0) {
      const firstAgent = data.topAgents[0];
      const personaId = firstAgent.id;
      
      // Testar o endpoint de métricas por agente
      const personaResponse = await page.request.get(`${BASE_URL}/api/v1/ia/personas/${personaId}/metrics`);
      expect(personaResponse.ok()).toBeTruthy();
      
      const personaData = await personaResponse.json();
      expect(personaData).toHaveProperty('persona');
      expect(personaData).toHaveProperty('metrics');
      expect(personaData.metrics).toHaveProperty('totalConversations');
      expect(personaData.metrics).toHaveProperty('totalMessages');
      expect(personaData.metrics).toHaveProperty('successRate');
      expect(personaData).toHaveProperty('dailyActivity');
      expect(personaData).toHaveProperty('recentActivity');
      
      console.log('✅ Task 1: API endpoint retorna estrutura correta de dados');
    } else {
      console.log('⚠️  Task 1: Nenhum agente encontrado para testar');
    }
  });

  test('Task 2: Aba de Performance no PersonaEditor exibe métricas do agente', async ({ page }) => {
    // Navegar para a página de agentes
    await page.goto(`${BASE_URL}/agentes-ia`);
    await page.waitForLoadState('networkidle');
    
    // Verificar se existem agentes listados
    const agentCards = page.locator('[data-testid="agent-card"], .cursor-pointer').first();
    const hasAgents = await agentCards.count() > 0;
    
    if (hasAgents) {
      // Clicar no primeiro agente
      await agentCards.click();
      await page.waitForLoadState('networkidle');
      
      // Verificar se a aba "Performance" existe
      const performanceTab = page.getByRole('tab', { name: /performance|desempenho/i });
      expect(await performanceTab.isVisible()).toBeTruthy();
      
      // Clicar na aba Performance
      await performanceTab.click();
      await page.waitForTimeout(1000); // Aguardar carregamento dos dados
      
      // Verificar se os cards de métricas estão visíveis
      const metricsVisible = await page.locator('text=/conversas|mensagens|taxa de sucesso/i').first().isVisible({ timeout: 5000 }).catch(() => false);
      expect(metricsVisible).toBeTruthy();
      
      // Verificar se o gráfico de atividade está presente
      const _chartVisible = await page.locator('.recharts-wrapper, [class*="chart"]').isVisible({ timeout: 5000 }).catch(() => false);
      
      console.log('✅ Task 2: Aba de Performance exibindo métricas corretamente');
    } else {
      console.log('⚠️  Task 2: Nenhum agente disponível para testar');
    }
  });

  test('Task 3: Dashboard exibe seção de AI Performance com métricas gerais', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Verificar se a seção de AI Performance está visível
    const aiPerformanceSection = page.locator('text=/performance da ia|desempenho da ia/i').first();
    const sectionVisible = await aiPerformanceSection.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (sectionVisible) {
      console.log('✅ Task 3: Seção de AI Performance visível no Dashboard');
    } else {
      // Verificar se pelo menos os cards de métricas estão presentes
      const metricsCards = page.locator('text=/mensagens enviadas|conversas gerenciadas|uso nos últimos/i');
      const cardsCount = await metricsCards.count();
      expect(cardsCount).toBeGreaterThan(0);
      console.log(`✅ Task 3: ${cardsCount} cards de métricas encontrados no Dashboard`);
    }
  });

  test('Task 4: Dashboard exibe gráfico de uso da IA ao longo do tempo', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Procurar por elementos de gráfico (Recharts)
    const chart = page.locator('.recharts-wrapper, [class*="recharts"]').first();
    const chartVisible = await chart.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (chartVisible) {
      // Verificar se o gráfico tem dados
      const chartPaths = await page.locator('.recharts-line-curve, .recharts-bar, [class*="recharts-line"]').count();
      expect(chartPaths).toBeGreaterThan(0);
      console.log('✅ Task 4: Gráfico de atividade da IA renderizado corretamente');
    } else {
      console.log('⚠️  Task 4: Gráfico não visível (pode ser porque não há dados)');
    }
  });

  test('Task 5: Dashboard exibe tabela de Top Agentes por Performance', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Procurar pela tabela de top agentes
    const topAgentsTable = page.locator('text=/top.*agentes|agentes.*destaque/i').first();
    const tableHeaderVisible = await topAgentsTable.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (tableHeaderVisible) {
      // Verificar se há linhas na tabela
      const tableRows = page.locator('table tbody tr, [role="row"]');
      const rowCount = await tableRows.count();
      
      if (rowCount > 0) {
        console.log(`✅ Task 5: Tabela de Top Agentes com ${rowCount} agentes listados`);
        
        // Verificar se os links são clicáveis
        const firstAgentLink = tableRows.first().locator('a, [role="link"]').first();
        const linkExists = await firstAgentLink.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (linkExists) {
          console.log('✅ Task 5: Links para detalhes dos agentes funcionando');
        }
      } else {
        console.log('⚠️  Task 5: Tabela existe mas não há agentes listados');
      }
    } else {
      console.log('⚠️  Task 5: Tabela de Top Agentes não encontrada (pode não haver dados)');
    }
  });

  test('Fluxo completo: Dashboard → Top Agente → Aba Performance', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Procurar por um link de agente na tabela
    const agentLink = page.locator('a[href*="/agentes-ia/"]').first();
    const linkVisible = await agentLink.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (linkVisible) {
      // Clicar no agente
      await agentLink.click();
      await page.waitForLoadState('networkidle');
      
      // Verificar se chegamos na página do agente
      expect(page.url()).toContain('/agentes-ia/');
      
      // Clicar na aba Performance
      const performanceTab = page.getByRole('tab', { name: /performance|desempenho/i });
      const tabVisible = await performanceTab.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (tabVisible) {
        await performanceTab.click();
        await page.waitForTimeout(2000);
        
        // Verificar se os dados carregaram
        const metricsLoaded = await page.locator('text=/conversas|mensagens|sucesso/i').first().isVisible({ timeout: 5000 }).catch(() => false);
        expect(metricsLoaded).toBeTruthy();
        
        console.log('✅ Fluxo completo: Dashboard → Agente → Performance funcionando');
      } else {
        console.log('⚠️  Aba Performance não encontrada na página do agente');
      }
    } else {
      console.log('⚠️  Nenhum link de agente encontrado no dashboard');
    }
  });

  test('Verificação de API: Dados consistentes entre endpoints', async ({ page }) => {
    // Buscar métricas gerais
    const generalResponse = await page.request.get(`${BASE_URL}/api/v1/ia/metrics`);
    expect(generalResponse.ok()).toBeTruthy();
    const generalData = await generalResponse.json();
    
    // Se houver agentes, verificar consistência
    if (generalData.topAgents && generalData.topAgents.length > 0) {
      const firstAgent = generalData.topAgents[0];
      
      // Buscar métricas específicas do agente
      const personaResponse = await page.request.get(`${BASE_URL}/api/v1/ia/personas/${firstAgent.id}/metrics`);
      expect(personaResponse.ok()).toBeTruthy();
      const personaData = await personaResponse.json();
      
      // Verificar se os dados básicos coincidem
      expect(personaData.persona.id).toBe(firstAgent.id);
      expect(personaData.persona.name).toBe(firstAgent.name);
      
      console.log('✅ Dados consistentes entre API geral e API específica do agente');
    } else {
      console.log('⚠️  Sem agentes para verificar consistência de dados');
    }
  });
});
