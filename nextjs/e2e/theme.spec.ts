import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
  await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
});

for (const en of [false, true]) {
  test(`shared theme survives map switching and reload (${en ? 'EN' : 'DE'})`, async ({ page }) => {
    await page.goto(en ? '/en/news' : '/news');
    await page.getByRole('button', { name: en ? 'Menu' : 'Menü', exact: true }).click();
    const menu = page.getByRole('dialog', { name: 'Navigation', exact: true });
    await menu.getByRole('button', { name: en ? 'Dark' : 'Dunkel', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await menu.getByRole('link', { name: 'Map', exact: true }).click();
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const canvas = await page.locator('.maplibregl-canvas').elementHandle();
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await menu.getByRole('button', { name: en ? 'Light' : 'Hell', exact: true }).click();
    await menu.getByRole('button', { name: en ? 'Close' : 'Schließen', exact: true }).click();
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
    expect(await canvas!.evaluate(el => el.isConnected)).toBe(true);
    await page.reload();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
  });
}

for (const route of ['/', '/news', '/news/gazzo-pizza-neukoelln', '/map?r=gazzo', '/kategorie/pizza', '/packs', '/must-eats', '/about', '/pack/pizza', '/contact', '/bezirk', '/restaurant/engelbecken']) {
  test(`dark contrast and layout: ${route}`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('et-theme', 'dark'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    if (route.startsWith('/map')) await expect(page.getByRole('dialog', { name: 'Gazzo', exact: true })).toBeVisible();
    else await expect(page.locator('h1')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))).toEqual([]);
    expect(await page.locator('body').evaluate(body => body.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `/tmp/eat-this-color-modes/${test.info().project.name}-dark-${route.replaceAll('/', '-').replaceAll('?', '_')}.png` });
  });
}

test('dark map guest login and cookie choice remain readable', async ({ page, context }) => {
  await page.addInitScript(() => {
    localStorage.setItem('et-theme', 'dark');
    // Beim ersten Besuch öffnen sich die Erklärfolien von selbst und decken die Karte ab.
    localStorage.setItem('mustEatsOnboardingSeen', '1');
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/map?r=gazzo');
  await page.getByRole('button', { name: 'Verdecktes Must Eat', exact: true }).click();
  // Der erste Tipp öffnet das Must-Eat-Detail, erst die Karte dort fragt nach dem Konto.
  await page.getByRole('img', { name: 'Verdeckt', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Schau drunter', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'E-Mail', exact: true })).toBeVisible();
  const check = async () => {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))).toEqual([]);
  };
  await check();
  await context.clearCookies();
  await page.goto('/news');
  const accept = page.getByRole('button', { name: 'Akzeptieren', exact: true });
  await expect(accept).toBeVisible();
  await accept.focus();
  await check();
  await page.getByRole('button', { name: 'Ablehnen', exact: true }).click();
  await expect(accept).toBeHidden();
});
