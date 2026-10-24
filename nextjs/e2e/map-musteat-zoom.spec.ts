import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONSENT_VERSION } from '../lib/consent';
import { resolve } from 'node:path';

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
});

for (const english of [false, true]) {
  test(`Must Eat zoom defers onboarding and preserves paging (${english ? 'EN' : 'DE'})`, async ({ page, isMobile }, info) => {
    await page.emulateMedia({ reducedMotion: english ? 'reduce' : 'no-preference' });
    // Public face-up example: the first-visit explainer belongs to the next,
    // covered card, and must wait until its zoom has closed.
    await page.goto(`${english ? '/en' : ''}/map?me=mustead-main-6`);
    const detail = page.locator('[data-detail-root="must-eat"]');
    const nextDetail = detail.getByRole('button', { name: new RegExp(`^${english ? 'Next Must Eat' : 'Nächstes Must Eat'}`) });
    if (isMobile) {
      await expect(nextDetail).toBeHidden();
    } else {
      await expect(nextDetail.locator('svg')).toBeVisible();
      await expect(nextDetail.locator('img')).toHaveCount(0);
    }
    const opener = page.getByRole('button', { name: english ? 'Zoom card' : 'Karte vergrößern', exact: true });
    await opener.click();
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
    if (isMobile) {
      await expect(next).toBeHidden();
      const session = await page.context().newCDPSession(page);
      const { width, height } = page.viewportSize()!;
      const point = { x: width * .75, y: height * .5 };
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, x: width * .25 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await session.detach();
    } else {
      await expect(next.locator('svg')).toBeVisible();
      await expect(next).toHaveText('');
      await next.click();
    }
    await expect(zoom).toHaveAttribute('aria-label', english ? 'Covered' : 'Verdeckt');
    await expect(zoom.getByRole('img')).toHaveAttribute('alt', english ? 'Covered' : 'Verdeckt');
    await expect(page.getByRole('button', { name: english ? 'Skip' : 'Überspringen', exact: true })).toHaveCount(0);
    if (!isMobile) await expect(next).toBeFocused();
    await page.screenshot({ path: `/tmp/eat-this-must-eat-arrows/zoom-${info.project.name}-${english ? 'en' : 'de'}.png` });
    await close.click();
    await expect(close).toHaveCount(0);
    await expect(page.getByRole('button', { name: english ? 'Skip' : 'Überspringen', exact: true })).toBeVisible();
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
