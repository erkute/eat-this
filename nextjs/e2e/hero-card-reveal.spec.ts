import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
});

test('hero cards fan out and reveal in sequence after Remy finishes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const cards = page.locator('[class*="heroCardFlip"]');
  await expect(cards).toHaveCount(3);
  await expect(page.locator('[data-hero-actions] .et-btn')).toHaveCSS('background-image', /button-wear-soft/);
  await expect(page.locator('html')).toHaveAttribute('data-hero-intro', '');
  const stack = await cards.evaluateAll((nodes) => nodes.map((node) => {
    const box = node.parentElement!.getBoundingClientRect();
    return { x: box.x, width: box.width, transform: getComputedStyle(node.parentElement!).transform };
  }));
  expect(Math.max(...stack.map((card) => card.x)) - Math.min(...stack.map((card) => card.x))).toBeLessThan(stack[0].width * .2);
  expect(stack.every((card) => card.transform !== 'none')).toBe(true);
  for (const card of await cards.all()) {
    await expect(card).toHaveCSS('transform', 'matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)');
  }
  await expect(page.locator('html')).not.toHaveAttribute('data-hero-intro', '', { timeout: 15_000 });
  // Each face has a different turn during the staggered reveal.
  await page.waitForTimeout(350);
  const turns = await cards.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).transform));
  expect(new Set(turns).size).toBeGreaterThan(1);
  for (const card of await cards.all()) await expect(card).toHaveCSS('transform', 'none');
  await expect.poll(async () => cards.evaluateAll((nodes) => {
    const boxes = nodes.map((node) => node.parentElement!.getBoundingClientRect());
    return (Math.max(...boxes.map((box) => box.x)) - Math.min(...boxes.map((box) => box.x))) / boxes[0].width;
  })).toBeGreaterThan(1);
});

test('reduced motion shows the cards immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).not.toHaveAttribute('data-hero-intro', '');
  const cards = page.locator('[class*="heroCardFlip"]');
  await expect(cards).toHaveCount(3);
  for (const card of await cards.all()) {
    await expect(card).toHaveCSS('transform', 'none');
    expect(parseFloat(await card.evaluate((node) => getComputedStyle(node).transitionDuration))).toBeLessThanOrEqual(0.00001);
  }
});
