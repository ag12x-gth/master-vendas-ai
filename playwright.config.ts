import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: '/tmp/playwright-report', open: 'never' }],
    ['json', { outputFile: '/tmp/e2e-screenshots/test-results.json' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
});
