import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const TEST_USER = {
  email: 'diegomaninhu@gmail.com',
  password: 'MasterIA2025!'
};

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 667, label: 'Mobile (iPhone)' },
  { name: 'tablet-768', width: 768, height: 1024, label: 'Tablet (iPad)' },
  { name: 'desktop-1920', width: 1920, height: 1080, label: 'Desktop (Full HD)' },
  { name: 'landscape-1024', width: 1024, height: 768, label: 'Landscape' }
];

const SCREENSHOT_DIR = 'tests/e2e/screenshots/responsiveness';

async function loginAndGetToSuperAdmin(page: Page) {
  await page.goto('http://localhost:5000/login');
  await page.waitForLoadState('networkidle');
  
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submitButton = page.locator('button[type="submit"]').first();
  
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(TEST_USER.email);
  await passwordInput.fill(TEST_USER.password);
  await submitButton.click();
  
  await page.waitForURL('**/super-admin', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

test('FASE 1: Capturar screenshots em múltiplos viewports', async ({ browser }) => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📸 FASE 1: CAPTURA RESPONSIVENESS - 4 VIEWPORTS');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Create dir if not exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  
  const results: any[] = [];
  
  for (const viewport of VIEWPORTS) {
    console.log(`\n📱 Capturando: ${viewport.label} (${viewport.width}x${viewport.height})`);
    
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height }
    });
    const page = await context.newPage();
    
    try {
      // Login
      await loginAndGetToSuperAdmin(page);
      
      // Capture screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, `${viewport.name}-before-improvements.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });
      
      const stats = fs.statSync(screenshotPath);
      console.log(`   ✅ Screenshot: ${screenshotPath}`);
      console.log(`   📊 Tamanho: ${(stats.size / 1024).toFixed(1)} KB`);
      
      // Collect metrics
      const elements = await page.locator('button').count();
      const bodyText = await page.locator('body').innerText();
      
      results.push({
        viewport: viewport.label,
        dimensions: `${viewport.width}x${viewport.height}`,
        file: path.basename(screenshotPath),
        sizeKB: (stats.size / 1024).toFixed(1),
        buttons: elements,
        textLength: bodyText.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.log(`   ❌ Erro: ${error}`);
    } finally {
      await context.close();
    }
  }
  
  // Save results summary
  const summaryPath = path.join(SCREENSHOT_DIR, 'FASE-1-RESULTS.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ FASE 1 CONCLUÍDA - 4 Screenshots Capturados');
  console.log('═══════════════════════════════════════════════════════════');
  
  expect(results.length).toBe(4);
});
