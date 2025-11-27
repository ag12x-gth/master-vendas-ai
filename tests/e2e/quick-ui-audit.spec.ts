import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const TEST_USER = {
  email: 'diegomaninhu@gmail.com',
  password: 'MasterIA2025!'
};

const SCREENSHOT_DIR = '/tmp/e2e-screenshots/ui-audit';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];

const PAGES = [
  '/dashboard',
  '/contacts',
  '/campaigns',
  '/lists',
  '/connections',
  '/atendimentos',
  '/kanban',
  '/agentes-ia',
  '/templates',
  '/configuracoes',
];

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  const files = fs.readdirSync(SCREENSHOT_DIR);
  files.forEach(f => fs.unlinkSync(path.join(SCREENSHOT_DIR, f)));
  console.log('📁 Screenshots:', SCREENSHOT_DIR);
});

test.describe('UI Audit', () => {
  test('Capture all pages - Mobile', async ({ browser }) => {
    const vp = VIEWPORTS[0];
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 20000 });
    console.log('✅ Login OK - Mobile');
    
    for (const p of PAGES) {
      try {
        await page.goto(p, { timeout: 15000 });
        await page.waitForTimeout(800);
        const name = p.replace('/', '') || 'home';
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `mobile-${name}.png`), fullPage: true });
        console.log(`📸 mobile-${name}.png`);
        
        const overflow = await page.evaluate(() => {
          return {
            horizontal: document.documentElement.scrollWidth > window.innerWidth,
            vertical: document.documentElement.scrollHeight > window.innerHeight,
            canScroll: (() => {
              const before = window.scrollY;
              window.scrollTo(0, 100);
              const after = window.scrollY;
              window.scrollTo(0, 0);
              return after > before || document.documentElement.scrollHeight <= window.innerHeight;
            })()
          };
        });
        
        if (overflow.horizontal) console.log(`   ⚠️ OVERFLOW HORIZONTAL em ${p}`);
        if (overflow.vertical && !overflow.canScroll) console.log(`   ❌ SCROLL BLOQUEADO em ${p}`);
        
      } catch (e) {
        console.log(`❌ Erro em ${p}: ${e}`);
      }
    }
    
    await context.close();
  });

  test('Capture all pages - Desktop', async ({ browser }) => {
    const vp = VIEWPORTS[1];
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 20000 });
    console.log('✅ Login OK - Desktop');
    
    for (const p of PAGES) {
      try {
        await page.goto(p, { timeout: 15000 });
        await page.waitForTimeout(800);
        const name = p.replace('/', '') || 'home';
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `desktop-${name}.png`), fullPage: true });
        console.log(`📸 desktop-${name}.png`);
        
        const overflow = await page.evaluate(() => {
          return {
            horizontal: document.documentElement.scrollWidth > window.innerWidth,
            vertical: document.documentElement.scrollHeight > window.innerHeight,
            canScroll: (() => {
              const before = window.scrollY;
              window.scrollTo(0, 100);
              const after = window.scrollY;
              window.scrollTo(0, 0);
              return after > before || document.documentElement.scrollHeight <= window.innerHeight;
            })()
          };
        });
        
        if (overflow.horizontal) console.log(`   ⚠️ OVERFLOW HORIZONTAL em ${p}`);
        if (overflow.vertical && !overflow.canScroll) console.log(`   ❌ SCROLL BLOQUEADO em ${p}`);
        
      } catch (e) {
        console.log(`❌ Erro em ${p}: ${e}`);
      }
    }
    
    await context.close();
  });
});
