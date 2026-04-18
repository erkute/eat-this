import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  const cookieBtn = page.locator('#cookieAccept');
  if (await cookieBtn.isVisible()) await cookieBtn.click();
  await page.evaluate(() => localStorage.removeItem('onboardingComplete'));
  await page.evaluate(() => {
    if (typeof window.showOnboarding === 'function') window.showOnboarding();
  });
});

test.describe('Onboarding', () => {
  test('overlay appears', async ({ page }) => {
    await expect(page.locator('#onboardingOverlay')).toBeVisible();
  });

  test('step 1 is shown first', async ({ page }) => {
    await expect(page.locator('#obStep1')).toBeVisible();
    await expect(page.locator('#obStep2')).not.toBeVisible();
  });

  test('Next button advances to step 2', async ({ page }) => {
    await page.locator('#obStep1 #obNext1').click();
    await expect(page.locator('#obStep2')).toBeVisible();
    await expect(page.locator('#obStep1')).not.toBeVisible();
  });

  test('Skip goes directly to step 4', async ({ page }) => {
    await page.locator('#obStep1 #obSkip1').click();
    await expect(page.locator('#obStep4')).toBeVisible();
  });

  test('Open Booster Pack closes overlay', async ({ page }) => {
    await page.evaluate(() => window._obGoTo && window._obGoTo(4));
    await page.locator('#obOpenPackBtn').click();
    await expect(page.locator('#onboardingOverlay')).not.toBeVisible();
  });
});
