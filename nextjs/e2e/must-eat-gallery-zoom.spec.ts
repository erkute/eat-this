import { expect, test, type Locator } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

for (const locale of ['de', 'en'] as const) {
  test(`catalogue cards zoom before opening their map spot (${locale})`, async ({ page, context, baseURL, isMobile }) => {
    const prefix = locale === 'en' ? '/en' : '';
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
    await page.emulateMedia({ reducedMotion: locale === 'en' ? 'reduce' : 'no-preference' });
    await page.goto(`${prefix}/must-eats`);
    const catalogueUrl = page.url();
    const zoom = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: locale === 'de' ? 'Großansicht schließen' : 'Close enlarged view', exact: true }) });
    const tap = async (card: Locator) => {
      await card.scrollIntoViewIfNeeded();
      await card.focus();
      await card.evaluate(element => element.addEventListener('pointerdown', () => {
        element.setAttribute('data-test-pressed-opacity', getComputedStyle(element).opacity);
      }, { once: true }));
      if (isMobile) await card.tap();
      else await card.click();
      await expect(card).toHaveAttribute('data-test-pressed-opacity', '1');
      await expect(page).toHaveURL(catalogueUrl);
      await expect(zoom).toBeVisible();
    };

    for (const card of [page.locator('button[data-face="up"]').first(), page.locator('figure[data-count] button').last()]) {
      await tap(card);
      await expect(zoom.getByRole('link', { name: locale === 'de' ? 'Zum Spot' : 'View spot', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(zoom).toHaveCount(0);
      await expect(card).toBeFocused();
    }

    const set = page.locator('[data-band="set"] ol');
    const firstHidden = await set.locator('li').evaluateAll(items => items.findIndex(item => getComputedStyle(item).display === 'none'));
    if (firstHidden >= 0) {
      await page.getByRole('button', { name: locale === 'de' ? 'Alle Karten anzeigen' : 'Show all cards', exact: true }).click();
      await expect(set.locator('li').nth(firstHidden).getByRole('button')).toBeFocused();
    }

    await tap(page.locator('button[data-face="down"]').first());
    const dialog = zoom;
    const action = dialog.getByRole('link', { name: locale === 'de' ? 'Zum Spot' : 'View spot', exact: true });
    const href = (await action.getAttribute('href'))!;
    expect(href).toMatch(new RegExp(`^${prefix}/map\\?(r|me)=`));
    await action.click();
    await expect(page).toHaveURL(new URL(href, baseURL).href);
    await expect(page.locator('[data-detail-root]').first()).toBeVisible();
    await expect(dialog).toHaveCount(0);
  });
}
