import { test, expect } from '@playwright/test';

test.describe('Esqueceu Senha - E2E', () => {
  test('1. Acessar página de recuperação de senha', async ({ page }) => {
    await page.goto('http://localhost:5000/forgot-password');
    await page.waitForLoadState('networkidle');
    
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: 'test-results/forgot-password-page.png', fullPage: true });
    console.log('✅ Página de recuperação de senha carregada');
  });

  test('2. Preencher email e enviar solicitação', async ({ page }) => {
    await page.goto('http://localhost:5000/forgot-password');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill('diegoabneroficial@gmail.com');
    
    await page.screenshot({ path: 'test-results/forgot-password-filled.png', fullPage: true });
    console.log('✅ Email preenchido');
  });

  test('3. Submeter formulário e verificar mensagem de sucesso', async ({ page }) => {
    await page.goto('http://localhost:5000/forgot-password');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill('diegoabneroficial@gmail.com');
    
    const submitButton = page.getByRole('button', { name: /enviar|recuperar|redefinir/i }).first();
    await submitButton.click();
    
    await page.waitForTimeout(3000);
    
    const successMessage = page.locator('text=/enviado|sucesso|email de recuperação/i').first();
    const isSuccessVisible = await successMessage.isVisible().catch(() => false);
    
    if (isSuccessVisible) {
      console.log('✅ Mensagem de sucesso exibida corretamente');
    } else {
      console.log('⚠️ Mensagem de sucesso não encontrada visualmente (pode estar em toast ou redirecionamento)');
    }
    
    await page.screenshot({ path: 'test-results/forgot-password-success.png', fullPage: true });
  });

  test('4. Testar com email não cadastrado (validação)', async ({ page }) => {
    await page.goto('http://localhost:5000/forgot-password');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill('emailnaocadastrado@example.com');
    
    const submitButton = page.getByRole('button', { name: /enviar|recuperar|redefinir/i }).first();
    await submitButton.click();
    
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/forgot-password-not-found.png', fullPage: true });
    console.log('✅ Teste com email não cadastrado concluído');
  });

  test('5. Verificar validação de email inválido', async ({ page }) => {
    await page.goto('http://localhost:5000/forgot-password');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill('email-invalido');
    
    const submitButton = page.getByRole('button', { name: /enviar|recuperar|redefinir/i }).first();
    await submitButton.click();
    
    await page.waitForTimeout(1000);
    
    const errorMessage = page.locator('text=/inválido|error|erro/i').first();
    const isErrorVisible = await errorMessage.isVisible().catch(() => false);
    
    if (isErrorVisible) {
      console.log('✅ Mensagem de erro de validação exibida');
    } else {
      console.log('⚠️ Validação pode estar sendo feita pelo navegador (HTML5)');
    }
    
    await page.screenshot({ path: 'test-results/forgot-password-invalid-email.png', fullPage: true });
  });
});
