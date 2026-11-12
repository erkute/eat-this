import { expect, test } from '@playwright/test';

for (const reduced of [false, true]) {
  test(`Must Eats are visible without an entrance action (${reduced})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.goto('/');
    const deck = page.locator('[data-hub-musteats] ul');
    await expect(deck).toBeVisible();
    await expect(deck).not.toHaveAttribute('inert');
    await expect(deck.locator('li')).toHaveCount(6);
    const firstLink = deck.locator('li').first().locator('a').first();
    await firstLink.focus();
    await expect(firstLink).toBeFocused();
  });
}

for (const reduced of [false, true]) {
  test(`starter pack prepares near the viewport (${reduced})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const packRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('starter-pack-back.webp')) packRequests.push(request.url());
    });
    await page.goto('/');
    expect(packRequests).toHaveLength(0);
    const pack = page.locator('#hub-starter img[src*="starter-pack-front"]');
    await pack.scrollIntoViewIfNeeded();
    await expect.poll(() => packRequests.length).toBe(1);
    await expect
      .poll(() =>
        pack.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)
      )
      .toBe(true);
    // WebGL takes over when available; the flat art remains the fallback.
    await expect(page.locator('#hub-starter')).toBeVisible();
  });
}

test('card backs wait until the Must Eats approach a narrow viewport', async ({ page }) => {
  const requests: string[] = [];
  const hydrationErrors: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/pics/card-back.webp')) requests.push(request.url());
  });
  page.on('pageerror', (error) => hydrationErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydration|React error #418/i.test(message.text())) {
      hydrationErrors.push(message.text());
    }
  });
  // Match the mobile performance audit; large screens preload farther ahead.
  await page.setViewportSize({ width: 412, height: 823 });
  await page.goto('/');
  expect(requests).toHaveLength(0);
  const deck = page.locator('[data-hub-musteats] ul');
  await deck.scrollIntoViewIfNeeded();
  const back = deck.locator('[data-stack-photo="covered"] img');
  await expect(back).toBeVisible();
  await expect
    .poll(() =>
      back.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)
    )
    .toBe(true);
  expect(requests).not.toHaveLength(0);
  expect(hydrationErrors).toEqual([]);
});
