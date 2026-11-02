import { expect, test } from '@playwright/test';

for (const theme of ['light', 'dark']) {
  test(`textured pages preload only the ${theme} palette`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('et-theme', value), theme);
    await page.goto('/en/kategorie/pizza');
    const links = page.locator('link[rel="preload"][as="image"][href*="section-wear"]');
    await expect(links).toHaveCount(1);
    await expect(links).toHaveAttribute('href', theme === 'dark'
      ? '/pics/vintage/section-wear-dark-light.webp?v=3'
      : '/pics/vintage/section-wear-light.webp?v=3');
    await expect(page.locator('main').first()).toHaveCSS('background-image', theme === 'dark'
      ? /section-wear-dark-light/
      : /section-wear-light/);
  });
}

for (const path of ['/', '/map', '/news', '/news/essen-torstrasse', '/restaurant/gazzo', '/en/restaurant/gazzo']) {
  test(`does not preload editorial paper on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('link[rel="preload"][href*="section-wear"]')).toHaveCount(0);
  });
}
