import { expect, test } from '@playwright/test';

for (const [width, height] of [[1440, 900], [525, 802], [390, 844], [320, 568]]) {
  test(`admin menu fits its ninth destination at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/news');
    await page.locator('#burgerBtn').click();
    const menu = page.getByRole('dialog', { name: 'Navigation' });
    await expect(menu).toBeVisible();
    // Layout fixture only. Auth visibility and the actual Stats link are
    // separately covered by BurgerDrawer.test.tsx; no admin login is needed.
    const size = await menu.evaluate(panel => {
      const nav = panel.querySelector('nav')!;
      const stats = nav.lastElementChild!.cloneNode(true) as HTMLAnchorElement;
      stats.textContent = 'Stats';
      stats.href = '/admin/stats';
      nav.appendChild(stats);
      const scroller = nav.parentElement!;
      return { viewport: scroller.clientHeight, content: scroller.scrollHeight };
    });
    expect(size.content).toBeLessThanOrEqual(size.viewport + 1);
    await expect(menu.getByRole('link', { name: 'Stats', exact: true })).toBeInViewport();
    await expect(menu.getByRole('link', { name: 'Kontakt', exact: true })).toBeInViewport();
  });
}

for (const prefix of ['', '/en']) {
  test(`legal pages omit the extra document-title paragraph (${prefix || 'DE'})`, async ({ page }) => {
    for (const [slug, redundant] of [['datenschutz', prefix ? 'Privacy Policy' : 'Datenschutzerklärung'], ['agb', prefix ? 'Terms & Conditions' : 'Allgemeine Geschäftsbedingungen']]) {
      await page.goto(`${prefix}/${slug}`);
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('main').getByText(redundant, { exact: true })).toHaveCount(0);
      await expect(page.locator('main h2').first()).toBeVisible();
    }
  });
}
