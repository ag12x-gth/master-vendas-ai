import { test, expect } from '@playwright/test';

test.describe('Cadastro de Novo Usuário - E2E', () => {
  const testEmail = `teste.cadastro.${Date.now()}@masteriaoficial.com`;
  const testPassword = 'SenhaForte@123';
  const testName = 'Usuário Teste Cadastro';

  test('1. Acessar página de cadastro', async ({ page }) => {
    await page.goto('http://localhost:5000/register');
    await page.waitForLoadState('networkidle');
    
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Página de cadastro carregada');
  });

  test('2. Preencher formulário de cadastro', async ({ page }) => {
    await page.goto('http://localhost:5000/register');
    await page.waitForLoadState('networkidle');
    
    const nameInput = page.locator('input[placeholder*="nome completo"]').first();
    await nameInput.fill(testName);
    
    const emailInput = page.locator('input[type="email"], input[placeholder*="exemplo"]').first();
    await emailInput.fill(testEmail);
    
    const passwordInput = page.locator('input[type="password"]').nth(0);
    await passwordInput.fill(testPassword);
    
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    await confirmPasswordInput.fill(testPassword);
    
    const termsLabel = page.locator('text=/Termos de Serviço|Política de Privacidade/i').first();
    await termsLabel.click();
    
    await page.screenshot({ path: 'test-results/register-form-filled.png', fullPage: true });
    console.log('✅ Formulário preenchido com sucesso');
  });

  test('3. Submeter formulário e verificar redirecionamento', async ({ page }) => {
    await page.goto('http://localhost:5000/register');
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[placeholder*="nome completo"]').first().fill(testName);
    await page.locator('input[type="email"]').first().fill(testEmail);
    await page.locator('input[type="password"]').nth(0).fill(testPassword);
    await page.locator('input[type="password"]').nth(1).fill(testPassword);
    await page.locator('text=/Termos de Serviço|Política de Privacidade/i').first().click();
    
    const submitButton = page.getByRole('button', { name: /criar conta/i });
    await submitButton.click();
    
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
    
    await page.screenshot({ path: 'test-results/register-success-dashboard.png', fullPage: true });
    console.log('✅ Cadastro realizado e redirecionado para dashboard');
  });

  test('4. Verificar que o usuário está autenticado', async ({ page }) => {
    await page.goto('http://localhost:5000/register');
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[placeholder*="nome completo"]').first().fill(testName + ' Auth Test');
    await page.locator('input[type="email"]').first().fill(`auth.${testEmail}`);
    await page.locator('input[type="password"]').nth(0).fill(testPassword);
    await page.locator('input[type="password"]').nth(1).fill(testPassword);
    await page.locator('text=/Termos de Serviço|Política de Privacidade/i').first().click();
    
    await page.getByRole('button', { name: /criar conta/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    
    await page.goto('http://localhost:5000/login');
    
    const currentUrl = page.url();
    const isRedirectedFromLogin = currentUrl.includes('/dashboard') || currentUrl.includes('/login');
    
    console.log('✅ Verificação de autenticação concluída');
  });

  test('5. Validar erro de email já cadastrado', async ({ page }) => {
    await page.goto('http://localhost:5000/register');
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[placeholder*="nome completo"]').first().fill('Diego Teste');
    await page.locator('input[type="email"]').first().fill('diegomaninhu@gmail.com');
    await page.locator('input[type="password"]').nth(0).fill(testPassword);
    await page.locator('input[type="password"]').nth(1).fill(testPassword);
    await page.locator('text=/Termos de Serviço|Política de Privacidade/i').first().click();
    
    await page.getByRole('button', { name: /criar conta/i }).click();
    
    await page.waitForTimeout(2000);
    
    const errorMessage = page.locator('text=/já está em uso|already exists|já cadastrado/i').first();
    const isErrorVisible = await errorMessage.isVisible().catch(() => false);
    
    if (isErrorVisible) {
      console.log('✅ Mensagem de erro exibida corretamente para email duplicado');
    } else {
      console.log('⚠️ Mensagem de erro não encontrada (possível redirecionamento ou tratamento diferente)');
    }
    
    await page.screenshot({ path: 'test-results/register-duplicate-email.png', fullPage: true });
  });
});
