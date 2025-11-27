import { test } from '@playwright/test';

test.describe('Atendimentos Page Screenshot', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Desktop only');
  
  test('should login and capture atendimentos page', async ({ page, browserName }) => {
    test.setTimeout(180000);
    
    if (browserName !== 'chromium') {
      test.skip();
      return;
    }
    
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.fill('diegomaninhu@gmail.com');
    await passwordInput.fill('MasterIA2025!');
    
    await page.click('button[type="submit"]');
    
    try {
      await page.waitForURL('**/dashboard**', { timeout: 60000 });
    } catch {
      await page.waitForTimeout(10000);
    }
    
    await page.goto('/atendimentos');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('button:has-text("Todas")', { timeout: 30000 });
    
    await page.waitForTimeout(5000);
    
    const conversationItem = page.locator('button.rounded-lg').first();
    try {
      await conversationItem.waitFor({ state: 'visible', timeout: 20000 });
      await conversationItem.click();
      await page.waitForTimeout(5000);
    } catch {
      console.log('Could not find conversation item');
    }
    
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/atendimentos-final.png',
      fullPage: false 
    });
    
    console.log('Screenshot salvo: tests/e2e/screenshots/atendimentos-final.png');
  });
});
