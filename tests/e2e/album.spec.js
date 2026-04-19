import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  const cookieBtn = page.locator('#cookieAccept');
  if (await cookieBtn.isVisible()) await cookieBtn.click();
  await page.locator('#navMustsBtn').click();
});

test.describe('Must-Eat Album', () => {
  test('album renders pages container', async ({ page }) => {
    await expect(page.locator('#albumPages')).toBeVisible();
  });

  test('album shows slots (empty when CMS unavailable, all types when CMS loads)', async ({ page }) => {
    // Wait for album to render (either from CMS fetch or from auth state change)
    await page.waitForSelector('.album-slot', { timeout: 15000 });
    // Slots 22–155 are always empty gray boxes regardless of CMS data
    await expect(page.locator('.album-slot.empty').first()).toBeVisible();
    // If CMS data loaded, sharp and blurred slots will also be present
    const sharp = await page.locator('.album-slot.sharp').count();
    const blurred = await page.locator('.album-slot.blurred').count();
    const empty = await page.locator('.album-slot.empty').count();
    // Total DOM slots: Math.ceil(156/9) pages × 9 = 162
    expect(sharp + blurred + empty).toBe(162);
  });

  test('album shows progress count', async ({ page }) => {
    const count = page.locator('#albumProgCount');
    await expect(count).toBeVisible();
    await expect(count).toContainText('/ 156');
  });

  test('dot navigation moves to page 2', async ({ page }) => {
    const dots = page.locator('.album-dot');
    await dots.nth(1).click();
    const transform = await page.locator('#albumPages').evaluate(el => el.style.transform);
    expect(transform).toContain('translateX(-100%)');
  });
});
