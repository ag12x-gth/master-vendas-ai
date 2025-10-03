import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../scenarios',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : parseInt(process.env.EKO_TEST_RETRIES || '2'),
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: '../artifacts/test-runs/latest/report-html' }],
    ['junit', { outputFile: '../artifacts/test-runs/latest/junit.xml' }],
    ['json', { outputFile: '../artifacts/test-runs/latest/results.json' }],
    ['list']
  ],
  
  use: {
    baseURL: process.env.APP_BASE_URL || 'http://localhost:5000',
    trace: (process.env.EKO_TEST_TRACE as 'on' | 'off' | 'retain-on-failure' | 'on-first-retry') || 'on-first-retry',
    video: (process.env.EKO_TEST_VIDEO as 'on' | 'off' | 'retain-on-failure' | 'on-first-retry') || 'on',
    screenshot: 'only-on-failure',
    actionTimeout: parseInt(process.env.EKO_TEST_TIMEOUT_MS || '30000'),
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
  ],

  webServer: {
    command: 'npm run dev:server',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  outputDir: '../artifacts/test-runs/latest/test-results',
});
