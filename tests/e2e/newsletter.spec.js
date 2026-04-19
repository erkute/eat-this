import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  const cookieBtn = page.locator('#cookieAccept');
  if (await cookieBtn.isVisible()) await cookieBtn.click();
});

test.describe('Newsletter', () => {
  test('newsletter section is visible on start page', async ({ page }) => {
    await expect(page.locator('#newsletterSection')).toBeVisible();
  });

  test('shows error on empty submit', async ({ page }) => {
    await page.locator('#newsletterSubmit').click();
    await expect(page.locator('#newsletterError')).toBeVisible();
  });

  test('accepts valid email input', async ({ page }) => {
    await page.locator('#newsletterEmail').fill('test@example.com');
    await expect(page.locator('#newsletterEmail')).toHaveValue('test@example.com');
  });
});
