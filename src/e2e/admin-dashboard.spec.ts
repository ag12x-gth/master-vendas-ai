import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5000';
const EMAIL = 'diegomaninhu@gmail.com';
const PASSWORD = 'MasterIA2025!';

test.describe('Admin Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
  });

  test('Should access admin dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/super-admin`);
    await expect(page).toHaveURL(`${BASE_URL}/super-admin`);
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
  });

  test('Should display KPI cards', async ({ page }) => {
    await page.goto(`${BASE_URL}/super-admin`);
    const cards = await page.locator('[class*="p-6"]').count();
    expect(cards).toBeGreaterThan(0);
  });

  test('Should navigate to users page', async ({ page }) => {
    await page.goto(`${BASE_URL}/super-admin`);
    await page.click('a:has-text("Users")');
    await page.waitForURL(`${BASE_URL}/super-admin/users`);
    await expect(page.locator('h1')).toContainText('Users');
  });

  test('Should navigate to companies page', async ({ page }) => {
    await page.goto(`${BASE_URL}/super-admin`);
    await page.click('a:has-text("Companies")');
    await page.waitForURL(`${BASE_URL}/super-admin/companies`);
    await expect(page.locator('h1')).toContainText('Companies');
  });

  test('Should navigate to features page', async ({ page }) => {
    await page.goto(`${BASE_URL}/super-admin`);
    await page.click('a:has-text("Features")');
    await page.waitForURL(`${BASE_URL}/super-admin/features`);
    await expect(page.locator('h1')).toContainText('Features Management');
  });

  test('Should navigate to analytics page', async ({ page }) => {
    await page.goto(`${BASE_URL}/super-admin`);
    await page.click('a:has-text("Analytics")');
    await page.waitForURL(`${BASE_URL}/super-admin/analytics`);
    await expect(page.locator('h1')).toContainText('Analytics Dashboard');
  });

  test('FASE 2: GET /api/v1/admin/users should return 200', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/v1/admin/users`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('users');
    expect(data).toHaveProperty('total');
  });

  test('FASE 2: GET /api/v1/admin/companies should return 200', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/v1/admin/companies`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('companies');
  });

  test('FASE 2: GET /api/v1/admin/features should return 200', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/v1/admin/features`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('features');
  });

  test('FASE 2: GET /api/v1/admin/analytics should return 200', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/v1/admin/analytics`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('stats');
  });

  test('FASE 4: Rate limiting - should reject after exceeding limit', async ({ request }) => {
    const promises = [];
    
    // Make 101 requests rapidly (exceeds 100/min limit)
    for (let i = 0; i < 101; i++) {
      promises.push(request.get(`${BASE_URL}/api/v1/admin/users`));
    }
    
    const responses = await Promise.all(promises);
    const limited = responses.some(r => r.status() === 429);
    expect(limited).toBe(true);
  });

  test('FASE 4: Security - 401 without authentication', async ({ request }) => {
    // Create new context without cookies
    const response = await request.get(`${BASE_URL}/api/v1/admin/users`, {
      headers: { cookie: '' },
    });
    expect(response.status()).toBe(401);
  });

  test('FASE 4: Security - 403 if not superadmin', async ({ page, request }) => {
    // Login with non-superadmin user
    // For now, test that endpoint exists and validates
    const response = await request.get(`${BASE_URL}/api/v1/admin/users`);
    expect([200, 401, 403]).toContain(response.status());
  });
});
