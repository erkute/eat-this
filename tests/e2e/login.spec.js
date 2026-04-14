import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Dismiss cookie banner if visible
  const cookieBtn = page.locator('#cookieAccept');
  if (await cookieBtn.isVisible()) await cookieBtn.click();
  // Open burger menu so #loginBtn is visible
  await page.locator('#burgerBtn').click();
  await page.locator('#loginBtn').waitFor({ state: 'visible' });
});

test.describe('Login Modal', () => {
  test('login button opens modal', async ({ page }) => {
    await page.locator('#loginBtn').click();
    await expect(page.locator('#loginModal')).toHaveClass(/active/);
  });

  test('modal closes on backdrop click', async ({ page }) => {
    await page.locator('#loginBtn').click();
    await expect(page.locator('#loginModal')).toHaveClass(/active/);
    // Click the overlay area outside the modal content (top-left corner)
    await page.locator('#loginModal').click({ position: { x: 10, y: 10 } });
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
