import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

for (const [locale, path, decline] of [['de', '/', 'Ablehnen'], ['en', '/en', 'Decline']]) {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    test(`${locale}: cookie question follows the finished hero cards (${reducedMotion})`, async ({ page, context }) => {
      await page.emulateMedia({ reducedMotion });
      await page.route('**/api/consent', (route) => route.fulfill({ status: 204 }));
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      // Sample the first visible frame, including the pre-hydration dialog.
      // Waiting for the final cards after seeing the dialog would miss the bug.
      await page.addInitScript(() => {
        const sample = () => {
          const dialog = document.getElementById('cookieConsent');
          const cards = Array.from(document.querySelectorAll('[data-hero-card] > span'));
          if (dialog?.getClientRects().length && cards.length === 3) {
            (window as Window & { firstCookieFrame?: string[] }).firstCookieFrame = cards.map((card) => getComputedStyle(card).transform);
            return;
          }
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });

      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('h1')).toContainText('We tell you what to eat');
      await expect(page.locator('nextjs-portal').filter({ hasText: 'Runtime Error' })).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => (window as Window & { firstCookieFrame?: string[] }).firstCookieFrame)).toHaveLength(3);
      await page.screenshot({ path: `/tmp/eat-this-home-cookie-${test.info().project.name}-${locale}-${reducedMotion}.png` });
      const firstFrame = await page.evaluate(() => (window as Window & { firstCookieFrame?: string[] }).firstCookieFrame);
      expect(firstFrame, 'all card fronts must be fully revealed before the cookie question appears').toEqual(['none', 'none', 'none']);

      await page.getByRole('button', { name: decline, exact: true }).click();
      await expect(page.locator('#cookieConsent')).toHaveCount(0);
      expect((await context.cookies()).find((cookie) => cookie.name === 'cookieConsent')?.value).toBe(`declined.${CONSENT_VERSION}`);
      expect(errors).toEqual([]);
    });
  }
}
