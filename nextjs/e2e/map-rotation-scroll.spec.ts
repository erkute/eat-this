import { expect, test } from '@playwright/test';

test('list keeps native touch scrolling through repeated phone rotation', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'mobile', 'Chromium touch input across explicit phone sizes.');
  await page.goto('/map');
  await expect(page.locator('[data-list-row]').first()).toBeVisible();
  const client = await context.newCDPSession(page);
  const content = page.locator('[data-sheet-content]');
  for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 390, height: 844 }, { width: 667, height: 375 }]) {
    await page.setViewportSize(size);
    await content.scrollIntoViewIfNeeded();
    const bounds = (await content.boundingBox())!;
    const x = Math.min(size.width - 30, bounds.x + bounds.width / 2);
    const y = Math.min(size.height - 35, bounds.y + 200);
    const position = () => content.evaluate(el => window.scrollY + el.scrollTop);
    const before = await position();
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 8; step++) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 15 }] });
      await page.waitForTimeout(20);
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(position, `native scroll at ${size.width} × ${size.height}`).toBeGreaterThan(before + 30);
  }
});

test('landscape entry releases window scrolling when rotated to portrait', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'Explicit phone rotation.');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/map');
  await expect(page.locator('[data-list-row]').first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(1000);
  await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'instant' }));
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(700);
});

test('restaurant back control remains usable after scrolling in landscape', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'Explicit landscape phone viewport.');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/map');
  await page.locator('[data-list-row] [role="button"]').first().click();
  const detail = page.locator('[data-detail-root="restaurant"]');
  await expect(detail).toBeVisible();
  await detail.locator('[data-detail-scroll]').evaluate(el => { el.scrollTop = 500; });
  const back = detail.locator('[data-shown] button').first();
  await expect(back).toBeInViewport();
  await back.click();
  await expect(detail).toHaveCount(0);
  await expect(page.locator('[data-map-sheet]')).toHaveAttribute('data-view', 'list');
});

for (const width of [667, 844]) {
  test(`selected spot is centered in the landscape map at ${width}px`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'Explicit landscape phone viewport.');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/map');
    await expect(page.locator('.maplibregl-marker').first()).toBeVisible();
    await page.locator('[data-list-row] [role="button"]').first().click();
    await expect(page.locator('[data-detail-root="restaurant"]')).toBeVisible();
    await page.setViewportSize({ width, height: 390 });
    await expect.poll(async () => {
      const pin = await page.locator('.maplibregl-marker [aria-pressed="true"]').boundingBox();
      const map = await page.locator('.maplibregl-canvas').boundingBox();
      if (!pin || !map) return Infinity;
      return Math.max(
        Math.abs(pin.x + pin.width / 2 - map.x - map.width / 2),
        Math.abs(pin.y + pin.height / 2 - map.y - map.height / 2),
      );
    }).toBeLessThan(25);
  });
}

test('landscape map keeps Safari backdrop content in document flow', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'Explicit phone rotation.');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/map');
  await expect(page.locator('[data-list-row]').first()).toBeVisible();
  for (const size of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    const styles = await page.locator('[data-map-body]').evaluate(el => ({
      shell: getComputedStyle(el.parentElement!).position,
      html: getComputedStyle(document.documentElement).overflowY,
      body: getComputedStyle(document.body).overflowY,
      pages: getComputedStyle(document.querySelector('.app-pages')!).overflowY,
    }));
    expect(styles.shell).not.toBe('fixed');
    expect(styles.html).toBe('visible');
    expect(styles.body).toBe('visible');
    expect(styles.pages).toBe('visible');
  }
});
