import { test, expect } from '@playwright/test';

test.describe('Atendimentos Page Screenshot', () => {
  test('should login and capture atendimentos page', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'diegomaninhu@gmail.com');
    await page.fill('input[type="password"]', 'MasterIA2025!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard**', { timeout: 30000 });
    
    await page.goto('/atendimentos');
    await page.waitForLoadState('networkidle');
    
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/atendimentos-page.png',
      fullPage: true 
    });
    
    const conversationsList = page.locator('[data-testid="conversations-list"], .conversations-list, [class*="conversation"]').first();
    await expect(conversationsList).toBeVisible({ timeout: 10000 });
  });
});
