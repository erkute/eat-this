import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.route('**/api/consent', (route) => route.fulfill({ status: 204 }));
  await context.addCookies([
    { name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! },
  ]);
});

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
    await expect(page.locator('html')).not.toHaveAttribute('data-hero-intro', { timeout: 20_000 });
    expect(packRequests).toHaveLength(0);
    const pack = page.locator('#hub-starter img[src*="starter-pack-front"]');
    await pack.scrollIntoViewIfNeeded();
    await expect.poll(() => packRequests.length).toBe(1);
    await expect.poll(() => pack.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    // WebGL takes over when available; the flat art remains the fallback.
    await expect(page.locator('#hub-starter')).toBeVisible();
  });
}
