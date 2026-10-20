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
    if (page.viewportSize()!.width < 768) {
      const choices = magazine.getByRole('group').getByRole('button');
      await choices.nth(2).click();
      await expect(choices.nth(2)).toHaveAttribute('aria-pressed','true');
    }
    const cover = magazine.locator('ol > li:visible > a').first();
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
    await figure.locator('..').scrollIntoViewIfNeeded();
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
