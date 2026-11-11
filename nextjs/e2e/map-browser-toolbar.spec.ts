import { expect, test, type Page } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

async function geometry(page: Page) {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)!.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    return {
      canvas: box('.maplibregl-canvas'),
      marker: box('.maplibregl-marker'),
      menu: box('[data-map-burger]'),
      scrollY: window.scrollY,
    };
  });
}

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`phone map stays anchored through browser-toolbar height changes (${reducedMotion})`, async ({ page, context, baseURL }, info) => {
    test.skip(info.project.name === 'desktop', 'Phone browser chrome.');
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.emulateMedia({ reducedMotion });
    // Emulated viewports report themselves as the screen. A phone's screen
    // keeps its full size while the browser toolbar shows and hides.
    await page.addInitScript(() => {
      const portrait = () => window.innerHeight >= window.innerWidth;
      Object.defineProperty(window.screen, 'width', { get: () => (portrait() ? 390 : 844) });
      Object.defineProperty(window.screen, 'height', { get: () => (portrait() ? 844 : 390) });
    });
    await page.setViewportSize({ width: 390, height: 760 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addLocatorHandler(page.getByRole('button', { name: 'Später', exact: true }), async () => {
      await page.getByRole('button', { name: 'Später', exact: true }).click();
    });
    await page.goto('/map');
    await expect(page.locator('.maplibregl-marker').first()).toBeVisible();
    await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'instant' }));
    await page.waitForTimeout(500);
    const initial = await geometry(page);
    // Some embedded browsers resize even lvh with their toolbar. Keep width
    // and scroll position constant while driving that same layout change.
    for (const height of [844, 760, 844, 760]) {
      await page.setViewportSize({ width: 390, height });
      await page.waitForTimeout(250);
      const current = await geometry(page);
      expect(current.canvas).toEqual(initial.canvas);
      expect(current.marker).toEqual(initial.marker);
      expect(current.menu).toEqual(initial.menu);
      expect(current.scrollY).toBe(initial.scrollY);
      expect(current.canvas.y + current.canvas.height).toBeGreaterThanOrEqual(height);
    }
    // A real width change must still resize the map, including rotation back.
    await page.setViewportSize({ width: 844, height: 390 });
    // Fractional device pixel ratios leave a sub-pixel remainder.
    await expect.poll(async () => Math.round((await geometry(page)).canvas.height)).toBe(390);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(async () => Math.round((await geometry(page)).canvas.width)).toBe(390);
    await page.waitForTimeout(250);
    const rotated = await geometry(page);
    await page.setViewportSize({ width: 390, height: 760 });
    await page.waitForTimeout(250);
    expect((await geometry(page)).canvas).toEqual(rotated.canvas);
    const search = page.locator('[data-map-body]').getByRole('button', { name: /such/i }).first();
    await expect(search).toBeVisible();
    await search.click();
    const input = page.getByRole('searchbox');
    await expect(input).toBeFocused();
    const beforeKeyboard = await geometry(page);
    await page.setViewportSize({ width: 390, height: 500 });
    await expect(input).toBeInViewport();
    await page.waitForTimeout(250);
    expect((await geometry(page)).canvas).toEqual(beforeKeyboard.canvas);
    await input.press('Enter');
    await page.setViewportSize({ width: 390, height: 760 });
    const row = page.locator('[data-list-row]').first();
    await row.getByRole('button').first().click();
    await expect(page.locator('[data-detail-root="restaurant"]')).toBeVisible();
    await page.waitForTimeout(600);
    const detail = await geometry(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    expect((await geometry(page)).canvas).toEqual(detail.canvas);
    expect((await geometry(page)).marker).toEqual(detail.marker);
    await page.goBack();
    await expect(page.locator('[data-detail-root="restaurant"]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('desktop map follows height changes', async ({ page, context, baseURL }, info) => {
  test.skip(info.project.name !== 'desktop', 'Desktop browser resize.');
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
  await page.goto('/map');
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  for (const width of [1440, 390]) {
    for (const height of [760, 900]) {
      await page.setViewportSize({ width, height });
      await expect.poll(() => page.locator('.maplibregl-canvas').evaluate(canvas => canvas.getBoundingClientRect().height))
        .toBe(height + (width < 768 ? 1 : 0));
    }
  }
});
