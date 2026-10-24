import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

for (const prefix of ['', '/en']) {
  test(`streamed 404 preserves the saved dark theme (${prefix || 'DE'})`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.addInitScript(() => localStorage.setItem('et-theme', 'dark'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${prefix}/news`);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const response = await page.goto(`${prefix}/release-theme-check-missing`);
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const colors = await page.locator('main').evaluate(el => ({
      page: getComputedStyle(el).backgroundColor,
      canvas: getComputedStyle(document.documentElement).backgroundColor,
    }));
    expect(colors.page).toBe(colors.canvas);
    expect(colors.page).not.toBe('rgb(255, 255, 255)');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
}
