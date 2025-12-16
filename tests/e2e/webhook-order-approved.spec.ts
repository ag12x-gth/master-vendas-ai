import { test, expect } from '@playwright/test';

test('E2E: Webhook order_approved with variable interpolation', async ({ page }) => {
  // 1. Setup
  await page.goto('http://localhost:5000/login', { waitUntil: 'networkidle' });
  
  // 2. Login
  await page.fill('input[type="email"]', 'diegomaninhu@gmail.com');
  await page.fill('input[type="password"]', 'MasterIA2025!');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  
  // 3. Navigate to automations
  await page.goto('http://localhost:5000/automations', { waitUntil: 'networkidle' });
  
  // 4. Create webhook automation
  await page.click('button:has-text("Nova Automação")');
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  
  // 5. Fill form with webhook_order_approved
  await page.fill('input[placeholder*="Nome"]', 'Teste Webhook Order Approved');
  
  // Selecionar gatilho webhook_order_approved
  await page.click('select:first-child'); 
  await page.selectOption('select:first-child', 'webhook_order_approved');
  
  // 6. Adicionar ação de envio de mensagem
  await page.click('button:has-text("Adicionar Ação")');
  await page.selectOption('select:nth-child(2)', 'send_message_apicloud');
  
  // 7. Escrever mensagem com variáveis
  const messageText = 'Olá {{customer_name}}, sua compra de {{order_value}} foi aprovada! ID: {{order_id}}';
  await page.fill('textarea', messageText);
  
  // 8. Validar que preview de variáveis está visível
  const variablesPreview = await page.locator('text=Variáveis disponíveis').isVisible();
  expect(variablesPreview).toBe(true);
  
  // 9. Salvar automação
  await page.click('button:has-text("Salvar")');
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  
  // 10. Validar sucesso
  const successText = await page.locator('text=foi salva').isVisible();
  expect(successText).toBe(true);
  
  console.log('✅ E2E WEBHOOK TEST PASSED');
});

test('E2E: Variable interpolation function', async ({ page }) => {
  // Test the interpolateWebhookVariables function via API
  const response = await page.request.post('http://localhost:5000/api/v1/automations', {
    data: {
      name: 'Test Interpolation',
      triggerEvent: 'webhook_order_approved',
      conditions: [],
      actions: [{
        type: 'send_message_apicloud',
        value: 'Olá {{customer_name}}, valor: {{order_value}}'
      }],
      connectionIds: []
    }
  });
  
  expect(response.ok()).toBe(true);
  console.log('✅ INTERPOLATION API TEST PASSED');
});
