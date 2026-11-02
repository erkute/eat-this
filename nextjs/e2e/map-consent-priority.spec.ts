import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test('cookie choice precedes WebGL and then releases the requested spot', async ({ page }) => {
  await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
  await page.goto('/map?r=engelbecken');
  await expect(page.getByRole('dialog', { name: 'Cookies', exact: true })).toBeVisible();
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
  await page.screenshot({ path: `/tmp/eat-this-consent-before-choice-${test.info().project.name}.png` });
  await page.getByRole('button', { name: 'Ablehnen', exact: true }).click();
  await expect(page.locator('#cookieConsent')).toHaveCount(0);
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Engelbecken', exact: true })).toBeVisible();
});

for (const theme of ['light', 'dark']) {
  test(`open label has readable backing without tape imagery (${theme})`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.addInitScript(theme => localStorage.setItem('et-theme', theme), theme);
    await page.clock.setFixedTime(new Date('2026-11-02T12:00:00Z'));
    await page.goto('/map');
    const label = page.locator('.et-label-open.et-label-tape').first();
    await expect(label).toBeAttached();
    await label.scrollIntoViewIfNeeded();
    await expect(label).toHaveCSS('color', theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)');
    await expect(label).toHaveCSS('background-color', theme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    await page.screenshot({ path: `/tmp/eat-this-label-${theme}-${test.info().project.name}.png` });
    await label.evaluate(el => { (el as HTMLElement).style.borderImageSource = 'none'; });
    await expect(label).toHaveCSS('background-color', theme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    await page.screenshot({ path: `/tmp/eat-this-label-fallback-${theme}-${test.info().project.name}.png` });
  });
}
