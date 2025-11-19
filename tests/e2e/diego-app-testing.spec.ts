import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const TEST_USER = {
  email: 'diegomaninhu@gmail.com',
  password: 'MasterIA2025!'
};

const SCREENSHOT_DIR = '/tmp/e2e-screenshots/diego-testing';

async function takeScreenshot(page: Page, name: string) {
  const timestamp = Date.now();
  const filename = `${timestamp}-${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot: ${filename}`);
  return filepath;
}

test.describe('🚀 App Testing - Diego User E2E', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
    console.log('\n═══════════════════════════════════════════════════');
    console.log('🎯 INICIANDO TESTES E2E - DIEGO APP TESTING');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📁 Screenshots: ${SCREENSHOT_DIR}`);
    console.log(`👤 Usuário: ${TEST_USER.email}\n`);
  });

  test('01 - ✅ Login e Autenticação', async ({ page }) => {
    console.log('\n📋 TESTE 01: Login com credenciais do Diego');
    
    // Navegar para página de login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '01-login-page');
    
    // Preencher formulário
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    
    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);
    
    await takeScreenshot(page, '01-login-filled');
    
    // Submeter
    await submitButton.click();
    
    // Aguardar redirecionamento para dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
    
    await takeScreenshot(page, '01-login-success-dashboard');
    
    console.log('✅ Login realizado com sucesso!');
    console.log(`   URL atual: ${page.url()}`);
  });

  test('02 - 📊 Navegar para Dashboard', async ({ page }) => {
    console.log('\n📋 TESTE 02: Verificar Dashboard');
    
    // Login primeiro
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '02-dashboard-loaded');
    
    // Verificar elementos principais do dashboard
    const dashboardTitle = page.locator('h1, h2').first();
    await expect(dashboardTitle).toBeVisible();
    
    console.log('✅ Dashboard carregado corretamente!');
  });

  test('03 - 📞 Navegar para Contatos', async ({ page }) => {
    console.log('\n📋 TESTE 03: Página de Contatos');
    
    // Login
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // Navegar para contatos
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '03-contacts-page');
    
    // Verificar tabela de contatos
    const table = page.locator('table').first();
    const tableExists = await table.count() > 0;
    
    if (tableExists) {
      console.log('✅ Tabela de contatos encontrada!');
    } else {
      console.log('ℹ️  Nenhum contato na lista');
    }
    
    await takeScreenshot(page, '03-contacts-loaded');
  });

  test('04 - 📤 Navegar para Campanhas', async ({ page }) => {
    console.log('\n📋 TESTE 04: Página de Campanhas');
    
    // Login
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // Navegar para campanhas
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '04-campaigns-page');
    
    // Verificar se página de campanhas carregou
    const pageHeading = page.locator('h1, h2').first();
    await expect(pageHeading).toBeVisible();
    
    console.log('✅ Página de campanhas carregada!');
    
    await takeScreenshot(page, '04-campaigns-loaded');
  });

  test('05 - 📋 Navegar para Listas de Contatos', async ({ page }) => {
    console.log('\n📋 TESTE 05: Listas de Contatos');
    
    // Login
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // Navegar para listas
    await page.goto('/lists');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '05-lists-page');
    
    console.log('✅ Página de listas carregada!');
    
    await takeScreenshot(page, '05-lists-loaded');
  });

  test('06 - 🔌 Verificar Conexões', async ({ page }) => {
    console.log('\n📋 TESTE 06: Página de Conexões');
    
    // Login
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // Navegar para conexões
    await page.goto('/connections');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '06-connections-page');
    
    console.log('✅ Página de conexões carregada!');
    
    await takeScreenshot(page, '06-connections-loaded');
  });

  test.afterAll(() => {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ TESTES E2E CONCLUÍDOS COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📸 Screenshots salvos em: ${SCREENSHOT_DIR}`);
    console.log('');
  });
});
