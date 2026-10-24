import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

for (const theme of ['light', 'dark']) {
  test(`map actions stay free of frames (${theme})`, async ({ page, context, baseURL, isMobile }, info) => {
    const english = theme === 'dark';
    const prefix = english ? '/en' : '';
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
    await page.addInitScript(value => {
      localStorage.setItem('mustEatsOnboardingSeen', '1');
      localStorage.setItem('et-theme', value);
    }, theme);
    await page.emulateMedia({ reducedMotion: english ? 'reduce' : 'no-preference' });
    await page.goto(`${prefix}/map?me=mustead-main-1`, { waitUntil: 'domcontentloaded' });
    const detail = page.locator('[data-detail-root="must-eat"]');
    const how = detail.getByRole('button', { name: english ? /How does it work/ : /Wie funktioniert/ });
    if (!isMobile) await how.hover();
    await expect(how).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(how).toHaveCSS('box-shadow', 'none');
    await page.keyboard.press('Tab');
    await how.focus();
    await expect(how).toHaveCSS('outline-style', 'none');
    await expect(how).toHaveCSS('font-weight', '900');
    await how.click();
    await page.getByRole('button', { name: english ? 'Skip' : 'Überspringen', exact: true }).click();
    await expect(how).toBeFocused();

    const restaurant = detail.getByRole('button', { name: new RegExp(`^${english ? 'To the spot' : 'Zum Spot'}:`) });
    if (!isMobile) await restaurant.hover();
    await expect(restaurant).toHaveCSS('box-shadow', 'none');
    await page.keyboard.press('Tab');
    await restaurant.focus();
    await expect(restaurant).toHaveCSS('outline-style', 'none');
    const close = detail.getByRole('button', { name: english ? 'To the spot' : 'Zum Spot', exact: true });
    await close.focus();
    await expect(close).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(close).toHaveCSS('background-image', 'none');
    await expect(close).toHaveCSS('outline-style', 'none');
    await page.screenshot({ path: `/tmp/eat-this-map-hover/detail-${info.project.name}-${theme}.png` });

    await page.goto(`${prefix}/map`, { waitUntil: 'domcontentloaded' });
    await page.locator('.maplibregl-marker').first().waitFor({ state: 'visible' });
    const search = page.getByRole('searchbox', { name: english ? 'Search' : 'Suche', exact: true });
    await search.click();
    await expect(search).toBeFocused();
    const toolbar = search.locator('..');
    await expect(toolbar).toHaveCSS('outline-style', 'none');
    await expect(toolbar).toHaveCSS('box-shadow', 'none');

    await page.goto(`${prefix}/map?r=gazzo`, { waitUntil: 'domcontentloaded' });
    const cta = page.locator('[data-detail-root="restaurant"]').getByRole('button', { name: english ? 'Sign up' : 'Anmelden', exact: true });
    if (!isMobile) await cta.hover();
    else {
      await page.keyboard.press('Tab');
      await cta.focus();
    }
    await expect(cta).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(cta).toHaveCSS('color', 'rgb(21, 18, 14)');
  });
}
