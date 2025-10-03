import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const TEST_USER = {
  email: 'teste.e2e@masteriaoficial.com',
  password: 'Test@2025!E2E',
  companyId: '52fef76d-459c-462d-834b-e6eade8f6adf',
  role: 'admin'
};

const EXPECTED_DATA = {
  totalCalls: 5,
  completedCalls: 3,
  avgDuration: 148,
  successRate: 60,
  contacts: ['Maria Silva', 'João Santos', 'Ana Costa', 'Pedro Oliveira', 'Carla Souza']
};

const SCREENSHOT_DIR = '/tmp/e2e-screenshots';

async function takeScreenshot(page: Page, name: string) {
  const timestamp = Date.now();
  const filename = `${timestamp}-${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filepath;
}

test.describe('Voice Calls E2E - Validação Completa', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
    console.log('🚀 Iniciando testes E2E do Voice Calls');
    console.log(`📁 Screenshots serão salvos em: ${SCREENSHOT_DIR}`);
  });

  test('01 - Login com usuário E2E', async ({ page }) => {
    console.log('\n✅ Teste 01: Login com formulário real');
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await takeScreenshot(page, '01-login-page');
    
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);
    
    await takeScreenshot(page, '01-login-filled');
    
    await submitButton.click();
    
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    await takeScreenshot(page, '01-login-success');
    
    console.log('✅ Login realizado com sucesso');
  });

  test('02 - Navegar para Voice Calls', async ({ page }) => {
    console.log('\n✅ Teste 02: Navegação para Voice Calls');
    
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    
    await page.goto('/voice-calls');
    await page.waitForLoadState('networkidle');
    
    await takeScreenshot(page, '02-voice-calls-page');
    
    const pageTitle = page.locator('h2:has-text("Chamadas de Voz")');
    await expect(pageTitle).toBeVisible();
    
    const newCampaignBtn = page.locator('button:has-text("Nova Campanha")');
    await expect(newCampaignBtn).toBeVisible();
    
    console.log('✅ Página Voice Calls carregada com sucesso');
  });

  test('03 - Validar KPI Dashboard (métricas reais)', async ({ page }) => {
    console.log('\n✅ Teste 03: Validação dos KPIs');
    
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    
    await page.goto('/voice-calls');
    await page.waitForTimeout(2000);
    
    await takeScreenshot(page, '03-kpi-dashboard');
    
    const totalCallsCard = page.locator('.text-2xl.font-bold').first();
    const totalCallsValue = await totalCallsCard.textContent();
    console.log(`📊 Total de Chamadas: ${totalCallsValue}`);
    expect(totalCallsValue?.trim()).toBe(EXPECTED_DATA.totalCalls.toString());
    
    const durationCard = page.locator('.text-2xl.font-bold').nth(1);
    const durationValue = await durationCard.textContent();
    console.log(`⏱️ Duração Média: ${durationValue}`);
    
    const successRateCard = page.locator('.text-2xl.font-bold').nth(2);
    const successRateValue = await successRateCard.textContent();
    console.log(`✅ Taxa de Sucesso: ${successRateValue}`);
    expect(successRateValue?.includes(EXPECTED_DATA.successRate.toString())).toBeTruthy();
    
    console.log('✅ KPIs validados com sucesso');
  });

  test('04 - Validar Call History Table (5 registros)', async ({ page }) => {
    console.log('\n✅ Teste 04: Validação da tabela de histórico');
    
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    
    await page.goto('/voice-calls');
    await page.waitForTimeout(2000);
    
    await takeScreenshot(page, '04-call-history-table');
    
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    console.log(`📋 Registros encontrados: ${rowCount}`);
    expect(rowCount).toBeGreaterThanOrEqual(EXPECTED_DATA.totalCalls);
    
    const firstRowName = page.locator('table tbody tr').first().locator('td').first();
    const firstName = await firstRowName.textContent();
    console.log(`👤 Primeiro registro: ${firstName}`);
    
    console.log('✅ Tabela de histórico validada');
  });

  test('05 - Filtrar por Status (completed)', async ({ page }) => {
    console.log('\n✅ Teste 05: Filtro por status completed');
    
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    
    await page.goto('/voice-calls');
    await page.waitForTimeout(2000);
    
    const statusSelect = page.locator('[role="combobox"]').filter({ hasText: 'Filtrar por status' });
    await statusSelect.click();
    
    await takeScreenshot(page, '05-filter-dropdown-open');
    
    const completedOption = page.locator('[role="option"]:has-text("Concluída")');
    await completedOption.click();
    
    await page.waitForTimeout(1000);
    await takeScreenshot(page, '05-filter-completed');
    
    const completedRows = page.locator('table tbody tr');
    const completedCount = await completedRows.count();
    console.log(`✅ Chamadas completed: ${completedCount}`);
    expect(completedCount).toBe(EXPECTED_DATA.completedCalls);
    
    console.log('✅ Filtro por status validado');
  });

  test('06 - Buscar por nome (Maria)', async ({ page }) => {
    console.log('\n✅ Teste 06: Busca por nome "Maria"');
    
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    
    await page.goto('/voice-calls');
    await page.waitForTimeout(2000);
    
    const searchInput = page.locator('input[placeholder*="Buscar"]');
    await expect(searchInput).toBeVisible();
    
    await searchInput.fill('Maria');
    await page.waitForTimeout(1000);
    
    await takeScreenshot(page, '06-search-maria');
    
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    console.log(`🔍 Resultados para "Maria": ${rowCount}`);
    expect(rowCount).toBeGreaterThanOrEqual(1);
    
    const firstRowText = await tableRows.first().textContent();
    expect(firstRowText?.toLowerCase()).toContain('maria');
    
    console.log('✅ Busca por nome validada');
  });

  test('07 - Buscar por telefone (+5511)', async ({ page }) => {
    console.log('\n✅ Teste 07: Busca por telefone "+5511"');
    
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    
    await page.goto('/voice-calls');
    await page.waitForTimeout(2000);
    
    const searchInput = page.locator('input[placeholder*="Buscar"]');
    await searchInput.fill('+5511');
    await page.waitForTimeout(1000);
    
    await takeScreenshot(page, '07-search-phone');
    
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    console.log(`📱 Resultados para "+5511": ${rowCount}`);
    expect(rowCount).toBeGreaterThanOrEqual(1);
    
    console.log('✅ Busca por telefone validada');
  });

  test('08 - Abrir Modal Nova Campanha', async ({ page }) => {
    console.log('\n✅ Teste 08: Modal Nova Campanha');
    
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    
    await page.goto('/voice-calls');
    await page.waitForTimeout(2000);
    
    const newCampaignBtn = page.locator('button:has-text("Nova Campanha")');
    await newCampaignBtn.click();
    
    await page.waitForTimeout(1000);
    await takeScreenshot(page, '08-new-campaign-modal');
    
    const modalTitle = page.locator('[role="dialog"] h2');
    await expect(modalTitle).toBeVisible();
    
    const contactsSelect = page.locator('[role="dialog"] button:has-text("Selecionar contatos")');
    await expect(contactsSelect).toBeVisible();
    
    console.log('✅ Modal Nova Campanha validado');
  });

  test('09 - Abrir Modal Detalhes da Chamada', async ({ page }) => {
    console.log('\n✅ Teste 09: Modal Detalhes da Chamada');
    
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    
    await page.goto('/voice-calls');
    await page.waitForTimeout(2000);
    
    const detailsBtn = page.locator('button:has-text("Detalhes")').first();
    await expect(detailsBtn).toBeVisible();
    
    await detailsBtn.click();
    await page.waitForTimeout(1000);
    
    await takeScreenshot(page, '09-call-details-modal');
    
    const modalDialog = page.locator('[role="dialog"]');
    await expect(modalDialog).toBeVisible();
    
    console.log('✅ Modal Detalhes da Chamada validado');
  });

  test('10 - Validar Tab Analytics (em desenvolvimento)', async ({ page }) => {
    console.log('\n✅ Teste 10: Tab Analytics');
    
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    
    await page.goto('/voice-calls');
    await page.waitForTimeout(2000);
    
    const analyticsTab = page.locator('[role="tab"]:has-text("Analytics")');
    await expect(analyticsTab).toBeVisible();
    
    await analyticsTab.click();
    await page.waitForTimeout(500);
    
    await takeScreenshot(page, '10-analytics-tab');
    
    const developmentText = page.locator('text=em desenvolvimento');
    await expect(developmentText).toBeVisible();
    
    console.log('✅ Tab Analytics validada (em desenvolvimento)');
  });

  test.afterAll(async () => {
    console.log('\n✅ Todos os testes E2E finalizados!');
    console.log(`📁 Screenshots salvos em: ${SCREENSHOT_DIR}`);
    
    const files = fs.readdirSync(SCREENSHOT_DIR);
    const screenshots = files.filter(f => f.endsWith('.png'));
    console.log(`📸 Total de screenshots: ${screenshots.length}`);
    
    const report = {
      timestamp: new Date().toISOString(),
      testUser: TEST_USER.email,
      expectedData: EXPECTED_DATA,
      screenshotsCount: screenshots.length,
      screenshotPaths: screenshots.map(f => path.join(SCREENSHOT_DIR, f))
    };
    
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'test-metadata.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('📄 Metadados salvos em test-metadata.json');
  });
});
