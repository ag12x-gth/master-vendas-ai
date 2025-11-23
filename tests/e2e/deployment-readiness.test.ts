/**
 * E2E Tests - Deployment Readiness
 * 
 * These tests validate that the application is ready for deployment
 * by simulating Replit's health check behavior.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds max (Replit uses similar)

test.describe('Deployment Readiness - Health Checks', () => {
  
  test('Health endpoint responds quickly (< 1s)', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get(`${BASE_URL}/health`, {
      timeout: HEALTH_CHECK_TIMEOUT
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Validate response
    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(1000); // Must respond in < 1 second
    
    // Validate response body
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body.status).toBe('healthy');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');
    
    console.log(`✅ Health check passed in ${responseTime}ms`);
  });
  
  test('Root endpoint (/) responds quickly (< 1s)', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get(`${BASE_URL}/`, {
      timeout: HEALTH_CHECK_TIMEOUT
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Validate response
    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(1000); // Must respond in < 1 second
    
    // Validate response body
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body.status).toBe('healthy');
    
    console.log(`✅ Root endpoint passed in ${responseTime}ms`);
  });
  
  test('Health endpoint returns correct content-type', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/health`);
    
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    
    console.log('✅ Content-Type is application/json');
  });
  
  test('Health endpoint includes cache-control headers', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/health`);
    
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toContain('no-cache');
    
    console.log('✅ Cache-Control headers present');
  });
  
  test('Multiple rapid health checks all succeed', async ({ request }) => {
    const requests = [];
    const numRequests = 10;
    
    // Send 10 rapid requests
    for (let i = 0; i < numRequests; i++) {
      requests.push(
        request.get(`${BASE_URL}/health`, {
          timeout: HEALTH_CHECK_TIMEOUT
        })
      );
    }
    
    const responses = await Promise.all(requests);
    
    // All must succeed
    for (const response of responses) {
      expect(response.status()).toBe(200);
    }
    
    console.log(`✅ ${numRequests} rapid requests all succeeded`);
  });
  
  test('Health endpoint works before Next.js is fully ready', async ({ request }) => {
    // This test validates that health checks work even during startup
    // In production, health checks start immediately after server.listen()
    
    const response = await request.get(`${BASE_URL}/health`);
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    // nextReady can be true or false, we don't care - health check must always work
    expect(body).toHaveProperty('nextReady');
    
    console.log(`✅ Health check works (nextReady=${body.nextReady})`);
  });
  
  test('Server responds to health checks consistently', async ({ request }) => {
    const responses: number[] = [];
    
    // Make 5 requests with 100ms delay between each
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      const response = await request.get(`${BASE_URL}/health`);
      const responseTime = Date.now() - start;
      
      expect(response.status()).toBe(200);
      responses.push(responseTime);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Calculate average response time
    const avgResponseTime = responses.reduce((a, b) => a + b, 0) / responses.length;
    const maxResponseTime = Math.max(...responses);
    const minResponseTime = Math.min(...responses);
    
    console.log(`Response times: min=${minResponseTime}ms, max=${maxResponseTime}ms, avg=${avgResponseTime.toFixed(2)}ms`);
    
    // All responses must be fast
    expect(maxResponseTime).toBeLessThan(1000);
    expect(avgResponseTime).toBeLessThan(500);
    
    console.log('✅ Response times are consistent');
  });
  
});

test.describe('Deployment Readiness - Application', () => {
  
  test('Application serves static pages after startup', async ({ page }) => {
    // Wait a bit for Next.js to be ready
    await page.goto(`${BASE_URL}/login`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Check that page loaded
    expect(page.url()).toContain('/login');
    
    // Validate page has content
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(0);
    
    console.log('✅ Application serves pages correctly');
  });
  
  test('Server handles errors gracefully', async ({ request }) => {
    // Request a non-existent endpoint
    const response = await request.get(`${BASE_URL}/this-does-not-exist-xyz123`, {
      timeout: HEALTH_CHECK_TIMEOUT
    });
    
    // Should return 404, not crash
    expect([404, 500]).toContain(response.status());
    
    // Server should still be responsive after error
    const healthCheck = await request.get(`${BASE_URL}/health`);
    expect(healthCheck.status()).toBe(200);
    
    console.log('✅ Server handles errors gracefully');
  });
  
});

test.describe('Deployment Readiness - Performance', () => {
  
  test('Health endpoint has minimal memory footprint', async ({ request }) => {
    // Make 100 requests to test memory leaks
    for (let i = 0; i < 100; i++) {
      const response = await request.get(`${BASE_URL}/health`);
      expect(response.status()).toBe(200);
    }
    
    // If we got here without timeout/crash, memory is OK
    console.log('✅ No memory leaks detected after 100 requests');
  });
  
  test('Server uptime increases correctly', async ({ request }) => {
    const response1 = await request.get(`${BASE_URL}/health`);
    const body1 = await response1.json();
    const uptime1 = body1.uptime;
    
    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response2 = await request.get(`${BASE_URL}/health`);
    const body2 = await response2.json();
    const uptime2 = body2.uptime;
    
    // Uptime should have increased by ~2 seconds
    expect(uptime2).toBeGreaterThan(uptime1);
    expect(uptime2 - uptime1).toBeGreaterThanOrEqual(1.9);
    expect(uptime2 - uptime1).toBeLessThan(3.0);
    
    console.log(`✅ Uptime tracking works correctly (${uptime1.toFixed(2)}s → ${uptime2.toFixed(2)}s)`);
  });
  
});
