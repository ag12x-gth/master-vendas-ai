import { test, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const TEST_USER = {
  email: 'diegomaninhu@gmail.com',
  password: 'MasterIA2025!'
};

const SCREENSHOT_DIR = '/tmp/e2e-screenshots/full-ui-audit';

const VIEWPORTS = {
  'iphone-se': { width: 375, height: 667 },
  'iphone-14': { width: 390, height: 844 },
  'ipad': { width: 768, height: 1024 },
  'macbook': { width: 1440, height: 900 },
  'desktop-hd': { width: 1920, height: 1080 },
};

const PAGES_TO_TEST = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/contacts', name: 'Contatos' },
  { path: '/campaigns', name: 'Campanhas' },
  { path: '/lists', name: 'Listas' },
  { path: '/connections', name: 'Conexoes' },
  { path: '/atendimentos', name: 'Atendimentos' },
  { path: '/kanban', name: 'Kanban' },
  { path: '/agentes-ia', name: 'Agentes-IA' },
  { path: '/templates', name: 'Templates' },
  { path: '/configuracoes', name: 'Configuracoes' },
];

interface BugReport {
  page: string;
  viewport: string;
  type: string;
  description: string;
  screenshot: string;
}

const bugsFound: BugReport[] = [];

async function takeScreenshot(page: Page, name: string, viewport: string): Promise<string> {
  const _timestamp = Date.now();
  const filename = `${viewport}-${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`    📸 ${filename}`);
  return filepath;
}

async function loginUser(page: Page): Promise<boolean> {
  try {
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    
    await page.waitForURL('**/dashboard', { timeout: 20000 });
    return true;
  } catch (error) {
    console.error('❌ Falha no login:', error);
    return false;
  }
}

async function checkPageLayout(page: Page, pageName: string, viewport: string): Promise<void> {
  const checks: string[] = [];
  
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  
  if (hasHorizontalScroll) {
    bugsFound.push({
      page: pageName,
      viewport,
      type: 'SCROLL_HORIZONTAL',
      description: 'Página tem scroll horizontal indesejado',
      screenshot: `${viewport}-${pageName.toLowerCase()}`
    });
    checks.push('❌ Scroll horizontal detectado');
  } else {
    checks.push('✅ Sem scroll horizontal');
  }
  
  const hasVerticalScroll = await page.evaluate(() => {
    return document.documentElement.scrollHeight > document.documentElement.clientHeight;
  });
  
  const canScroll = await page.evaluate(() => {
    const scrollBefore = window.scrollY;
    window.scrollTo(0, 100);
    const scrollAfter = window.scrollY;
    window.scrollTo(0, scrollBefore);
    return scrollAfter > scrollBefore || document.documentElement.scrollHeight <= document.documentElement.clientHeight;
  });
  
  if (hasVerticalScroll && !canScroll) {
    bugsFound.push({
      page: pageName,
      viewport,
      type: 'SCROLL_BLOCKED',
      description: 'Scroll vertical bloqueado - conteúdo cortado',
      screenshot: `${viewport}-${pageName.toLowerCase()}`
    });
    checks.push('❌ Scroll vertical bloqueado');
  } else {
    checks.push('✅ Scroll vertical OK');
  }
  
  const overflowElements = await page.evaluate(() => {
    const elements: string[] = [];
    document.querySelectorAll('*').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth + 5) {
        const tag = el.tagName.toLowerCase();
        const className = el.className ? `.${el.className.toString().split(' ')[0]}` : '';
        elements.push(`${tag}${className}`);
      }
    });
    return elements.slice(0, 5);
  });
  
  if (overflowElements.length > 0) {
    bugsFound.push({
      page: pageName,
      viewport,
      type: 'OVERFLOW',
      description: `Elementos ultrapassam viewport: ${overflowElements.join(', ')}`,
      screenshot: `${viewport}-${pageName.toLowerCase()}`
    });
    checks.push(`❌ Overflow: ${overflowElements.length} elementos`);
  } else {
    checks.push('✅ Sem overflow de elementos');
  }
  
  const truncatedText = await page.evaluate(() => {
    const truncated: string[] = [];
    document.querySelectorAll('button, a, span, p, h1, h2, h3, td, th').forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.scrollWidth > htmlEl.clientWidth + 5 && 
          !htmlEl.classList.contains('truncate') &&
          !htmlEl.style.textOverflow) {
        const text = htmlEl.textContent?.substring(0, 20) || '';
        if (text.trim()) truncated.push(text);
      }
    });
    return truncated.slice(0, 3);
  });
  
  if (truncatedText.length > 0) {
    checks.push(`⚠️ Textos cortados: ${truncatedText.length}`);
  }
  
  const bottomNav = await page.locator('[class*="mobile-nav"], nav[class*="bottom"], [class*="MobileNav"]').first();
  const hasBottomNav = await bottomNav.count() > 0;
  
  if (hasBottomNav && viewport.includes('iphone')) {
    const isVisible = await bottomNav.isVisible().catch(() => false);
    if (!isVisible) {
      bugsFound.push({
        page: pageName,
        viewport,
        type: 'MOBILE_NAV_HIDDEN',
        description: 'Menu de navegação mobile não visível',
        screenshot: `${viewport}-${pageName.toLowerCase()}`
      });
      checks.push('❌ Nav mobile oculta');
    } else {
      checks.push('✅ Nav mobile visível');
    }
  }
  
  console.log(`    ${checks.join(' | ')}`);
}

test.describe('🔍 Full UI Audit - Todas as Páginas', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
    
    const existingFiles = fs.readdirSync(SCREENSHOT_DIR);
    existingFiles.forEach(file => {
      fs.unlinkSync(path.join(SCREENSHOT_DIR, file));
    });
    
    console.log('\n' + '═'.repeat(70));
    console.log('🔍 AUDITORIA COMPLETA DE UI - MASTER IA OFICIAL');
    console.log('═'.repeat(70));
    console.log(`📁 Screenshots: ${SCREENSHOT_DIR}`);
    console.log(`👤 Usuário: ${TEST_USER.email}`);
    console.log(`📱 Viewports: ${Object.keys(VIEWPORTS).join(', ')}`);
    console.log(`📄 Páginas: ${PAGES_TO_TEST.length}`);
    console.log('═'.repeat(70) + '\n');
  });

  for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`📱 Viewport: ${viewportName} (${viewport.width}x${viewport.height})`, () => {
      
      test(`Auditar todas as páginas em ${viewportName}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport,
          userAgent: viewportName.includes('iphone') || viewportName.includes('ipad') 
            ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
            : undefined
        });
        
        const page = await context.newPage();
        
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`📱 ${viewportName.toUpperCase()} (${viewport.width}x${viewport.height})`);
        console.log(`${'─'.repeat(60)}`);
        
        const loggedIn = await loginUser(page);
        if (!loggedIn) {
          await takeScreenshot(page, 'login-failed', viewportName);
          throw new Error('Falha no login');
        }
        
        await takeScreenshot(page, 'login-success', viewportName);
        console.log('  ✅ Login realizado com sucesso\n');
        
        for (const pageInfo of PAGES_TO_TEST) {
          console.log(`  📄 ${pageInfo.name} (${pageInfo.path})`);
          
          try {
            await page.goto(pageInfo.path, { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(1000);
            
            await takeScreenshot(page, pageInfo.name.toLowerCase(), viewportName);
            
            await checkPageLayout(page, pageInfo.name, viewportName);
            
            if (await page.locator('[class*="scroll"], [class*="overflow"]').count() > 0) {
              await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
              await page.waitForTimeout(500);
              await takeScreenshot(page, `${pageInfo.name.toLowerCase()}-scrolled`, viewportName);
              await page.evaluate(() => window.scrollTo(0, 0));
            }
            
          } catch (error) {
            console.log(`    ❌ Erro ao carregar: ${error}`);
            bugsFound.push({
              page: pageInfo.name,
              viewport: viewportName,
              type: 'LOAD_ERROR',
              description: `Erro ao carregar página: ${error}`,
              screenshot: `${viewportName}-${pageInfo.name.toLowerCase()}-error`
            });
            await takeScreenshot(page, `${pageInfo.name.toLowerCase()}-error`, viewportName);
          }
        }
        
        await context.close();
      });
    });
  }

  test.afterAll(() => {
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RELATÓRIO DE BUGS ENCONTRADOS');
    console.log('═'.repeat(70));
    
    if (bugsFound.length === 0) {
      console.log('✅ Nenhum bug crítico encontrado!');
    } else {
      console.log(`❌ ${bugsFound.length} bugs encontrados:\n`);
      
      const bugsByType: Record<string, BugReport[]> = {};
      bugsFound.forEach(bug => {
        if (!bugsByType[bug.type]) bugsByType[bug.type] = [];
        bugsByType[bug.type].push(bug);
      });
      
      Object.entries(bugsByType).forEach(([type, bugs]) => {
        console.log(`\n🔴 ${type} (${bugs.length} ocorrências):`);
        bugs.forEach(bug => {
          console.log(`   - ${bug.page} [${bug.viewport}]: ${bug.description}`);
        });
      });
    }
    
    const reportPath = path.join(SCREENSHOT_DIR, 'bug-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      user: TEST_USER.email,
      viewports: Object.keys(VIEWPORTS),
      pages: PAGES_TO_TEST.map(p => p.path),
      totalBugs: bugsFound.length,
      bugs: bugsFound
    }, null, 2));
    
    console.log('\n' + '═'.repeat(70));
    console.log(`📁 Screenshots: ${SCREENSHOT_DIR}`);
    console.log(`📋 Relatório: ${reportPath}`);
    console.log('═'.repeat(70) + '\n');
  });
});
