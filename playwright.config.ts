import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3003',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'iPhone 15',
      use: { ...devices['iPhone 15'], browserName: 'chromium' },
    },
    {
      name: 'Pixel 7',
      use: { ...devices['Pixel 7'] },
    },
  ],
});