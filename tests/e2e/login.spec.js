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

test.describe('Welcome Modal (Login/Register)', () => {
  test('login button opens modal', async ({ page }) => {
    await page.locator('#loginBtn').click();
    await expect(page.locator('#welcomeModal')).toHaveClass(/active/);
  });

  test('modal closes on backdrop click', async ({ page }) => {
    await page.locator('#loginBtn').click();
    await expect(page.locator('#welcomeModal')).toHaveClass(/active/);
    // .wm-dialog visually covers the backdrop; dispatch the click directly so
    // the handler bound to #wmBackdrop fires regardless of pointer-event stack.
    await page.locator('#wmBackdrop').dispatchEvent('click');
    await expect(page.locator('#welcomeModal')).not.toHaveClass(/active/);
  });

  test('modal closes on Escape key', async ({ page }) => {
    await page.locator('#loginBtn').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#welcomeModal')).not.toHaveClass(/active/);
  });

  test('shows error for empty email submit', async ({ page }) => {
    await page.locator('#loginBtn').click();
    await page.locator('#wmEmailForm button[type="submit"]').click();
    await expect(page.locator('#wmError')).toBeVisible();
  });

  test('switches between register and login mode', async ({ page, viewport }) => {
    // On mobile the modal uses magic-link only; the name/password fields are
    // always hidden via CSS, so the register/login split doesn't apply.
    test.skip(!!viewport && viewport.width <= 720, 'desktop-only mode toggle');
    await page.locator('#loginBtn').click();
    await expect(page.locator('#wmNameField')).toBeVisible();
    await page.locator('.wm-mode-link').click();
    await expect(page.locator('#wmNameField')).not.toBeVisible();
  });
});
