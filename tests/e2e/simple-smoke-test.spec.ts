import { test, expect } from '@playwright/test';

test.describe('🔥 Smoke Test - Server Health', () => {
  test('Server está respondendo', async ({ page }) => {
    console.log('\n🔍 Testando se servidor está acessível...');
    
    try {
      await page.goto('http://localhost:5000/', { waitUntil: 'networkidle', timeout: 10000 });
      console.log('✅ Servidor respondeu!');
      console.log(`   URL: ${page.url()}`);
      console.log(`   Título: ${await page.title()}`);
      
      await page.screenshot({ path: '/tmp/e2e-screenshots/smoke-test.png', fullPage: true });
      
      expect(page.url()).toBeTruthy();
    } catch (error) {
      console.error('❌ Erro ao acessar servidor:', error);
      throw error;
    }
  });
});
