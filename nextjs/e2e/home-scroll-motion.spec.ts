import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.route('**/api/consent', (route) => route.fulfill({ status: 204 }));
  await context.addCookies([
    { name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! },
  ]);
});

test('Remy waits for his face, then enters from the corner after a slow image load', async ({ page }) => {
  let releaseFace!: () => void;
  const faceGate = new Promise<void>((resolve) => { releaseFace = resolve; });
  await page.route('**/*buddy-smile*', async (route) => {
    await faceGate;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const launcher = page.locator('[data-buddy-launcher]');
  const dock = launcher.locator('..');
  await expect(page.locator('html')).not.toHaveAttribute('data-hero-intro', '');
  try {
    await expect(dock).toHaveAttribute('data-entrance', 'waiting');
    await expect(launcher).toBeHidden();
  } finally {
    releaseFace();
  }
  await expect(dock).toHaveAttribute('data-entrance', 'playing');
  const start = await launcher.evaluate((element) => {
    const head = element.firstElementChild as HTMLElement;
    const face = head.querySelector('img')!;
    const animation = head.getAnimations()[0];
    animation.pause();
    animation.currentTime = 0;
    return { loaded: face.complete && face.naturalWidth > 0, left: head.getBoundingClientRect().left };
  });
  expect(start.loaded).toBe(true);
  expect(start.left).toBeGreaterThan(page.viewportSize()!.width);
  await expect(dock).not.toHaveAttribute('data-entrance');
  await expect(launcher).toBeVisible();
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
