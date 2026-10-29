import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

for (const locale of ['de', 'en']) {
  test(`signup fits mobile without scrolling (${locale})`, async ({ page, context, baseURL }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
    await page.goto(locale === 'de' ? '/about' : '/en/about');
    await page.locator('#burgerBtn').click();
    await page.getByRole('dialog', { name: 'Navigation', exact: true }).getByRole('button', { name: locale === 'de' ? 'Anmelden' : 'Sign in', exact: true }).click();
    const dialog = page.getByRole('dialog').filter({ has: page.getByRole('textbox') });
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    for (const [width, height] of [[390, 844], [390, 740], [390, 710], [375, 667], [320, 568]]) {
      await page.setViewportSize({ width, height });
      await expect.poll(() => dialog.evaluate(el => el.scrollHeight - el.clientHeight), { message: `${width}×${height} must not need scrolling` }).toBeLessThanOrEqual(1);
      await expect(dialog.locator('button[type="submit"]')).toBeInViewport({ ratio: 1 });
      await expect(dialog.getByRole('link').last()).toBeInViewport({ ratio: 1 });
      await page.screenshot({ path: `/tmp/eat-this-signup-fit-${locale}-${width}-${height}.png` });
    }
  });
}
