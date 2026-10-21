import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.route('**/api/consent', (route) => route.fulfill({ status: 204 }));
  await context.addCookies([
    { name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! },
  ]);
});

/* Remy hat keinen Knopf in der Ecke mehr (Ansage 21.10.2026). Der Weg zu ihm
   führt über „Frag Remy" im Menü — auf jeder Seite, auch nach dem Scrollen. */
for (const route of ['/', '/news', '/en/news']) {
  for (const reduced of [false, true]) {
    test(`${route}: Remy opens from the menu and closes (reduced motion: ${reduced})`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('html')).not.toHaveAttribute('data-hero-intro', '');
      await expect(page.locator('[data-buddy-launcher]')).toHaveCount(0);

      const en = route.startsWith('/en');
      await page.locator('[data-site-footer]').scrollIntoViewIfNeeded();
      await page.locator('#burgerBtn').click();
      const menu = page.getByRole('dialog', { name: 'Navigation' });
      await menu.getByRole('button', { name: en ? 'Ask Remy' : 'Frag Remy', exact: true }).click();
      await expect(menu).toBeHidden();

      const panel = page.locator('#buddy-panel');
      await expect(panel).toBeVisible();
      await panel.getByRole('button', { name: en ? 'Close' : 'Schließen', exact: true }).click();
      await expect(panel).toBeHidden();
      expect(errors).toEqual([]);
    });
  }
}
