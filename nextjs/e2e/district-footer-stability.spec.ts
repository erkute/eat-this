import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
});

test('footer reserves its logo space before the lazy image loads', async ({ page }) => {
  let releaseLogo!: () => void;
  const logoReady = new Promise<void>(resolve => { releaseLogo = resolve; });
  await page.route('**/_next/image?*', async route => {
    if (route.request().url().includes('wordmark')) await logoReady;
    await route.continue();
  });
  try {
    await page.goto('/bezirk/schoeneberg', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    const footer = page.locator('[data-site-footer]');
    await footer.scrollIntoViewIfNeeded();
    const before = await footer.boundingBox();
    const logo = footer.locator('img');
    expect((await logo.boundingBox())!.height).toBeGreaterThan(50);
    releaseLogo();
    await expect.poll(() => logo.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect((await footer.boundingBox())!.height).toBeCloseTo(before!.height, 1);
  } finally {
    releaseLogo();
  }
});

test('Berlin overview keeps footer position when the mobile browser bar changes height', async ({ page, context, isMobile, browserName }) => {
  test.skip(!isMobile || browserName !== 'chromium', 'Chromium CDP simulates browser toolbar height.');
  const session = await context.newCDPSession(page);
  await page.goto('/bezirk', { waitUntil: 'domcontentloaded' });
  await session.send('Emulation.setSmallViewportHeightDifferenceOverride', { difference: 100 });
  const footer = page.locator('[data-site-footer]');
  await footer.scrollIntoViewIfNeeded();
  const documentTop = () => footer.evaluate(node => node.getBoundingClientRect().top + scrollY);
  const before = await documentTop();
  const viewport = page.viewportSize()!;
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width, height: viewport.height - 100,
    screenWidth: viewport.width, screenHeight: viewport.height,
    deviceScaleFactor: 1, mobile: true,
  });
  await session.send('Emulation.setSmallViewportHeightDifferenceOverride', { difference: 0 });
  expect(await documentTop()).toBeCloseTo(before, 1);
  expect(await footer.evaluate(node => Math.abs(node.getBoundingClientRect().top - node.previousElementSibling!.getBoundingClientRect().bottom))).toBeLessThan(1);
});
