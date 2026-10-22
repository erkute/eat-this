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
      // Am Telefon fährt der Kopf beim Herunterscrollen weg und kommt beim
      // Hochscrollen zurück — wie ein Leser es tut.
      // Zwei Frames Abstand: ohne Bewegung springt die Seite, und beide
      // Sprünge im selben Frame läse der Kopf als einen nach unten.
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
      await page.evaluate(() => window.scrollBy(0, -160));
      // Erst klicken, wenn der Kopf ganz eingefahren ist — sonst scrollt der
      // Klick selbst und schickt ihn wieder weg.
      await expect(page.locator('#navbar')).toHaveAttribute('data-visibility', 'visible');
      await expect.poll(() => page.locator('#burgerBtn').evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
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
