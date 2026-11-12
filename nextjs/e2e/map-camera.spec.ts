import { expect, test } from '@playwright/test';

for (const english of [false, true]) {
  test(`map markers follow camera movement (${english ? 'EN' : 'DE'})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${english ? '/en' : ''}/map`, { waitUntil: 'domcontentloaded' });
    const canvas = page.locator('.maplibregl-canvas');
    const marker = page.locator('.maplibregl-marker').first();
    await expect(canvas).toBeVisible();
    await expect(marker).toBeVisible();
    // Public DOM and keyboard interaction catch wrapper regressions without
    // depending on MapLibre's private camera/transform implementation.
    const position = () => marker.evaluate(element => element.getBoundingClientRect().x);
    const before = await position();
    await canvas.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => Math.abs(await position() - before)).toBeGreaterThan(20);
    expect(errors).toEqual([]);
  });
}
