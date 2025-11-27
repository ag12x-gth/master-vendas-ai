import { test, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const USER = { email: 'diegomaninhu@gmail.com', password: 'MasterIA2025!' };
const DIR = '/tmp/audit-screenshots';

const PAGES = [
  '/dashboard', '/contacts', '/campaigns', '/lists', 
  '/connections', '/atendimentos', '/kanban', 
  '/agentes-ia', '/templates'
];

test.beforeAll(() => {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
});

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(USER.email);
  await page.locator('input[type="password"]').fill(USER.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}

test('Mobile Screenshots (390x844)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await login(page);
  
  for (const p of PAGES) {
    try {
      await page.goto(p, { timeout: 20000 });
      await page.waitForTimeout(1500);
      const name = p.replace('/', '') || 'home';
      await page.screenshot({ path: path.join(DIR, `mobile-${name}.png`), fullPage: true });
      console.log(`📸 mobile-${name}.png`);
    } catch (e) { console.log(`❌ ${p}: ${e}`); }
  }
  await ctx.close();
});

test('Desktop Screenshots (1440x900)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await login(page);
  
  for (const p of PAGES) {
    try {
      await page.goto(p, { timeout: 20000 });
      await page.waitForTimeout(1500);
      const name = p.replace('/', '') || 'home';
      await page.screenshot({ path: path.join(DIR, `desktop-${name}.png`), fullPage: true });
      console.log(`📸 desktop-${name}.png`);
    } catch (e) { console.log(`❌ ${p}: ${e}`); }
  }
  await ctx.close();
});
