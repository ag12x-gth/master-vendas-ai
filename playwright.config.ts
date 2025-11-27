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
    headless: process.env.HEADED ? false : true,
    launchOptions: {
      executablePath: '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    },
  },
  projects: [
    {
      name: 'desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
});
