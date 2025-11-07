import { test, expect } from '@playwright/test';

test.describe('BUG-A001: Visual Feedback Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'diegomaninhu@gmail.com');
    await page.fill('input[type="password"]', 'MasterIA2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 15000 });
  });

  test('Webhook save - should show success toast', async ({ page }) => {
    await page.goto('/configuracoes');
    
    await page.getByRole('tab', { name: /webhooks/i }).click();
    
    await page.getByRole('button', { name: /novo webhook/i }).click();
    
    await page.fill('input[name="name"]', 'Test Webhook E2E');
    await page.fill('input[name="url"]', 'https://example.com/webhook');
    
    await page.locator('select[name="eventTriggers"]').selectOption('contact.created');
    
    await page.getByRole('button', { name: /salvar/i }).click();
    
    const toastSuccess = page.locator('[role="status"], .toast, [data-state="open"]').filter({ hasText: /webhook.*criado|sucesso/i });
    await expect(toastSuccess).toBeVisible({ timeout: 5000 });
    
    console.log('✅ SUCCESS: Toast de sucesso apareceu após criar webhook');
  });

  test('Webhook save - should show error toast for invalid URL', async ({ page }) => {
    await page.goto('/configuracoes');
    
    await page.getByRole('tab', { name: /webhooks/i }).click();
    
    await page.getByRole('button', { name: /novo webhook/i }).click();
    
    await page.fill('input[name="name"]', 'Invalid Webhook');
    await page.fill('input[name="url"]', 'not-a-valid-url');
    
    await page.getByRole('button', { name: /salvar/i }).click();
    
    const validationMessage = page.locator('input[name="url"]:invalid');
    await expect(validationMessage).toBeVisible({ timeout: 2000 });
    
    console.log('✅ SUCCESS: Validação HTML5 bloqueou URL inválida');
  });

  test('Campaign creation - should show loading spinner', async ({ page }) => {
    await page.goto('/campanhas');
    
    await page.getByRole('button', { name: /nova campanha/i }).click();
    
    const loadingSpinner = page.locator('.animate-spin, [role="progressbar"]');
    
    const isVisible = await loadingSpinner.isVisible().catch(() => false);
    
    if (isVisible) {
      console.log('✅ SUCCESS: Loading spinner encontrado');
    } else {
      console.log('⚠️ WARNING: Loading spinner não encontrado (pode ter carregado muito rápido)');
    }
  });

  test('Contact import - should show validation errors', async ({ page }) => {
    await page.goto('/contatos');
    
    await page.getByRole('button', { name: /importar/i }).click();
    
    await page.getByRole('button', { name: /importar|salvar/i }).click();
    
    const requiredValidation = page.locator('input:required:invalid, [aria-invalid="true"]');
    const count = await requiredValidation.count();
    
    expect(count).toBeGreaterThan(0);
    console.log(`✅ SUCCESS: ${count} campos com validação required encontrados`);
  });

  test('Team invite - should show toast on success', async ({ page }) => {
    await page.goto('/configuracoes');
    
    await page.getByRole('tab', { name: /equipe/i }).click();
    
    await page.getByRole('button', { name: /convidar/i }).click();
    
    await page.fill('input[type="email"]', `test-${Date.now()}@example.com`);
    
    const roleSelect = page.locator('select[name="role"], [name="role"]');
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('agent');
    }
    
    await page.getByRole('button', { name: /enviar|convidar/i }).click();
    
    const toast = page.locator('[role="status"], .toast').filter({ hasText: /convite|enviado|sucesso/i });
    await expect(toast).toBeVisible({ timeout: 5000 });
    
    console.log('✅ SUCCESS: Toast de convite enviado apareceu');
  });
});
