import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  const cookieBtn = page.locator('#cookieAccept');
  if (await cookieBtn.isVisible()) await cookieBtn.click();
});

test.describe('Navigation', () => {
  test('homepage loads and shows hero', async ({ page }) => {
    await expect(page).toHaveTitle(/EAT THIS/);
    await expect(page.locator('.hero-slide.active')).toBeVisible();
  });

  test('footer nav tabs are visible', async ({ page }) => {
    await expect(page.locator('#navMapBtn')).toBeVisible();
    await expect(page.locator('#navMustsBtn')).toBeVisible();
    await expect(page.locator('#navNewsBtn')).toBeVisible();
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
