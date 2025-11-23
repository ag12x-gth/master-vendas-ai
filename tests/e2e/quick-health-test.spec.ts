import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

test.describe('Quick Health Check', () => {
  test('health endpoint responds fast', async ({ request }) => {
    const start = Date.now();
    const response = await request.get(`${BASE_URL}/health`);
    const time = Date.now() - start;
    
    console.log(`Response time: ${time}ms`);
    expect(response.status()).toBe(200);
    expect(time).toBeLessThan(1000);
    
    const body = await response.json();
    console.log('Response:', JSON.stringify(body, null, 2));
    expect(body.status).toBe('healthy');
  });
  
  test('root endpoint works', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/`);
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.status).toBe('healthy');
  });
});
