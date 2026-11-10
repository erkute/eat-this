import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ context, page, baseURL }) => {
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
  await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
});

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`phone screens wait for their section and remain usable (${reducedMotion})`, async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 823 });
    await page.emulateMedia({ reducedMotion });
    const requests: string[] = [];
    const fullPhotos: string[] = [];
    const errors: string[] = [];
    page.on('request', request => {
      if (/iphone-screen-[123]\.webp/.test(request.url())) requests.push(request.url());
      if (request.url().startsWith('https://cdn.sanity.io/images/') && Number(new URL(request.url()).searchParams.get('w')) > 320) fullPhotos.push(request.url());
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.locator('[data-hero-card]')).toHaveCount(3);
    await expect(async () => {
      if (await page.locator('#burgerBtn').getAttribute('aria-expanded') !== 'true') await page.locator('#burgerBtn').click();
      await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible({ timeout: 1000 });
    }).toPass();
    await page.keyboard.press('Escape');
    expect(requests).toEqual([]);
    expect(fullPhotos).toEqual([]);
    const section = page.locator('[data-hub-map-intro]');
    await section.locator('img').first().scrollIntoViewIfNeeded();
    await expect(section.locator('img')).toHaveCount(4);
    await expect.poll(() => section.locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    const button = section.getByRole('button', { name: 'Bar Basta im Detail', exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(section.locator('img[src*="iphone-screen-1"]')).toBeInViewport();
    expect(new Set(requests).size).toBe(3);
    const cover = page.locator('[data-hub-magazine] [data-progressive-image]').first();
    await cover.scrollIntoViewIfNeeded();
    await expect(cover).not.toHaveAttribute('data-preview-image');
    await expect.poll(() => cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 160)).toBe(true);
    expect(fullPhotos.length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
}

test('news keeps visible covers eager and loads later covers at low priority', async ({ page }) => {
  await page.goto('/news');
  const hero = page.locator('[data-current-issue] img').first();
  await expect(hero).toBeVisible();
  await expect(hero).toHaveAttribute('loading', 'eager');
  const later = page.locator('[data-recent-issues] img[loading="lazy"]').first();
  await later.scrollIntoViewIfNeeded();
  await expect.poll(() => later.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
});

test('later magazine photos remain visible without application JavaScript', async ({ page }) => {
  await page.route('**/_next/static/**/*.js', route => route.abort());
  await page.goto('/news');
  const photo = page.locator('[data-recent-issues] [data-progressive-image]').first();
  await photo.scrollIntoViewIfNeeded();
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(photo).toHaveAttribute('data-preview-image', '');
});
