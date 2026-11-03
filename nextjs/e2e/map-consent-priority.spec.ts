import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test('cookie choice precedes WebGL and then releases the requested spot', async ({ page }) => {
  await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
  await page.goto('/map?r=engelbecken');
  await expect(page.getByRole('dialog', { name: 'Cookies', exact: true })).toBeVisible();
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
  const hasMapStyles = () => page.evaluate(() =>
    Array.from(document.styleSheets).some(sheet => {
      if (sheet.href && new URL(sheet.href).origin !== location.origin) return false;
      return Array.from(sheet.cssRules).some(rule => rule.cssText.includes('.maplibregl-map'));
    })
  );
  expect(await hasMapStyles()).toBe(false);
  await page.screenshot({ path: `/tmp/eat-this-consent-before-choice-${test.info().project.name}.png` });
  await page.getByRole('button', { name: 'Ablehnen', exact: true }).click();
  await expect(page.locator('#cookieConsent')).toHaveCount(0);
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await expect.poll(hasMapStyles).toBe(true);
  await expect(page.locator('.maplibregl-canvas')).toHaveCSS('position', 'absolute');
  await expect(page.getByRole('dialog', { name: 'Engelbecken', exact: true })).toBeVisible();
});

for (const theme of ['light', 'dark']) {
  test(`open label has readable backing without tape imagery (${theme})`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.addInitScript(theme => localStorage.setItem('et-theme', theme), theme);
    await page.clock.setFixedTime(new Date('2026-11-02T12:00:00Z'));
    await page.goto('/map');
    const label = page.locator('.et-label-open.et-label-tape').first();
    await expect(label).toBeAttached();
    await label.scrollIntoViewIfNeeded();
    await expect(label).toHaveCSS('color', theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)');
    await expect(label).toHaveCSS('background-color', theme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    await page.screenshot({ path: `/tmp/eat-this-label-${theme}-${test.info().project.name}.png` });
    await label.evaluate(el => { (el as HTMLElement).style.borderImageSource = 'none'; });
    await expect(label).toHaveCSS('background-color', theme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    await page.screenshot({ path: `/tmp/eat-this-label-fallback-${theme}-${test.info().project.name}.png` });
  });
}

test('server-rendered photos prioritize the visible phone rows without delaying desktop rows', async ({ page, isMobile }) => {
  let release!: () => void;
  const scriptsReady = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/_next/static/**/*.js', async route => {
    await scriptsReady;
    await route.continue();
  });
  await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
  await page.goto('/map', { waitUntil: 'commit' });
  const rows = page.locator('[data-list-row]');
  const first = rows.first().locator('[class*="rcardPhotos"] img').first();
  const third = rows.nth(2).locator('[class*="rcardPhotos"] picture img').first();
  const fourth = rows.nth(3).locator('[class*="rcardPhotos"] picture img').first();
  const loaded = (image: typeof first) => image.evaluate(element => (element as HTMLImageElement).naturalWidth > 1);
  await expect.poll(() => loaded(first)).toBe(true);
  await third.scrollIntoViewIfNeeded();
  await expect.poll(() => loaded(third)).toBe(true);
  if (isMobile) {
    await expect.poll(() => fourth.evaluate(element => (element as HTMLImageElement).currentSrc)).toContain('data:image/gif');
  } else {
    await expect.poll(() => loaded(fourth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Ablehnen', exact: true }).click();
  release();
  await expect(page.locator('#cookieConsent')).toHaveCount(0);
  await expect.poll(() => loaded(fourth)).toBe(true);
});


test('list photos remain available without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, extraHTTPHeaders: { DNT: '1' } });
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/map`);
    const photo = page.locator('[data-list-row]').nth(4).locator('noscript img').first();
    await photo.scrollIntoViewIfNeeded();
    await expect.poll(() => photo.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(1);
    await expect(photo).toBeInViewport();
    await page.screenshot({ path: `/tmp/eat-this-no-js-photos-${test.info().project.name}.png` });
  } finally {
    await context.close();
  }
});
