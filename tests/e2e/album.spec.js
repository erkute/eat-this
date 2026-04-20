import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  const cookieBtn = page.locator('#cookieAccept');
  if (await cookieBtn.isVisible()) await cookieBtn.click();
  await page.locator('#navMustsBtn').click();
});

test.describe('Must-Eat Album', () => {
  test('album renders grid container', async ({ page }) => {
    await expect(page.locator('#albumGrid')).toBeVisible();
  });

  test('album shows slots (total 150)', async ({ page }) => {
    // Wait for album to render (either from CMS fetch or from auth state change)
    await page.waitForSelector('.album-slot', { timeout: 15000 });
    // Empty gray slots always render regardless of CMS data
    await expect(page.locator('.album-slot.empty').first()).toBeVisible();
    const sharp = await page.locator('.album-slot.sharp').count();
    const empty = await page.locator('.album-slot.empty').count();
    // ALBUM_TOTAL = 150 (js/app.js)
    expect(sharp + empty).toBe(150);
  });

  test('album shows progress count', async ({ page }) => {
    const countWrap = page.locator('.album-head-count');
    await expect(countWrap).toBeVisible();
    await expect(countWrap).toContainText('/ 150');
  });
});
