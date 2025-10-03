import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'teste.e2e@masteriaoficial.com',
  password: 'Test@2025!E2E'
};

test.describe('Authentication Flow', () => {
  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    
    expect(page.url()).toContain('/dashboard');
    
    await expect(page.locator('text=/dashboard|painel|início/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    
    expect(page.url()).toContain('/login');
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/login');
    
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('not-an-email');
    await emailInput.blur();
    
    await page.waitForTimeout(500);
    
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage).toBeTruthy();
  });

  test('should maintain session after login', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*dashboard/);
    
    await page.reload();
    
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/dashboard');
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    
    await page.waitForURL(/.*login/, { timeout: 5000 });
    
    expect(page.url()).toContain('/login');
  });
});
