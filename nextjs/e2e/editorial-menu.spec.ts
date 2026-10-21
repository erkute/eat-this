import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
});

for (const motion of ['reduce', 'no-preference'] as const) {
  test(`editorial menu keeps all destinations reachable and restores focus (${motion})`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: motion });
    if (isMobile) await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/news');
    const trigger = page.locator('#burgerBtn');
    await trigger.click();
    const menu = page.getByRole('dialog', { name: 'Navigation' });
    await expect(menu).toBeVisible();
    await expect(page.locator('#burgerClose')).toBeFocused();
    for (const href of ['/map', '/news', '/must-eats', '/packs', '/kategorie', '/bezirk', '/about', '/contact']) {
      const link = menu.locator(`a[href="${href}"]`);
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeInViewport();
      const box = await link.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    }
    await menu.locator('a[href="/contact"]').focus();
    await page.keyboard.press('Tab');
    await expect(menu.locator('a[href="/"]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
}

test('menu stays above the active intro canvas and hands off to the starter login', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.locator('#burgerBtn').click();
  const menu = page.getByRole('dialog', { name: 'Navigation' });
  await expect(menu).toBeVisible();
  // Re-enter the intro stacking state after opening the menu so the check does
  // not depend on animation duration or a click waiting until the intro ends.
  await page.evaluate(() => document.documentElement.setAttribute('data-hero-intro', ''));
  await expect(page.locator('html')).toHaveAttribute('data-hero-intro', '');
  // Hit testing catches an intro layer covering the links despite visible DOM.
  const map = menu.locator('a[href="/map"]');
  await expect.poll(() => map.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
  })).toBe(true);
  await page.evaluate(() => document.documentElement.removeAttribute('data-hero-intro'));
  await page.locator('#loginBtn').click();
  await expect(menu).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Starter Pack', exact: true })).toBeVisible();
  await expect(page.locator('input[type="email"]').last()).toBeVisible();
});

test('English menu has readable contrast and routes to the magazine', async ({ page }) => {
  await page.goto('/en/about');
  await page.locator('#burgerBtn').click();
  const menu = page.getByRole('dialog', { name: 'Navigation' });
  // Erst messen, wenn die Wörter eingeglitten sind — halb durchsichtig wäre jeder Kontrast falsch.
  await menu.evaluate(el => Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished)));
  const result = await new AxeBuilder({ page }).include('[role="dialog"][aria-label="Navigation"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
  await menu.getByRole('link', { name: 'Magazine', exact: true }).click();
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/\/en\/news$/);
});
