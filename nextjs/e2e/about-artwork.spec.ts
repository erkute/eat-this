import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
});

for (const locale of ['de', 'en']) {
  test(`About artwork remains still and cards stay open with reduced motion (${locale})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(locale === 'de' ? '/about' : '/en/about');
    await expect(page.getByRole('heading', { name: 'eat this.', exact: true })).toBeVisible();
    const portrait = page.locator('img[src*="founder-table-cartoon-final"]');
    await expect(portrait).toBeVisible();
    await expect(portrait).toHaveCSS('transform', 'none');

    const fan = page.locator('[data-about-fan]');
    const cards = fan.locator('img');
    await expect(cards).toHaveCount(5);
    await fan.scrollIntoViewIfNeeded();
    await expect.poll(() => cards.evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    const angles = () => cards.evaluateAll(images => images.map(image => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(image).transform);
      return Math.round(Math.atan2(matrix.b, matrix.a) * 180 / Math.PI);
    }));
    expect(await angles()).toEqual([-24, -12, 0, 12, 24]);
    await page.getByRole('heading', { name: 'eat this.', exact: true }).scrollIntoViewIfNeeded();
    await fan.scrollIntoViewIfNeeded();
    expect(await angles()).toEqual([-24, -12, 0, 12, 24]);
    await expect(portrait).toHaveCSS('transform', 'none');
    await expect(page.locator('figcaption')).toHaveCount(1);
  });
}
