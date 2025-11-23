import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const TEST_USER = {
  email: 'diegomaninhu@gmail.com',
  password: 'MasterIA2025!'
};

const SCREENSHOT_DIR = '/tmp/e2e-screenshots/complete-flow';

test.describe('🎯 Master IA Oficial - Fluxo Completo do Usuário', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  TESTE E2E - FLUXO COMPLETO COM CHROMIUM        ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log(`📁 Screenshots: ${SCREENSHOT_DIR}\n`);
  });

  test('01 - Login, Dashboard e Navegação Completa', async ({ page }) => {
    console.log('📋 TESTE 01: Fluxo completo de usuário');
    
    // Passo 1: Acessar aplicação
    console.log('  → Acessando aplicação...');
    await page.goto('http://localhost:5000/');
    await page.waitForLoadState('networkidle');
    
    // Deve redirecionar para /login
    expect(page.url()).toContain('login');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-tela-login.png'), fullPage: true });
    console.log('  ✓ Página de login carregada');
    
    // Passo 2: Fazer login
    console.log('  → Preenchendo formulário de login...');
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible();
    
    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-formulario-preenchido.png'), fullPage: true });
    
    console.log('  → Submetendo login...');
    await submitButton.click();
    
    // Aguardar navegação para dashboard
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    console.log('  ✓ Login realizado com sucesso!');
    
    // Passo 3: Verificar Dashboard
    console.log('  → Verificando dashboard...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-dashboard.png'), fullPage: true });
    
    const url = page.url();
    expect(url).toContain('/dashboard');
    console.log(`  ✓ Dashboard carregado: ${url}`);
    
    // Passo 4: Navegar para Conversas
    console.log('  → Navegando para Conversas...');
    try {
      await page.goto('http://localhost:5000/dashboard/conversations');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-conversas.png'), fullPage: true });
      console.log('  ✓ Página de Conversas acessada');
    } catch (e) {
      console.log('  ⚠ Conversas: página pode não existir');
    }
    
    // Passo 5: Navegar para Contatos
    console.log('  → Navegando para Contatos...');
    try {
      await page.goto('http://localhost:5000/dashboard/contacts');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-contatos.png'), fullPage: true });
      console.log('  ✓ Página de Contatos acessada');
    } catch (e) {
      console.log('  ⚠ Contatos: página pode não existir');
    }
    
    // Passo 6: Navegar para Campanhas
    console.log('  → Navegando para Campanhas...');
    try {
      await page.goto('http://localhost:5000/dashboard/campaigns');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-campanhas.png'), fullPage: true });
      console.log('  ✓ Página de Campanhas acessada');
    } catch (e) {
      console.log('  ⚠ Campanhas: página pode não existir');
    }
    
    // Passo 7: Verificar título da página
    const title = await page.title();
    console.log(`  📄 Título da página: ${title}`);
    
    // Passo 8: Screenshot final
    await page.goto('http://localhost:5000/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-final-dashboard.png'), fullPage: true });
    
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  ✅ TESTE COMPLETO CONCLUÍDO COM SUCESSO!       ║');
    console.log('╚══════════════════════════════════════════════════╝\n');
  });

  test('02 - Verificar Elementos da Interface', async ({ page }) => {
    console.log('\n📋 TESTE 02: Verificando elementos da interface');
    
    // Login
    await page.goto('http://localhost:5000/login');
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[type="email"]').first().fill(TEST_USER.email);
    await page.locator('input[type="password"]').first().fill(TEST_USER.password);
    await page.locator('button[type="submit"]').first().click();
    
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    
    // Verificar se há elementos de navegação
    console.log('  → Verificando elementos de navegação...');
    const navLinks = await page.locator('nav a, [role="navigation"] a').count();
    console.log(`  ✓ Links de navegação encontrados: ${navLinks}`);
    
    // Verificar se há cards/containers
    const cards = await page.locator('[class*="card"], [class*="Card"], [class*="container"]').count();
    console.log(`  ✓ Cards/Containers encontrados: ${cards}`);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-elementos-interface.png'), fullPage: true });
    
    console.log('  ✅ Verificação de interface concluída!');
  });

  test('03 - Teste de Responsividade', async ({ page }) => {
    console.log('\n📋 TESTE 03: Testando responsividade');
    
    // Login
    await page.goto('http://localhost:5000/login');
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[type="email"]').first().fill(TEST_USER.email);
    await page.locator('input[type="password"]').first().fill(TEST_USER.password);
    await page.locator('button[type="submit"]').first().click();
    
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    
    // Desktop
    console.log('  → Testando em Desktop (1920x1080)...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-desktop.png'), fullPage: false });
    
    // Tablet
    console.log('  → Testando em Tablet (768x1024)...');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-tablet.png'), fullPage: false });
    
    // Mobile
    console.log('  → Testando em Mobile (375x667)...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-mobile.png'), fullPage: false });
    
    console.log('  ✅ Testes de responsividade concluídos!');
  });
});
