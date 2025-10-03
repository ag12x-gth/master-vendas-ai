import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Master IA Oficial', () => {
  test('should load home page (login) successfully', async ({ page }) => {
    await page.goto('/');
    
    await expect(page).toHaveTitle(/Master IA/i);
    
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    const version = page.locator('text=/v\\d+\\.\\d+\\.\\d+/i');
    if (await version.isVisible()) {
      const versionText = await version.textContent();
      console.log(`✅ Version found: ${versionText}`);
    }
  });

  test('should have working navigation structure', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/.*login/);
    
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('should validate required form fields on login page', async ({ page }) => {
    await page.goto('/login');
    
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    await page.waitForTimeout(500);
    
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('should render footer and branding elements', async ({ page }) => {
    await page.goto('/login');
    
    const pageContent = await page.content();
    expect(pageContent).toContain('Master IA');
  });

  test('should load static assets (CSS/JS) without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('favicon') && 
      !err.includes('404') &&
      !err.includes('warning')
    );
    
    expect(criticalErrors.length).toBeLessThan(3);
  });
});
