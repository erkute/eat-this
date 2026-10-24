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
    // The streamed root and its background transition settle after the
    // preference attribute is restored; measure the finished canvas.
    await expect.poll(() => page.locator('main').evaluate(el => {
      const root = getComputedStyle(document.documentElement).backgroundColor;
      const canvas = root === 'rgba(0, 0, 0, 0)' ? getComputedStyle(document.body).backgroundColor : root;
      const ground = getComputedStyle(el).backgroundColor;
      return { same: ground === canvas, dark: ground !== 'rgb(255, 255, 255)' && ground !== 'rgba(0, 0, 0, 0)' };
    })).toEqual({ same: true, dark: true });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
}
