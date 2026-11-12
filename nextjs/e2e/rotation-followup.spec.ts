import { expect, test } from '@playwright/test';

test('phone rotation keeps main views within the viewport', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Explicit viewport matrix.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['/', '/must-eats', '/map']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await expect(path === '/map' ? page.getByRole('region', { name: 'Map', exact: true }) : page.locator('#burgerBtn')).toBeVisible();
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(path === '/map' ? page.getByRole('region', { name: 'Map', exact: true }) : page.locator('#burgerBtn')).toBeVisible();
    const overflow = await page.evaluate(() => ({width: innerWidth, content: document.documentElement.scrollWidth}));
    expect(overflow.content, path).toBeLessThanOrEqual(overflow.width + 1);
    if (path === '/map') {
      const sheet = page.locator('[data-map-sheet]');
      await expect.poll(() => sheet.evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(20);
      await expect.poll(() => sheet.evaluate(el => el.getBoundingClientRect().left)).toBeGreaterThan(400);
    }
    if (path === '/') {
      const cta = page.locator('[data-hero-actions]').getByRole('link');
      await expect(cta).toBeInViewport();
    }
    await page.screenshot({ path: `/tmp/eat-this-rotation-${path.replaceAll('/', '') || 'home'}.png` });
  }
});

test('Remy browser ground matches the mobile panel in both themes', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Explicit viewport.');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about');
  for (const theme of ['Hell', 'Dunkel']) {
    await page.getByRole('contentinfo').getByRole('button', { name: theme, exact: true }).click();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(page.locator('#navbar')).toHaveAttribute('data-visibility', 'visible');
    await page.locator('#burgerBtn').click();
    await page.getByRole('dialog', { name: 'Navigation' }).getByRole('button', { name: 'Frag Remy', exact: true }).click();
    const panel = page.locator('#buddy-panel');
    await expect(panel).toBeVisible();
    const colors = await panel.evaluate(el => ({ panel: getComputedStyle(el).backgroundColor, html: getComputedStyle(document.documentElement).backgroundColor, body: getComputedStyle(document.body).backgroundColor }));
    expect(colors.html).toBe(colors.panel);
    expect(colors.body).toBe(colors.panel);
    await panel.getByRole('button', { name: 'Schließen', exact: true }).click();
  }
});
