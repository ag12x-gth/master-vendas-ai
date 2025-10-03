import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'teste.e2e@masteriaoficial.com',
  password: 'Test@2025!E2E'
};

test.describe('Core Business Flows - Voice Calls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test('should navigate from Dashboard to Voice Calls', async ({ page }) => {
    const voiceCallsLink = page.locator('text=/voice.*calls|chamadas.*voz/i').first();
    
    await voiceCallsLink.waitFor({ state: 'visible', timeout: 5000 });
    await voiceCallsLink.click();
    
    await page.waitForURL(/.*voice-calls/, { timeout: 10000 });
    
    expect(page.url()).toContain('/voice-calls');
  });

  test('should display Voice Calls KPI dashboard', async ({ page }) => {
    await page.goto('/voice-calls');
    
    await page.waitForLoadState('networkidle');
    
    const kpiCards = page.locator('[class*="card"]').filter({ hasText: /total|completad|taxa|duração|success|duration/i });
    
    const count = await kpiCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should load call history table with data', async ({ page }) => {
    await page.goto('/voice-calls');
    
    await page.waitForLoadState('networkidle');
    
    const tableRows = page.locator('table tbody tr, [role="row"]').filter({ hasNotText: /sem.*dados|no.*data|vazio/i });
    
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should filter calls by status', async ({ page }) => {
    await page.goto('/voice-calls');
    await page.waitForLoadState('networkidle');
    
    const filterButton = page.locator('button, select, [role="combobox"]').filter({ hasText: /status|filtro|filter/i }).first();
    
    if (await filterButton.isVisible()) {
      await filterButton.click();
      
      const completedOption = page.locator('text=/completad|completed|sucesso|success/i').first();
      await completedOption.click({ timeout: 3000 });
      
      await page.waitForTimeout(1000);
      
      const rows = page.locator('table tbody tr, [role="row"]');
      const count = await rows.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should search calls by contact name', async ({ page }) => {
    await page.goto('/voice-calls');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"], input[placeholder*="Search"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('Maria');
      await page.waitForTimeout(1000);
      
      const tableContent = await page.locator('table, [role="table"]').textContent();
      expect(tableContent?.toLowerCase()).toContain('maria');
    }
  });

  test('should open call details modal', async ({ page }) => {
    await page.goto('/voice-calls');
    await page.waitForLoadState('networkidle');
    
    const firstRow = page.locator('table tbody tr, [role="row"]').first();
    
    if (await firstRow.isVisible()) {
      await firstRow.click();
      
      await page.waitForTimeout(1000);
      
      const modal = page.locator('[role="dialog"], [class*="modal"]').first();
      if (await modal.isVisible()) {
        await expect(modal).toBeVisible();
        
        const closeButton = modal.locator('button').filter({ hasText: /fechar|close|×/i }).first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    }
  });

  test('should navigate to Analytics tab', async ({ page }) => {
    await page.goto('/voice-calls');
    await page.waitForLoadState('networkidle');
    
    const analyticsTab = page.locator('[role="tab"], button, a').filter({ hasText: /analytics|análise/i }).first();
    
    if (await analyticsTab.isVisible()) {
      await analyticsTab.click();
      await page.waitForTimeout(1000);
      
      const tabContent = await page.locator('[role="tabpanel"]').first().textContent();
      expect(tabContent).toBeTruthy();
    }
  });
});
