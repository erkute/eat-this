import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

for (const locale of ['de', 'en'] as const) {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    test(`${locale} hero is open and usable before application JavaScript (${reducedMotion})`, async ({
      page,
      context,
      baseURL,
    }) => {
      await context.addCookies([
        { name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! },
      ]);
      await page.emulateMedia({ reducedMotion });
      await page.route('**/_next/static/**/*.js', (route) => route.abort());
      await page.goto(locale === 'de' ? '/' : '/en', { waitUntil: 'domcontentloaded' });
      const cards = page.locator('[data-hero-card]');
      const images = cards.locator('img');
      await expect(cards).toHaveCount(3);
      await expect(images).toHaveCount(3);
      for (const image of await images.all()) {
        await expect(image).toBeVisible();
        await expect(image).toHaveJSProperty('complete', true);
        expect(await image.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(
          0
        );
        await expect(image).toHaveCSS('transform', 'none');
      }
      await expect(images.first()).toHaveAttribute('fetchpriority', 'high');
      const spread = await cards.evaluateAll((nodes) => {
        const boxes = nodes.map((node) => node.getBoundingClientRect());
        return (
          (Math.max(...boxes.map((box) => box.x)) - Math.min(...boxes.map((box) => box.x))) /
          boxes[0].width
        );
      });
      expect(spread).toBeGreaterThan(1);
      const cta = page.locator('[data-hero-actions] .et-btn');
      await expect(cta).toBeVisible();
      await cta.click();
      await expect(page).toHaveURL(new RegExp(`${locale === 'en' ? '/en' : ''}/must-eats$`));
    });
  }
}
