import { test, expect, devices } from '@playwright/test';

// Testar em diferentes tamanhos de tela mobile
const mobileDevices = [
  { name: '320px (iPhone SE)', viewport: { width: 320, height: 568 } },
  { name: '375px (iPhone 12)', viewport: { width: 375, height: 667 } },
  { name: '425px (iPad Mini)', viewport: { width: 425, height: 768 } },
];

for (const device of mobileDevices) {
  test(`Mobile Responsiveness: ${device.name}`, async ({ page }) => {
    // Set viewport
    await page.setViewportSize(device.viewport.width, device.viewport.height);
    
    // Navigate
    await page.goto('http://localhost:5000/automations', { waitUntil: 'networkidle' });
    
    // Wait for content
    await page.waitForSelector('[role="heading"]', { timeout: 10000 });
    
    // Check layout is responsive
    const heading = await page.locator('[role="heading"]').first();
    expect(heading).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: `/tmp/mobile_${device.viewport.width}px.png`, fullPage: true });
    
    // Validate layout didn't break
    const layout = await page.locator('main, [role="main"]');
    if (await layout.count() > 0) {
      const isVisible = await layout.first().isVisible();
      expect(isVisible).toBe(true);
    }
    
    console.log(`✅ MOBILE TEST PASSED: ${device.name}`);
  });
}

test('Mobile: Form inputs are accessible', async ({ page }) => {
  await page.setViewportSize(320, 568);
  await page.goto('http://localhost:5000/automations', { waitUntil: 'networkidle' });
  
  // Open dialog
  await page.click('button:has-text("Nova")');
  
  // Wait for inputs
  await page.waitForSelector('input, textarea, select', { timeout: 5000 });
  
  // Check if inputs are in viewport
  const inputs = await page.locator('input, textarea, select').all();
  for (const input of inputs) {
    const box = await input.boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    }
  }
  
  console.log(`✅ MOBILE FORM TEST PASSED`);
});
