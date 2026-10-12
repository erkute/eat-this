import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.route('**/api/consent', (route) => route.fulfill({ status: 204 }));
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
});

for (const locale of ['de', 'en'] as const) {
  for (const reduced of [false, true]) {
    test(`map detail opens its magazine (${locale}, reduced motion ${reduced})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
      await page.goto(`${locale === 'en' ? '/en' : ''}/map?r=material&cat=coffee`);
      const heading = locale === 'de' ? 'Im Magazin' : 'In the magazine';
      const section = page.getByRole('region', { name: heading, exact: true });
      await section.scrollIntoViewIfNeeded();
      const links = section.locator('a');
      expect(await links.count()).toBeGreaterThan(0);
      await expect(section.locator('[data-magazine-cover]')).toHaveCount(await links.count());
      await expect(section.locator('[data-magazine-cover]').first()).toBeVisible();
      await expect(section.locator('[data-magazine-cover]').first()).toHaveAttribute('data-cover-issue', /^\d+$/);
      expect(await section.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      const axe = await new AxeBuilder({ page }).include(`section[aria-label="${heading}"]`)
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(axe.violations.map(({ id }) => id)).toEqual([]);
      const href = await links.first().getAttribute('href');
      await links.first().click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await expect(page.locator('h1')).toBeVisible();
    });
  }
}
