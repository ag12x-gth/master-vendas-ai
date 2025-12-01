import { test, expect } from '@playwright/test';

test('Login flow - preencher credenciais e clicar em Entrar', async ({ page }) => {
  await page.goto('/login');
  
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  const emailInput = page.locator('input[type="email"], input[placeholder*="email"], input[name="email"]').first();
  await emailInput.fill('diegomaninhu@gmail.com');
  
  await page.waitForTimeout(500);
  
  const passwordInput = page.locator('input[type="password"], input[placeholder*="password"], input[name="password"]').first();
  await passwordInput.fill('MasterIA2025!');
  
  await page.waitForTimeout(500);
  
  const loginButton = page.locator('button:has-text("Entrar")').first();
  await loginButton.click();
  
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/tmp/e2e-screenshots/login-result.png', fullPage: true });
});
