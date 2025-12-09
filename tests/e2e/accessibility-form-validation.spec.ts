import { test, expect } from '@playwright/test';

test.describe('BUG-A002: Form Validation (Zod)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'diegomaninhu@gmail.com');
    await page.fill('input[type="password"]', 'MasterIA2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 15000 });
  });

  test('Webhook API - should validate required fields (Zod)', async ({ _page, request }) => {
    const response = await request.post('/api/v1/webhooks', {
      data: {
        name: '',
        url: 'invalid-url',
        eventTriggers: []
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(400);
    
    const body = await response.json();
    expect(body.error || body.message).toBeTruthy();
    
    console.log('✅ SUCCESS: API validou campos obrigatórios com Zod');
    console.log('Erro retornado:', body.error || body.message);
  });

  test('Contact API - should validate phone format (Zod)', async ({ _page, request }) => {
    const response = await request.post('/api/v1/contacts', {
      data: {
        name: 'Test Contact',
        phone: '123',
        email: 'not-an-email'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(400);
    
    const body = await response.json();
    expect(body.error || body.message).toBeTruthy();
    
    console.log('✅ SUCCESS: API validou formato de telefone/email com Zod');
  });

  test('Campaign API - should validate required connection (Zod)', async ({ _page, request }) => {
    const response = await request.post('/api/v1/campaigns/whatsapp', {
      data: {
        connectionId: '',
        templateId: '',
        contactListId: ''
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(400);
    
    const body = await response.json();
    expect(body.error || body.message).toBeTruthy();
    
    console.log('✅ SUCCESS: API validou campos obrigatórios de campanha com Zod');
  });

  test('Automation API - should validate rule structure (Zod)', async ({ _page, request }) => {
    const response = await request.post('/api/v1/automations', {
      data: {
        name: '',
        triggerEvent: '',
        conditions: [],
        actions: []
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(400);
    
    const body = await response.json();
    expect(body.error || body.message).toBeTruthy();
    
    console.log('✅ SUCCESS: API validou estrutura de automação com Zod');
  });

  test('Auth API - should validate email format (Zod)', async ({ request }) => {
    const response = await request.post('/api/v1/auth/register', {
      data: {
        email: 'not-an-email',
        password: '123',
        name: ''
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(400);
    
    const body = await response.json();
    expect(body.error || body.message).toBeTruthy();
    
    console.log('✅ SUCCESS: API de autenticação validou formato de email com Zod');
  });

  test('Tag API - should validate tag name (Zod)', async ({ _page, request }) => {
    const response = await request.post('/api/v1/tags', {
      data: {
        name: '',
        color: 'invalid-color'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(400);
    
    const body = await response.json();
    expect(body.error || body.message).toBeTruthy();
    
    console.log('✅ SUCCESS: API de tags validou campos com Zod');
  });
});
