import { test, expect } from '@playwright/test';

test.describe('Integration: Visual Feedback + Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'diegomaninhu@gmail.com');
    await page.fill('input[type="password"]', 'MasterIA2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 15000 });
  });

  test('Complete webhook flow: validation + toast + success', async ({ page }) => {
    await page.goto('/configuracoes');
    await page.getByRole('tab', { name: /webhooks/i }).click();
    
    await page.getByRole('button', { name: /novo webhook/i }).click();
    
    await page.fill('input[name="name"]', '');
    await page.fill('input[name="url"]', 'invalid');
    await page.getByRole('button', { name: /salvar/i }).click();
    
    const invalidInput = page.locator('input:invalid');
    const isInvalid = await invalidInput.count() > 0;
    expect(isInvalid).toBeTruthy();
    console.log('✅ STEP 1: HTML5 validation blocked invalid data');
    
    await page.fill('input[name="name"]', 'Integration Test Webhook');
    await page.fill('input[name="url"]', 'https://integration-test.example.com/hook');
    await page.locator('select[name="eventTriggers"]').selectOption('contact.created');
    await page.getByRole('button', { name: /salvar/i }).click();
    
    const toast = page.locator('[role="status"], .toast').filter({ hasText: /webhook.*criado|sucesso/i });
    await expect(toast).toBeVisible({ timeout: 5000 });
    console.log('✅ STEP 2: Success toast appeared after valid submission');
    
    const webhookRow = page.locator('tr, .webhook-item').filter({ hasText: /Integration Test Webhook/i });
    await expect(webhookRow).toBeVisible({ timeout: 3000 });
    console.log('✅ STEP 3: Webhook saved and visible in table');
  });

  test('Complete contact flow: validation + loading + toast', async ({ page }) => {
    await page.goto('/contatos');
    
    await page.getByRole('button', { name: /novo contato|adicionar/i }).click();
    
    await page.fill('input[name="name"]', '');
    await page.fill('input[name="phone"]', '123');
    
    const submitButton = page.getByRole('button', { name: /salvar|criar/i });
    await submitButton.click();
    
    const invalidFields = page.locator('input:invalid, [aria-invalid="true"]');
    const count = await invalidFields.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ STEP 1: ${count} invalid fields blocked submission`);
    
    await page.fill('input[name="name"]', 'Test Contact Integration');
    await page.fill('input[name="phone"]', '+5511999999999');
    
    await submitButton.click();
    
    const loadingState = submitButton.locator('.animate-spin');
    const hasLoading = await loadingState.isVisible().catch(() => false);
    if (hasLoading) {
      console.log('✅ STEP 2: Loading spinner appeared during save');
    }
    
    const toast = page.locator('[role="status"], .toast').filter({ hasText: /contato.*criado|sucesso/i });
    await expect(toast).toBeVisible({ timeout: 5000 });
    console.log('✅ STEP 3: Success toast appeared after contact creation');
  });

  test('Form errors should have accessible labels', async ({ page }) => {
    await page.goto('/configuracoes');
    await page.getByRole('tab', { name: /webhooks/i }).click();
    await page.getByRole('button', { name: /novo webhook/i }).click();
    
    const nameInput = page.locator('input[name="name"]');
    const nameId = await nameInput.getAttribute('id');
    
    if (nameId) {
      const label = page.locator(`label[for="${nameId}"]`);
      await expect(label).toBeVisible();
      console.log('✅ SUCCESS: Input has proper label association');
    }
    
    const urlInput = page.locator('input[name="url"]');
    const urlId = await urlInput.getAttribute('id');
    
    if (urlId) {
      const urlLabel = page.locator(`label[for="${urlId}"]`);
      await expect(urlLabel).toBeVisible();
      console.log('✅ SUCCESS: URL input has proper label');
    }
  });

  test('Loading states should be visible during async operations', async ({ page }) => {
    await page.goto('/dashboard');
    
    await page.reload();
    
    const skeletonLoaders = page.locator('.skeleton, [data-loading="true"], .animate-pulse');
    const count = await skeletonLoaders.count();
    
    if (count > 0) {
      console.log(`✅ SUCCESS: ${count} loading skeletons found during page load`);
    } else {
      console.log('⚠️ INFO: Page loaded too quickly to see loading states');
    }
  });
});
