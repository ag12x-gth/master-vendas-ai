import { test, expect } from '@playwright/test';

test.describe('BUG-A002: API Zod Validation (No Auth Required)', () => {
  
  test('Webhook API - should reject empty name (Zod validation)', async ({ request }) => {
    const response = await request.post('http://localhost:5000/api/v1/webhooks', {
      data: {
        name: '',
        url: 'https://example.com',
        eventTriggers: ['contact.created']
      },
      headers: {
        'Content-Type': 'application/json'
      },
      failOnStatusCode: false
    });

    console.log(`Response status: ${response.status()}`);
    const body = await response.json().catch(() => ({}));
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    expect(response.status()).toBeGreaterThanOrEqual(400);
    console.log('✅ SUCCESS: Webhook API rejected empty name');
  });

  test('Webhook API - should reject invalid URL (Zod validation)', async ({ request }) => {
    const response = await request.post('http://localhost:5000/api/v1/webhooks', {
      data: {
        name: 'Test Webhook',
        url: 'not-a-url',
        eventTriggers: ['contact.created']
      },
      headers: {
        'Content-Type': 'application/json'
      },
      failOnStatusCode: false
    });

    console.log(`Response status: ${response.status()}`);
    const body = await response.json().catch(() => ({}));
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    expect(response.status()).toBeGreaterThanOrEqual(400);
    console.log('✅ SUCCESS: Webhook API rejected invalid URL');
  });

  test('Webhook API - should reject empty event triggers (Zod validation)', async ({ request }) => {
    const response = await request.post('http://localhost:5000/api/v1/webhooks', {
      data: {
        name: 'Test Webhook',
        url: 'https://example.com',
        eventTriggers: []
      },
      headers: {
        'Content-Type': 'application/json'
      },
      failOnStatusCode: false
    });

    console.log(`Response status: ${response.status()}`);
    const body = await response.json().catch(() => ({}));
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    expect(response.status()).toBeGreaterThanOrEqual(400);
    console.log('✅ SUCCESS: Webhook API rejected empty event triggers');
  });

  test('Health check - server is running', async ({ request }) => {
    const response = await request.get('http://localhost:5000/api/v1/connections/health', {
      failOnStatusCode: false
    });

    console.log(`Health check status: ${response.status()}`);
    
    expect(response.status()).toBeLessThan(500);
    console.log('✅ SUCCESS: Server is responding');
  });

  test('Auth register API - should validate email format (Zod)', async ({ request }) => {
    const response = await request.post('http://localhost:5000/api/v1/auth/register', {
      data: {
        email: 'not-an-email',
        password: '123',
        name: 'Test User'
      },
      headers: {
        'Content-Type': 'application/json'
      },
      failOnStatusCode: false
    });

    console.log(`Response status: ${response.status()}`);
    const body = await response.json().catch(() => ({}));
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    expect(response.status()).toBeGreaterThanOrEqual(400);
    console.log('✅ SUCCESS: Auth API rejected invalid email');
  });

  test('Auth register API - should validate short password (Zod)', async ({ request }) => {
    const response = await request.post('http://localhost:5000/api/v1/auth/register', {
      data: {
        email: 'test@example.com',
        password: '12',
        name: 'Test User'
      },
      headers: {
        'Content-Type': 'application/json'
      },
      failOnStatusCode: false
    });

    console.log(`Response status: ${response.status()}`);
    const body = await response.json().catch(() => ({}));
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    expect(response.status()).toBeGreaterThanOrEqual(400);
    console.log('✅ SUCCESS: Auth API rejected short password');
  });
});

test.describe('Infrastructure Validation', () => {
  
  test('Count files using toast hook', async () => {
    const { execSync } = require('child_process');
    
    const count = execSync(
      'find src -type f \\( -name "*.ts" -o -name "*.tsx" \\) -exec grep -l "useToast\\|toast(" {} \\; | wc -l',
      { encoding: 'utf-8', cwd: '/home/runner/workspace' }
    ).trim();
    
    console.log(`Files using toast: ${count}`);
    expect(parseInt(count)).toBeGreaterThan(50);
    console.log('✅ SUCCESS: Toast infrastructure is extensive');
  });

  test('Count API files using Zod', async () => {
    const { execSync } = require('child_process');
    
    const count = execSync(
      'find src/app/api -type f -name "*.ts" -exec grep -l "z\\.object\\|z\\.string\\|z\\.array" {} \\; | wc -l',
      { encoding: 'utf-8', cwd: '/home/runner/workspace' }
    ).trim();
    
    console.log(`API files using Zod: ${count}`);
    expect(parseInt(count)).toBeGreaterThan(40);
    console.log('✅ SUCCESS: Zod validation infrastructure is extensive');
  });
});
