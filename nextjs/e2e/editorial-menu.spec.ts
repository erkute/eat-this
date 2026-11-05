import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! },
  ]);
});

for (const locale of ['', '/en']) {
  test(`desktop menu stays readable in a short window (${locale || 'de'})`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop scaling only');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${locale}/news`, { waitUntil: 'domcontentloaded' });
    const trigger = page.locator('#burgerBtn');
    expect(await trigger.locator('span').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(20);
    await trigger.click();
    const menu = page.getByRole('dialog', { name: 'Navigation' });
    for (const item of await menu.locator('nav a, nav button').all()) {
      expect(await item.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(36);
    }
    // Layout fixture: the ninth row is normally visible only to admins.
    await menu.locator('nav').evaluate((nav) => {
      const stats = nav.lastElementChild!.cloneNode(true) as HTMLAnchorElement;
      stats.href = '/admin/stats';
      stats.textContent = 'Stats';
      nav.appendChild(stats);
    });
    expect(await menu.getByRole('link', { name: 'Stats', exact: true })
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(30);
    await expect(menu.locator('a[href$="/contact"]')).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  });
}

for (const [width, height] of [[360, 640], [375, 553], [390, 664], [430, 739], [1280, 720], [1440, 800]]) {
  for (const locale of ['', '/en']) {
    test(`menu fits without scrolling at ${width}x${height} (${locale || 'de'})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(`${locale}/news`, { waitUntil: 'domcontentloaded' });
      await expect(async () => {
        await page.locator('#burgerBtn').click();
        await expect(page.locator('#burgerBtn')).toHaveAttribute('aria-expanded', 'true', { timeout: 1000 });
      }).toPass();
      const menu = page.getByRole('dialog', { name: 'Navigation' });
      await expect(menu).toBeVisible();
      const scroller = menu.locator('[class*="scroller"]');
      expect(await scroller.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
      // Layout fixture: the ninth row is normally visible only to admins.
      await menu.locator('nav').evaluate((nav) => {
        const stats = nav.lastElementChild!.cloneNode(true) as HTMLAnchorElement;
        stats.href = '/admin/stats';
        stats.textContent = 'Stats';
        nav.appendChild(stats);
      });
      expect(await scroller.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
    });
  }
}

for (const motion of ['reduce', 'no-preference'] as const) {
  test(`editorial menu keeps all destinations reachable and restores focus (${motion})`, async ({
    page,
    isMobile,
  }) => {
    await page.emulateMedia({ reducedMotion: motion });
    if (isMobile) await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/news', { waitUntil: 'domcontentloaded' });
    const trigger = page.locator('#burgerBtn');
    await expect(page.locator('#burgerDrawer')).toHaveAttribute('inert', '');
    await trigger.click();
    const menu = page.getByRole('dialog', { name: 'Navigation' });
    await expect(menu).toBeVisible();
    const motionState = await menu.evaluate(async (panel) => {
      const words = Array.from(panel.querySelectorAll('nav a, nav button'));
      let movedWord = false;
      let maxTravel = 0;
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const sample = () => {
          const transform = getComputedStyle(panel).transform;
          maxTravel = Math.max(
            maxTravel,
            Math.abs(new DOMMatrixReadOnly(transform === 'none' ? undefined : transform).m41)
          );
          movedWord ||= words.some((word) => {
            const style = getComputedStyle(word);
            return (
              style.transform !== 'none' ||
              style.translate !== 'none' ||
              style.rotate !== 'none' ||
              style.opacity !== '1'
            );
          });
          if (performance.now() - start < 260) requestAnimationFrame(sample);
          else resolve();
        };
        sample();
      });
      return { movedWord, maxTravel };
    });
    expect(motionState.movedWord).toBe(false);
    expect(motionState.maxTravel).toBeLessThanOrEqual(motion === 'reduce' ? 0 : 24.1);
    await expect(page.locator('#burgerClose')).toBeFocused();
    for (const href of [
      '/map',
      '/news',
      '/must-eats',
      '/packs',
      '/kategorie',
      '/bezirk',
      '/about',
      '/contact',
    ]) {
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

test('home menu links are clickable and hand off to the starter login', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#burgerDrawer')).toHaveAttribute('inert', '');
  await page.locator('#burgerBtn').click();
  const menu = page.getByRole('dialog', { name: 'Navigation' });
  await expect(menu).toBeVisible();
  // Hit testing verifies that the open menu links are clickable.
  const map = menu.locator('a[href="/map"]');
  await expect
    .poll(() =>
      map.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return element.contains(
          document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
        );
      })
    )
    .toBe(true);
  await page.locator('#loginBtn').click();
  await expect(menu).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Starter Pack', exact: true })).toBeVisible();
  await expect(page.locator('input[type="email"]').last()).toBeVisible();
});

test('English menu has readable contrast and routes to the magazine', async ({ page }) => {
  await page.goto('/en/about', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#burgerDrawer')).toHaveAttribute('inert', '');
  await page.locator('#burgerBtn').click();
  const menu = page.getByRole('dialog', { name: 'Navigation' });
  // Die Papierbewegung muss vor der Kontrastmessung abgeschlossen sein.
  await menu.evaluate((el) =>
    Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished))
  );
  const result = await new AxeBuilder({ page })
    .include('[role="dialog"][aria-label="Navigation"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    []
  );
  await menu.getByRole('link', { name: 'Magazine', exact: true }).click();
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/\/en\/news$/);
});
