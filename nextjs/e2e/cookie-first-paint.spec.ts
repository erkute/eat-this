import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test('unanswered cookie question is visible before application JavaScript', async ({ page }) => {
  await page.route('**/_next/static/**/*.js', (route) => route.abort());
  await page.goto('/map', { waitUntil: 'domcontentloaded' });
  const dialog = page.getByRole('dialog', { name: 'Cookies', exact: true });
  await expect(dialog).toBeVisible({ timeout: 2500 });
  await expect(dialog.getByRole('button', { name: 'Akzeptieren', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Ablehnen', exact: true })).toBeVisible();
  await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0);
});

for (const choice of ['accepted', 'declined']) {
  test(`${choice} answer never flashes a question before hydration`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'cookieConsent', value: `${choice}.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.route('**/_next/static/**/*.js', (route) => route.abort());
    await page.goto('/map', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#cookieConsent')).not.toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-consent-pending');
  });
}

for (const [choice, label] of [['accepted', 'Akzeptieren'], ['declined', 'Ablehnen']]) {
  test(`an early ${choice} click survives delayed application JavaScript`, async ({ page, context }) => {
    let release!: () => void;
    const scriptsReady = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/_next/static/**/*.js', async (route) => { await scriptsReady; await route.continue(); });
    let receipts = 0;
    await page.route('**/api/consent', (route) => { receipts++; return route.fulfill({ status: 204 }); });
    await page.route('**/www.googletagmanager.com/**', (route) => route.abort());
    await page.goto('/agb', { waitUntil: 'commit' });
    await page.getByRole('button', { name: label, exact: true }).click();
    expect(receipts).toBe(0);
    release();
    await expect.poll(async () => (await context.cookies()).find((c) => c.name === 'cookieConsent')?.value).toBe(`${choice}.${CONSENT_VERSION}`);
    await expect(page.locator('#cookieConsent')).toHaveCount(0);
    await expect.poll(() => receipts).toBe(1);
  });
}

test('the early visible question already contains focus and locks background scrolling', async ({ page }) => {
  await page.route('**/_next/static/**/*.js', (route) => route.abort());
  await page.goto('/agb', { waitUntil: 'domcontentloaded' });
  const dialog = page.locator('#cookieConsent');
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  const before = await page.evaluate(() => document.scrollingElement!.scrollTop);
  if (test.info().project.name === 'mobile-safari') {
    // Mobile WebKit does not expose mouse-wheel input. Check its native
    // touch lock directly; Chromium below also exercises a real touch drag.
    await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
    await expect(page.locator('.cookie-scrim')).toHaveCSS('touch-action', 'none');
    await page.touchscreen.tap(5, 100);
  } else if (test.info().project.name === 'mobile') {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 5, y: 600 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 5, y: 150 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(5, 100);
    await page.mouse.wheel(0, 700);
  }
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(before);
});

test('the initial question still waits for the home entrance', async ({ page }) => {
  await page.route('**/_next/static/**/*.js', (route) => route.abort());
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('html')).toHaveAttribute('data-hero-intro');
  await expect(page.locator('#cookieConsent')).toBeAttached();
  await expect(page.locator('#cookieConsent')).not.toBeVisible();
  await page.evaluate(() => document.documentElement.removeAttribute('data-hero-intro'));
  await expect(page.locator('html')).toHaveAttribute('data-hero-cards');
  await expect(page.locator('#cookieConsent')).not.toBeVisible();
  await expect(page.locator('#cookieConsent')).not.toBeFocused();
  await page.evaluate(() => document.documentElement.removeAttribute('data-hero-cards'));
  await expect(page.locator('#cookieConsent')).toBeVisible();
});

test('the English dark-mode question paints immediately with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('et-theme', 'dark'));
  await page.route('**/_next/static/**/*.js', (route) => route.abort());
  await page.goto('/en/map', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const dialog = page.locator('#cookieConsent');
  await expect(dialog.getByRole('button', { name: 'Accept', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Decline', exact: true })).toBeVisible();
  await page.screenshot({ path: `/tmp/eat-this-cookie-first-paint-${test.info().project.name}-en-dark.png` });
});

test('an outdated answer is asked again before application JavaScript', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cookieConsent', value: `accepted.${CONSENT_VERSION - 1}`, url: baseURL! }]);
  await page.route('**/_next/static/**/*.js', (route) => route.abort());
  await page.goto('/map', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#cookieConsent')).toBeVisible();
});


test('keeps forward and backward focus inside across hydration', async ({ page }) => {
  let release!: () => void;
  const scriptsReady = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/_next/static/**/*.js', async (route) => {
    await scriptsReady;
    await route.continue();
  });
  await page.goto('/agb', { waitUntil: 'commit' });
  const dialog = page.locator('#cookieConsent');
  await expect(dialog).toBeVisible();
  for (const hydrated of [false, true]) {
    if (hydrated) {
      release();
      await expect(page.locator('html')).not.toHaveAttribute('data-consent-pending');
    }
    for (const key of ['Tab', 'Shift+Tab']) {
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press(key);
        await expect.poll(() => dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
      }
    }
  }
});
