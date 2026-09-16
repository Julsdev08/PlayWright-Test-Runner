import { defineConfig, devices } from '@playwright/test';
import { testEnvironment } from './config/env';

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright', open: 'never' }],
    ['./framework/reporting/jam-failure-reporter.ts', {
      output: 'reports/qa/jam-failures.json',
      baseURL: testEnvironment.baseURL
    }]
  ],
  use: {
    baseURL: testEnvironment.baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'desktop-chromium',
      grepInvert: /@mobile/,
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile-chromium',
      grepInvert: /@desktop/,
      use: { ...devices['Pixel 5'] }
    }
  ]
});
