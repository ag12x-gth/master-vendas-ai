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
  
  test('root endpoint serves Next.js (not health JSON)', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/`, {
      maxRedirects: 0
    });
    
    const status = response.status();
    console.log(`Root endpoint: HTTP ${status}`);
    
    // Should be redirect or HTML page (not JSON health response)
    expect([200, 307, 308]).toContain(status);
    
    // If it's a redirect, we're good (Next.js is serving)
    if (status === 307 || status === 308) {
      const location = response.headers()['location'] || '';
      console.log(`✅ Next.js redirecting to: ${location}`);
      expect(location.length).toBeGreaterThan(0);
    } else {
      // If 200, should be HTML not JSON
      const contentType = response.headers()['content-type'] || '';
      expect(contentType).toContain('text/html');
      console.log(`✅ Next.js serving HTML - Content-Type: ${contentType}`);
    }
  });
});
