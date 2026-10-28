import { expect, test } from '@playwright/test';

for (const theme of ['light', 'dark']) {
  test(`editorial paper preloads only the ${theme} palette`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('et-theme', value), theme);
    await page.goto('/en/news');
    const links = page.locator('link[rel="preload"][as="image"][href*="section-wear"]');
    await expect(links).toHaveCount(1);
    await expect(links).toHaveAttribute('href', theme === 'dark'
      ? '/pics/vintage/section-wear-dark-light.webp?v=3'
      : '/pics/vintage/section-wear-light.webp?v=3');
    await expect(page.locator('.app-page').first()).toHaveCSS('background-image', theme === 'dark'
      ? /section-wear-dark-light/
      : /section-wear-light/);
  });
}

for (const path of ['/', '/map']) {
  test(`does not preload editorial paper on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('link[rel="preload"][href*="section-wear"]')).toHaveCount(0);
  });
}
