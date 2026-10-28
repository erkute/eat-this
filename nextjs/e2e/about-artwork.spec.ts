import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
});

for (const locale of ['de', 'en']) {
  test(`About artwork remains still and cards stay open with reduced motion (${locale})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(locale === 'de' ? '/about' : '/en/about');
    await expect(page.getByRole('heading', { name: locale === 'de' ? 'Über mich' : 'About me', exact: true })).toBeVisible();
    const portrait = page.locator('img[src*="founder-cutout"]');
    await expect(portrait).toBeVisible();
    await expect(portrait).toHaveCSS('transform', 'none');
    const heading = page.locator('h1');
    const size = await heading.evaluate(el => getComputedStyle(el).fontSize);
    for (const chapter of await page.locator('[data-about-chapter] h2').all()) await expect(chapter).toHaveCSS('font-size', size);
    if (page.viewportSize()!.width >= 768) {
      const copy = await heading.locator('..').boundingBox();
      expect((await portrait.boundingBox())!.x).toBeGreaterThan(copy!.x + copy!.width);
    }

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
    await page.getByRole('heading', { name: locale === 'de' ? 'Über mich' : 'About me', exact: true }).scrollIntoViewIfNeeded();
    await fan.scrollIntoViewIfNeeded();
    expect(await angles()).toEqual([-24, -12, 0, 12, 24]);
    await expect(portrait).toHaveCSS('transform', 'none');
    await expect(page.locator('figcaption')).toHaveCount(3);
    const caption = page.locator('figcaption').filter({ hasText: locale === 'de' ? 'Berliner Must Eats für deine Sammlung.' : 'Berlin Must Eats for your collection.' });
    await expect(caption).toHaveCSS('margin-top', '12px');
    if (page.viewportSize()!.width >= 768) expect((await cards.first().boundingBox())!.width).toBeGreaterThan(200);
  });
}
