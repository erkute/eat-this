import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { resolve } from 'node:path';

for (const english of [false, true]) {
  test(`Must Eat zoom preserves paging and opens no explainer by itself (${english ? 'EN' : 'DE'})`, async ({ page, isMobile }, info) => {
    await page.emulateMedia({ reducedMotion: english ? 'reduce' : 'no-preference' });
    // Public face-up example, then the next, covered card: the explainer
    // opens only from its button, never by itself.
    await page.goto(`${english ? '/en' : ''}/map?me=mustead-main-6`);
    const detail = page.locator('[data-detail-root="must-eat"]');
    const nextDetail = detail.getByRole('button', {
      name: new RegExp(`^${english ? 'Next card' : 'Nächste Karte'}`),
    });
    await expect(nextDetail).toBeInViewport({ ratio: 1 });
    await expect(nextDetail).toHaveText(english ? 'Next' : 'Nächste');
    const detailPosition = detail.getByRole('status').getByText(english ? /^Card / : /^Karte /);
    const initialPosition = await detailPosition.textContent();
    await nextDetail.press('Enter');
    await expect(detailPosition).not.toHaveText(initialPosition!);
    await expect(nextDetail).toBeFocused();
    const previousDetail = detail.getByRole('button', {
      name: new RegExp(`^${english ? 'Previous card' : 'Vorherige Karte'}`),
    });
    if (isMobile) await previousDetail.tap();
    else await previousDetail.press('Space');
    await expect(detailPosition).toHaveText(initialPosition!);
    const opener = page.getByRole('button', { name: english ? 'Zoom card' : 'Karte vergrößern', exact: true });
    await opener.press('Enter');
    const closeName = english ? 'Close enlarged view' : 'Großansicht schließen';
    const close = page.getByRole('button', { name: closeName, exact: true });
    const zoom = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: closeName, exact: true }) });
    await expect(close).toBeVisible();
    await expect(async () => {
      const retry = zoom.getByRole('button', { name: english ? 'Try again' : 'Erneut versuchen', exact: true });
      if (await retry.isVisible()) await retry.click();
      const image = zoom.getByRole('img');
      await expect(image).toHaveCount(1, { timeout: 1000 });
      expect(await image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0, undefined, { timeout: 1000 })).toBe(true);
    }).toPass({ timeout: 20_000, intervals: [1000, 2000, 4000] });
    const a11y = await new AxeBuilder({ page }).include('[role="dialog"][aria-modal="true"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(a11y.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))).toEqual([]);
    const next = zoom.getByRole('button', { name: english ? 'Next card' : 'Nächste Karte', exact: true });
    await expect(next).toBeInViewport({ ratio: 1 });
    await expect(next).toHaveText(english ? 'Next' : 'Nächste');
    const zoomPosition = zoom.getByRole('status').getByText(english ? /^Card / : /^Karte /);
    await expect(zoomPosition).toHaveText(initialPosition!);
    await next.press('Enter');
    await expect(zoomPosition).not.toHaveText(initialPosition!);
    await expect(next).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(zoomPosition).toHaveText(initialPosition!);
    if (isMobile) {
      const session = await page.context().newCDPSession(page);
      const { width, height } = page.viewportSize()!;
      const point = { x: width * .75, y: height * .5 };
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, x: width * .25 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await session.detach();
    } else {
      await next.click();
    }
    await expect(zoom).toHaveAttribute('aria-label', english ? 'Covered' : 'Verdeckt');
    await expect(zoom.getByRole('img')).toHaveAttribute('alt', english ? 'Covered' : 'Verdeckt');
    await expect(page.getByRole('button', { name: english ? 'Skip' : 'Überspringen', exact: true })).toHaveCount(0);
    if (!isMobile) await expect(next).toBeFocused();
    await page.screenshot({ path: `/tmp/eat-this-must-eat-pager/zoom-${info.project.name}-${english ? 'en' : 'de'}.png` });
    await close.click();
    await expect(close).toHaveCount(0);
    await expect(page.getByRole('button', { name: english ? 'Skip' : 'Überspringen', exact: true })).toHaveCount(0);
  });
}

test('Must Eat zoom recovers from an unavailable image service', async ({ page }) => {
  let healthy = false;
  await page.route('**/api/must-eat-image/mustead-main-6**', route => healthy
    ? route.fulfill({ path: resolve('public/pics/card-back-sm.webp'), contentType: 'image/webp' })
    : route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"asset unavailable"}' }));
  await page.goto('/map?me=mustead-main-6');
  await page.getByRole('button', { name: 'Karte vergrößern', exact: true }).click();
  const retry = page.getByRole('button', { name: 'Erneut versuchen', exact: true });
  await expect(retry).toBeVisible();
  healthy = true;
  await retry.click();
  await expect(retry).toHaveCount(0);
  const zoom = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Großansicht schließen', exact: true }) });
  await expect.poll(() => zoom.getByRole('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await zoom.getByRole('button', { name: 'Großansicht schließen', exact: true }).click();
  await expect(zoom).toHaveCount(0);
});

test('Must Eat zoom keeps its height while the next image loads', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const imagePath = resolve('public/pics/card-back-sm.webp');
  let releaseImage!: () => void;
  const gate = new Promise<void>(resolve => { releaseImage = resolve; });
  await page.route('**/api/must-eat-image/**', route => route.fulfill({ path: imagePath, contentType: 'image/webp' }));
  await page.route('**/pics/card-back.webp*', async route => {
    await gate;
    await route.fulfill({ path: imagePath, contentType: 'image/webp' });
  });
  try {
    await page.goto('/map?me=mustead-main-6', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Karte vergrößern', exact: true }).click();
    const zoom = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Großansicht schließen' }) });
    await expect.poll(() => zoom.getByRole('img').last().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.waitForTimeout(600); // Let the opening flight settle.
    const card = zoom.locator('[class*="_card_"]');
    const before = await card.boundingBox();
    if (isMobile) {
      const session = await page.context().newCDPSession(page);
      const { width, height } = page.viewportSize()!;
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: width * .75, y: height * .5 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: width * .25, y: height * .5 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await session.detach();
    } else {
      await zoom.getByRole('button', { name: 'Nächste Karte', exact: true }).click();
    }
    await expect(zoom).toHaveAttribute('aria-label', 'Verdeckt');
    await expect.poll(async () => Math.abs((await card.boundingBox())!.y - before!.y)).toBeLessThan(2);
    expect((await card.boundingBox())!.height).toBeCloseTo(before!.height, 0);
    releaseImage();
    await expect.poll(() => zoom.getByRole('img').last().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect.poll(() => zoom.getByRole('img').last().evaluate(img => img.parentElement!.style.transform)).toBe('none');
    await page.screenshot({ path: `/tmp/eat-this-zoom-stable-${isMobile ? 'mobile' : 'desktop'}.png` });
  } finally {
    releaseImage();
  }
});
