import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: isCI ? 1 : 0,
  reporter: isCI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:3737',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx serve . -p 3737',
    url: 'http://localhost:3737',
    reuseExistingServer: !isCI,
    timeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
});
