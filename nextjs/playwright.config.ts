import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  outputDir: '/tmp/eat-this-playwright-results',
  reporter: [['list']],
  use: {
    baseURL,
    extraHTTPHeaders: { DNT: '1' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    {
      name: 'mobile-safari',
      testMatch: ['checkout-theme.spec.ts', 'loading-priority.spec.ts', 'cookie-dom-resilience.spec.ts', 'private-musteat-images.spec.ts', 'sentry-regressions.spec.ts', 'iphone-landscape-regressions.spec.ts', 'magazine-archive.spec.ts', 'home-device-layout.spec.ts', 'landscape-pages.spec.ts', 'landscape-spot.spec.ts', 'map-landscape-rail.spec.ts', 'home-landscape-musteats.spec.ts', 'must-eat-gallery-zoom.spec.ts', 'touch-feedback.spec.ts', 'remy-menu.spec.ts', 'home-scroll-motion.spec.ts', 'cookie-first-paint.spec.ts', 'login-viewport.spec.ts', 'login-window.spec.ts', 'home-faq.spec.ts'],
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run start:verify',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 60_000,
      },
});
