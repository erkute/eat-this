import { expect, test } from '@playwright/test';

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
for (const delayed of [false, true]) {
  test(`rapid consent details and decline stay stable (delayed hydration: ${delayed}, motion: ${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let release!: () => void;
    const ready = new Promise<void>(resolve => { release = resolve; });
    if (delayed) await page.route('**/_next/static/**/*.js', async route => {
      await ready;
      await route.continue();
    });
    let receipts = 0;
    await page.route('**/api/consent', route => { receipts++; return route.fulfill({ status: 204 }); });
    await page.goto('/en/bezirk/charlottenburg', { waitUntil: 'commit' });
    await expect(page.locator('#cookieInfoTrigger')).toBeVisible();
    if (!delayed) await expect(page.locator('html')).not.toHaveAttribute('data-consent-pending');
    // Replay the rapid details/decline sequence from JAVASCRIPT-AN, including double taps.
    await page.locator('#cookieInfoTrigger').click();
    await page.evaluate(() => {
      document.getElementById('cookieDecline')?.click();
      document.getElementById('cookieDecline')?.click();
    });
    release();
    await expect(page.locator('#cookieConsent')).toBeHidden();
    await expect(page.locator('h1')).toBeVisible();
    expect(errors).toEqual([]);
    expect(receipts).toBe(1);
  });
}
}
