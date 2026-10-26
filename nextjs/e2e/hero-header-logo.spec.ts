import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`header logo appears after the hero logo leaves (${reducedMotion})`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.emulateMedia({ reducedMotion });
    await page.goto('/');
    const mark = page.locator('[data-hero-mark]');
    const navMark = page.locator('[data-nav-logo] img');
    await expect(mark).toBeVisible();
    await expect(navMark).toBeHidden();
    await page.evaluate(() => {
      const mark = document.querySelector('[data-hero-mark]');
      const distance = (mark?.getBoundingClientRect().bottom ?? 460) + 24;
      const el = document.querySelector('.app-pages');
      if (el && el.scrollHeight > el.clientHeight + 1) el.scrollBy(0, distance);
      else window.scrollBy(0, distance);
    });
    await expect(navMark).toBeVisible();
    await expect(mark).toHaveCSS('visibility', 'visible');
    await page.evaluate(() => {
      document.querySelector('.app-pages')?.scrollTo(0, 0);
      window.scrollTo(0, 0);
    });
    await expect(navMark).toBeHidden();
    await expect(mark).toBeVisible();
  });
}
