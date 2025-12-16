import { test, expect } from '@playwright/test';

test('Load Test: Create 10 automations in parallel', async ({ page, context }) => {
  const startTime = Date.now();
  
  // Setup: Login
  await page.goto('http://localhost:5000/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'diegomaninhu@gmail.com');
  await page.fill('input[type="password"]', 'MasterIA2025!');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  
  // Create 10 automations via API in parallel
  const promises = Array.from({ length: 10 }, (_, i) => 
    page.request.post('http://localhost:5000/api/v1/automations', {
      data: {
        name: `Load Test Automation ${i + 1}`,
        triggerEvent: i % 2 === 0 ? 'webhook_order_approved' : 'webhook_pix_created',
        conditions: [],
        actions: [{
          type: 'send_message',
          value: `Test message ${i + 1} - {{customer_name}}`
        }],
        connectionIds: []
      }
    })
  );
  
  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;
  
  // Verify all succeeded
  const successCount = results.filter(r => r.ok()).length;
  expect(successCount).toBe(10);
  
  console.log(`✅ LOAD TEST PASSED: ${10} automations created in ${duration}ms (${(duration/10).toFixed(0)}ms each)`);
  
  if (duration > 5000) {
    console.warn(`⚠️ PERFORMANCE ALERT: ${duration}ms is slower than expected (<5s target)`);
  }
});

test('Performance: API response time for webhook trigger', async ({ page }) => {
  const startTime = Date.now();
  
  const response = await page.request.post('http://localhost:5000/api/v1/webhooks/trigger', {
    data: {
      eventType: 'webhook_order_approved',
      webhookData: {
        customer: { name: 'João Silva', phone: '5511999999999', email: 'joao@test.com' },
        order: { id: 'ORD-123', value: 497.00 },
        product: { name: 'Produto Teste' }
      }
    }
  });
  
  const duration = Date.now() - startTime;
  
  console.log(`✅ WEBHOOK RESPONSE TIME: ${duration}ms`);
  expect(duration).toBeLessThan(2000); // Should respond in <2s
});
