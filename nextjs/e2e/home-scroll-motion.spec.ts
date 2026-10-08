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
  test(`Must-Eat cards follow scrolling in both directions (reduced motion: ${reduced})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-hero-intro', '');
    await expect(page).toHaveTitle(/EAT THIS/);
    const card = page.locator('[data-hub-musteats] li').first();
    await card.evaluate((element) => {
      const container = document.querySelector('.app-pages')!;
      const desktop = getComputedStyle(container).overflowY === 'auto';
      const view = desktop ? container.getBoundingClientRect() : { top: 0, height: innerHeight };
      const amount = element.getBoundingClientRect().top - view.top - view.height * 0.6;
      (desktop ? container : window).scrollBy({ top: amount, behavior: 'instant' });
    });
    // Let any one-shot entrance finish. Movement must still follow later scrolls.
    await page.waitForTimeout(1700);
    const pose = () => card.evaluate((element) => {
      const target = element.querySelector('[data-stack-photo]')!.parentElement!;
      const matrix = new DOMMatrixReadOnly(getComputedStyle(target).transform);
      return { y: matrix.m42, rotation: Math.atan2(matrix.m12, matrix.m11) * 180 / Math.PI };
    });
    const scroll = async (direction: number) => {
      await page.evaluate(async (direction) => {
        const container = document.querySelector('.app-pages')!;
        const scroller = getComputedStyle(container).overflowY === 'auto' ? container : window;
        for (let step = 0; step < 24; step++) {
          scroller.scrollBy({ top: direction * 8, behavior: 'instant' });
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      }, direction);
      await page.waitForTimeout(450);
    };
    const start = await pose();
    await scroll(1);
    const down = await pose();
    if (reduced) {
      expect(start).toEqual({ y: 0, rotation: 0 });
      expect(down).toEqual(start);
    } else {
      expect(Math.abs(down.y - start.y)).toBeGreaterThan(3);
      expect(Math.abs(down.rotation - start.rotation)).toBeGreaterThan(0.5);
    }
    await scroll(-1);
    const back = await pose();
    expect(Math.abs(back.y - start.y)).toBeLessThan(0.8);
    expect(Math.abs(back.rotation - start.rotation)).toBeLessThan(0.1);
    await page.screenshot({ path: `/tmp/eat-this-card-scrub-${test.info().project.name}-${reduced}.png`, scale: 'css' });
  });
}
