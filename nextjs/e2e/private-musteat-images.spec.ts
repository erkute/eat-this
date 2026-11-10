import { expect, test } from '@playwright/test';

test('publicly revealed cards load real private-storage images', async ({ page, request }) => {
  // Read the server-rendered card before map hydration changes the visible set.
  await page.route('**/_next/static/**/*.js', route => route.abort());
  await page.goto('/map', { waitUntil: 'domcontentloaded' });
  const urls = await page.locator('img[src*="/api/must-eat-image/"]').evaluateAll(images =>
    [...new Set(images.map(image => (image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src))]
  );
  expect(urls.length).toBeGreaterThan(0);
  for (const url of urls) {
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^image\//);
    expect((await response.body()).byteLength).toBeGreaterThan(0);
    const width = await page.evaluate(async src => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return image.naturalWidth;
    }, url);
    expect(width).toBeGreaterThan(0);
  }
});
