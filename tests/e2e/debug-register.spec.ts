import { test, expect } from '@playwright/test';

test.describe('Debug - Cadastro', () => {
  test('Verificar estado do formulário antes do submit', async ({ page }) => {
    await page.goto('http://localhost:5000/register');
    await page.waitForLoadState('networkidle');
    
    const testEmail = `debug.${Date.now()}@test.com`;
    const testPassword = 'SenhaForte@123';
    
    console.log('1. Preenchendo nome...');
    await page.locator('input[placeholder*="nome completo"]').first().fill('Debug Test User');
    
    console.log('2. Preenchendo email...');
    await page.locator('input[type="email"]').first().fill(testEmail);
    
    console.log('3. Preenchendo senha...');
    const passwordInput = page.locator('input[type="password"]').nth(0);
    await passwordInput.fill(testPassword);
    
    console.log('4. Preenchendo confirmação de senha...');
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    await confirmPasswordInput.fill(testPassword);
    
    console.log('5. Verificando estado da senha antes do checkbox...');
    const passwordValue = await passwordInput.inputValue();
    const confirmPasswordValue = await confirmPasswordInput.inputValue();
    console.log(`   Senha: ${passwordValue}`);
    console.log(`   Confirmar: ${confirmPasswordValue}`);
    
    console.log('6. Marcando checkbox dos termos...');
    const checkbox = page.locator('input[type="checkbox"]#terms').first();
    const isCheckedBefore = await checkbox.isChecked();
    console.log(`   Checkbox antes do click: ${isCheckedBefore}`);
    
    await checkbox.click({ force: true });
    await page.waitForTimeout(500);
    
    const isCheckedAfter = await checkbox.isChecked();
    console.log(`   Checkbox depois do click: ${isCheckedAfter}`);
    
    console.log('7. Preparando para clicar no botão submit...');
    const submitButton = page.getByRole('button', { name: /criar conta/i });
    const isButtonDisabled = await submitButton.isDisabled();
    console.log(`   Botão desabilitado: ${isButtonDisabled}`);
    
    await page.screenshot({ path: 'test-results/debug-before-submit.png', fullPage: true });
    
    page.on('console', msg => console.log('Browser console:', msg.text()));
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`📡 Request: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`📥 Response: ${response.status()} ${response.url()}`);
      }
    });
    
    console.log('8. Clicando no botão submit...');
    await submitButton.click();
    
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'test-results/debug-after-submit.png', fullPage: true });
    
    const currentUrl = page.url();
    console.log(`9. URL atual: ${currentUrl}`);
  });
});
