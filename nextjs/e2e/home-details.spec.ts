import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.route('**/api/consent', (route) => route.fulfill({ status: 204 }));
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
});

for (const reduced of [false, true]) {
  test(`Remy starts offstage and returns without flashing (${reduced})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-hero-intro', '');
    const figure = page.locator('[data-hub-fragremy] [data-expression]');
    const isOffstage = () => figure.evaluate((element) => {
      const figure = element.getBoundingClientRect();
      const stage = element.parentElement!.parentElement!.getBoundingClientRect();
      return figure.left >= stage.right || figure.top >= stage.bottom;
    });
    expect(await isOffstage()).toBe(!reduced);
    for (let visit = 0; visit < 3; visit++) {
      await figure.locator('..').scrollIntoViewIfNeeded();
      await expect.poll(isOffstage).toBe(false);
      await expect.poll(() => figure.evaluate((element) => getComputedStyle(element).transform))
        .toBe(reduced ? 'none' : 'matrix(1, 0, 0, 1, 0, 0)');
      await page.locator('[data-hub-hero]').scrollIntoViewIfNeeded();
      await expect.poll(isOffstage).toBe(!reduced);
    }
  });

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

  test(`magazine caption follows the cover and footer returns to the top (${reduced})`, async ({ page, isMobile }) => {
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
    const more = magazine.getByRole('link', { name: 'Weitere Magazine', exact: true });
    if (!isMobile) {
      await more.hover();
      await expect.poll(() => more.evaluate((element) => getComputedStyle(element).backgroundColor))
        .toBe('rgb(255, 255, 255)');
      await expect.poll(() => more.evaluate((element) => {
        const style = getComputedStyle(element);
        return style.color !== style.backgroundColor;
      })).toBe(true);
    }
    await page.screenshot({ path: `/tmp/eat-this-magazine-refined-${test.info().project.name}-${reduced}.png` });
    const logo = page.getByRole('link', { name: 'Eat This — Zur Startseite', exact: true });
    const reload = page.waitForEvent('domcontentloaded');
    await logo.click();
    await reload;
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-site-footer]')).not.toBeInViewport();
    await expect(page.getByRole('heading', { name: 'We tell you what to eat', exact: true })).toBeInViewport();
  });
}

test('the signed-in hero shell keeps the map button clear of the profile', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Pointer hover belongs to the desktop layout.');
  // Exercise the real signed-in shell without creating or modifying an account.
  await page.addInitScript(() => localStorage.setItem('_authHint', JSON.stringify({ n: 'Test' })));
  await page.route('**/api/auth/premium-access', () => new Promise(() => {}));
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveAttribute('data-hero-intro', '');
  const button = page.locator('[data-hub-hero] [data-magnetic]:visible');
  const profile = page.locator('[data-hub-hero]').getByRole('link', { name: 'Dein Profil', exact: true });
  await expect(profile).toBeVisible();
  const box = (await button.boundingBox())!;
  for (const offset of [0, 10, 20, 40]) {
    await page.mouse.move(box.x + box.width + offset, box.y + box.height / 2);
    await expect.poll(() => button.evaluate((element) =>
      Math.abs(Number(getComputedStyle(element).getPropertyValue('--mx'))))).toBeLessThanOrEqual(6);
    expect((await profile.boundingBox())!.x - (await button.boundingBox())!.x - (await button.boundingBox())!.width).toBeGreaterThan(4);
  }
  await expect(page.locator('[data-hub-starter]')).toBeHidden();
  await page.locator('[data-site-footer]').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('[data-site-footer] img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.screenshot({ path: '/tmp/eat-this-signed-in-footer.png' });
});
