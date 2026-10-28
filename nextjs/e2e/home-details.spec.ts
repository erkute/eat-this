import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
});

for (const reduced of [false, true]) {
  test(`homepage magazine opens its selected article (${reduced})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-hero-intro', '');
    const magazine = page.locator('[data-hub-magazine]');
    const cover = magazine.locator("ol > li[data-selected='true'] > a");
    if (page.viewportSize()!.width < 768) {
      // Am Telefon ein Stapel: das oberste Heft zur Seite wischen.
      await cover.scrollIntoViewIfNeeded();
      const first = await cover.getAttribute('href');
      const box = (await cover.boundingBox())!;
      await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.05, box.y + box.height / 2, { steps: 8 });
      await page.mouse.up();
      await expect(cover).not.toHaveAttribute('href', first!);
      await expect(page).toHaveURL(/\/$/);
    }
    const href = await cover.getAttribute('href');
    await cover.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator('h1')).toBeVisible();
  });
  test(`Remy enters and settles on the red surface (${reduced})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-hero-intro', '');
    const figure=page.locator('[data-hub-fragremy] [data-expression]');
    await page.locator('[data-hub-fragremy]').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await expect.poll(() => figure.locator('img').first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect.poll(()=>figure.evaluate(el=>getComputedStyle(el).transform)).toBe(reduced ? 'none' : 'matrix(1, 0, 0, 1, 0, 0)');
    await expect(page.getByRole('textbox', {name:'Deine Frage an Remy'})).toBeVisible();
  });
}
test('districts lead to their existing pages',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.getByRole('region',{name:'Berlin entdecken'}).getByRole('link',{name:'Mitte',exact:true}).click();
  await expect(page).toHaveURL(/\/bezirk\/mitte$/);
  await expect(page.locator('h1')).toBeVisible();
});
