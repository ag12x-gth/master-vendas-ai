import { test, expect } from '@playwright/test';

test.describe('Login Flow with Dashboard Screenshot', () => {
  test('Complete login flow and capture dashboard', async ({ page }) => {
    console.log('📝 [FASE 2] Iniciando teste de login...');
    
    // Acessar página de login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Preencher credenciais
    console.log('📝 [FASE 2] Preenchendo credenciais...');
    await page.fill('input[type="email"]', 'diegomaninhu@gmail.com');
    await page.fill('input[type="password"]', 'MasterIA2025!');
    
    // Clicar botão Entrar
    console.log('📝 [FASE 2] Clicando em Entrar...');
    await page.click('button:has-text("Entrar")');
    
    // Aguardar redirecionamento
    await page.waitForURL(/\/(dashboard|super-admin)/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('✅ [FASE 3] Login bem-sucedido!');
    console.log(`📍 URL atual: ${page.url()}`);
    
    // Validar sessão persistida (verificar cookies)
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === '__session' || c.name === 'session_token');
    
    if (sessionCookie) {
      console.log('✅ [FASE 3] Sessão persistida com sucesso!');
      console.log(`   Cookie: ${sessionCookie.name}`);
    }
    
    // Fazer screenshot do dashboard
    console.log('📝 [FASE 4] Capturando screenshot do dashboard...');
    await page.screenshot({ 
      path: '/tmp/e2e-screenshots/dashboard-authenticated.png', 
      fullPage: true 
    });
    console.log('✅ [FASE 4] Screenshot capturado!');
    
    // Validar que está realmente autenticado
    const pageTitle = await page.title();
    console.log(`📋 Título da página: ${pageTitle}`);
    
    expect(page.url()).toContain('dashboard').or.toContain('super-admin');
    console.log('✅ Teste completo!');
  });
});
