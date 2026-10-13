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
  test(`Must-Eat pile deals into the grid (reduced motion: ${reduced})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-hero-intro', '');
    await expect(page).toHaveTitle(/EAT THIS/);
    const section = page.locator('[data-hub-musteats]');
    const pile = section.getByRole('button', { name: 'Karten auslegen', exact: true });
    const deck = section.locator('ul');
    await pile.scrollIntoViewIfNeeded();
    await expect(pile).toBeVisible();
    await expect(deck).toBeHidden();
    await expect(pile.locator('img')).toHaveCount(6);
    const hand = pile.locator('[data-hint]');
    await expect(hand).toHaveAttribute('data-active', 'true');
    for (const animated of [hand, pile.locator('img').last()]) {
      await expect(animated).toHaveCSS('animation-iteration-count', reduced ? '1' : 'infinite');
      if (reduced) await expect(animated).toHaveCSS('animation-name', 'none');
    }
    expect(await pile.locator('img').evaluateAll(images => images.every(image => image.getAttribute('src')?.includes('card-back.webp')))).toBe(true);
    await page.screenshot({ path: `/tmp/eat-this-pile-${test.info().project.name}-${reduced}.png`, scale: 'css' });
    // Enter also verifies that focus survives the disappearing pile button.
    await pile.focus();
    await pile.press('Enter');
    if (!reduced) {
      await expect(deck).toHaveAttribute('data-deal-state', 'dealing');
      await expect(deck).toHaveAttribute('inert', '');
    }
    await expect(deck).toHaveAttribute('data-deal-state', 'spread');
    await expect(deck).not.toHaveAttribute('inert');
    await expect(pile).toHaveCount(0);
    const firstLink = deck.locator('li').first().locator('a').first();
    await expect(firstLink).toBeFocused();
    const positions = await deck.locator('li').evaluateAll(items => items.map(item => {
      const box = item.getBoundingClientRect();
      return { x: box.x, y: box.y };
    }));
    expect(positions).toHaveLength(6);
    expect(Math.abs(positions[0].y - positions[1].y)).toBeLessThan(1);
    if (page.viewportSize()!.width < 768) {
      expect(positions[2].y).toBeGreaterThan(positions[0].y);
      expect(positions[2].x).toBe(positions[0].x);
    }
    expect(await firstLink.evaluate(el => getComputedStyle(el).transform)).toBe('none');
    await page.screenshot({ path: `/tmp/eat-this-dealt-${test.info().project.name}-${reduced}.png`, scale: 'css' });
  });
}
