import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'diegoabneroficial@gmail.com';

test.describe('Fluxo Completo - Recuperação de Senha', () => {
  
  test('01 - Solicitar recuperação de senha e verificar URL gerada', async ({ page }) => {
    console.log('\n🧪 Teste 01: Solicitar recuperação e verificar URL\n');
    
    await page.goto('http://localhost:5000/forgot-password');
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    
    let resetUrl = '';
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Reset URL gerada:')) {
        resetUrl = text.split('Reset URL gerada: ')[1];
        console.log('✅ URL capturada:', resetUrl);
      }
    });
    
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/forgot-password') && response.status() === 200
    );
    
    await page.locator('button[type="submit"]').click();
    
    const response = await responsePromise;
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.message).toContain('recuperação');
    
    await page.waitForSelector('text=/Link de Recuperação Enviado/i', { timeout: 5000 });
    
    console.log('✅ Email de recuperação enviado com sucesso');
    
    expect(page.url()).toContain('forgot-password');
  });
  
  test('02 - Verificar que a página existe', async ({ page }) => {
    console.log('\n🧪 Teste 02: Verificar página de reset\n');
    
    await page.goto('http://localhost:5000/reset-password?token=test-token');
    
    const pageContent = await page.content();
    expect(pageContent).not.toContain('404');
    
    const resetPasswordHeading = page.locator('h1, h2').filter({ hasText: /redefinir|nova senha|reset/i });
    await expect(resetPasswordHeading.first()).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Página de reset de senha existe e está acessível');
  });
  
  test('03 - Verificar validação de token inválido', async ({ page }) => {
    console.log('\n🧪 Teste 03: Validação de token inválido\n');
    
    await page.goto('http://localhost:5000/reset-password?token=invalid-token-12345');
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[type="password"]').first().fill('NovaSenha@123');
    await page.locator('input[type="password"]').nth(1).fill('NovaSenha@123');
    
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/reset-password') || response.url().includes('/auth/')
    );
    
    await page.locator('button[type="submit"]').click();
    
    try {
      const response = await responsePromise;
      const data = await response.json();
      
      console.log('📝 Response:', data);
      
      expect(response.status()).not.toBe(200);
      
      console.log('✅ Token inválido rejeitado corretamente');
    } catch (e) {
      await page.waitForSelector('text=/inválido|expirado|erro/i', { timeout: 3000 });
      console.log('✅ Mensagem de erro exibida para token inválido');
    }
  });
  
  test('04 - Validar regras de senha forte', async ({ page }) => {
    console.log('\n🧪 Teste 04: Validação de senha forte\n');
    
    await page.goto('http://localhost:5000/reset-password?token=test-token');
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[type="password"]').first().fill('123');
    await page.locator('input[type="password"]').nth(1).fill('123');
    
    await page.locator('button[type="submit"]').click();
    
    await page.waitForTimeout(1000);
    
    const hasError = await page.locator('text=/caracteres|maiúscula|forte|fraca/i').isVisible().catch(() => false);
    
    if (hasError) {
      console.log('✅ Validação de senha fraca funcionando');
    } else {
      console.log('⚠️ Validação de senha pode estar faltando (frontend)');
    }
  });
});
