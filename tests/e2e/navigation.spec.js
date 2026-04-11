import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('homepage loads and shows hero', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/EAT THIS/);
    await expect(page.locator('.hero-slide.active')).toBeVisible();
  });

  test('footer nav tabs are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#appFooter')).toBeVisible();
    await expect(page.locator('[data-target="map"]')).toBeVisible();
    await expect(page.locator('[data-target="musts"]')).toBeVisible();
    await expect(page.locator('[data-target="news"]')).toBeVisible();
  });

  test('navigates to Must-Eats page', async ({ page }) => {
    await page.goto('/#musts');
    await expect(page.locator('.app-page[data-page="musts"]')).toHaveClass(/active/);
  });

  test('navigates to News page', async ({ page }) => {
    await page.goto('/#news');
    await expect(page.locator('.app-page[data-page="news"]')).toHaveClass(/active/);
  });

  test('navigates to Map page', async ({ page }) => {
    await page.goto('/#map');
    await expect(page.locator('.app-page[data-page="map"]')).toHaveClass(/active/);
  });
});
