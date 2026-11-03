import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test('landscape filters stay above the right-hand list through scrolling and rotation', async ({ page, context, baseURL }, info) => {
  test.skip(info.project.name === 'desktop', 'Touch viewport matrix.');
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/map');
  const sheet = page.locator('[data-map-sheet]');
  const content = page.locator('[data-sheet-content]');
  const filters = page.locator('[data-filter-chip-row]');
  await expect(page.locator('[data-list-row]').first()).toBeVisible();
  for (const viewport of [{ width: 667, height: 375 }, { width: 767, height: 390 }, { width: 768, height: 390 }, { width: 844, height: 390 }, { width: 667, height: 375 }]) {
    await page.setViewportSize(viewport);
    for (const scrollTop of [0, 500]) {
      await content.evaluate((el, top) => { el.scrollTop = top; }, scrollTop);
      await expect.poll(async () => {
        const row = (await filters.boundingBox())!;
        const panel = (await sheet.boundingBox())!;
        const list = (await content.boundingBox())!;
        return row.y >= panel.y && row.y + row.height <= list.y + 1;
      }, { message: `Filters must not cover the list at ${viewport.width}px, scroll ${scrollTop}` }).toBe(true);
    }
    await page.screenshot({ path: `/tmp/eat-this-map-landscape/rail-${viewport.width}.png` });
    await page.setViewportSize({ width: 390, height: 844 });
  }
});
