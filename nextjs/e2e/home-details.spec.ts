import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.route('**/api/consent', (route) => route.fulfill({ status: 204 }));
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
});

for (const reduced of [false, true]) {
  test(`map loader uses Providence and respects reduced motion (${reduced})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    let release!: () => void;
    const ready = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/basemap/style.json', async (route) => { await ready; await route.continue(); });
    await page.goto('/#hub-map');
    const preview = page.locator('[data-hub-map-preview]');
    await preview.getByRole('button', { name: 'Pizza', exact: true }).click();
    const loader = preview.locator('[data-map-loading]');
    await expect(loader).toBeVisible();
    await expect(loader).toHaveText('Berlin lädt …');
    expect(await loader.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('providence');
    const animation = await loader.locator('[data-loading-bar]').evaluate((el) => getComputedStyle(el).animationName);
    expect(animation === 'none').toBe(reduced);
    await page.screenshot({ path: `/tmp/eat-this-home-loader-${test.info().project.name}-${reduced}.png` });
    release();
    await expect(loader).toHaveCount(0);
    await expect(preview.getByRole('button', { name: 'Gazzo', exact: true })).toBeVisible();
  });

  test(`magazine caption follows the cover and footer returns to the top (${reduced})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-hero-intro', '');
    const magazine = page.locator('[data-hub-magazine]');
    const target = magazine.locator('[data-deck-index="2"] > a');
    const href = await target.getAttribute('href');
    await magazine.getByRole('button', { name: 'Story 3 von 6', exact: true }).click();
    const caption = magazine.locator('[data-magazine-caption]');
    await expect(caption.locator('a')).toHaveAttribute('href', href!);
    await expect(caption).toContainText('03 / 06');
    await expect(caption.locator('h3')).not.toBeEmpty();
    const logo = page.getByRole('link', { name: 'Eat This — Zur Startseite', exact: true });
    const reload = page.waitForEvent('domcontentloaded');
    await logo.click();
    await reload;
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-site-footer]')).not.toBeInViewport();
    await expect(page.getByRole('heading', { name: 'We tell you what to eat', exact: true })).toBeInViewport();
  });
}
