import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Dismiss cookie banner if visible
  const cookieBtn = page.locator('#cookieAccept');
  if (await cookieBtn.isVisible()) await cookieBtn.click();
});

test.describe('Login Modal', () => {
  test('login button opens modal', async ({ page }) => {
    await page.locator('#loginBtn').click();
    await expect(page.locator('#loginModal')).toHaveClass(/active/);
  });

  test('modal closes on backdrop click', async ({ page }) => {
    await page.locator('#loginBtn').click();
    await expect(page.locator('#loginModal')).toHaveClass(/active/);
    // Click the modal overlay outside the content area to close
    await page.locator('#loginModal').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('#loginModal')).not.toHaveClass(/active/);
  });

  test('modal closes on Escape key', async ({ page }) => {
    await page.locator('#loginBtn').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#loginModal')).not.toHaveClass(/active/);
  });

  test('shows error for empty email submit', async ({ page }) => {
    await page.locator('#loginBtn').click();
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#loginError')).toBeVisible();
  });

  test('switches between register and login mode', async ({ page }) => {
    await page.locator('#loginBtn').click();
    await expect(page.locator('#nameField')).toBeVisible();
    await page.locator('.login-mode-link').click();
    await expect(page.locator('#nameField')).not.toBeVisible();
  });
});
