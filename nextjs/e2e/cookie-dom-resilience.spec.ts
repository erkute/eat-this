import { expect, test } from '@playwright/test';

for (const motion of ['reduce', 'no-preference'] as const) {
  test(`external cookie removal does not replace the page (${motion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: motion });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    // React catches commit errors; pageerror alone misses the global error page.
    page.on('console', message => {
      if (message.type() === 'error' && /removeChild|NotFoundError/.test(message.text())) {
        errors.push(message.text());
      }
    });
    await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
    await page.goto('/en/bezirk/charlottenburg');
    await expect(page.locator('html')).not.toHaveAttribute('data-consent-pending');
    await expect(page.locator('h1')).toHaveText('Charlottenburg');
    await page.locator('#cookieInfoTrigger').click();
    // Consent managers and browser extensions can remove an overlay themselves.
    // Keep both actions in one task so removal precedes React's closing commit.
    await page.evaluate(() => {
      document.getElementById('cookieDecline')!.click();
      document.querySelector('.cookie-gate')!.remove();
    });
    await page.waitForTimeout(800); // Includes the 500 ms dismiss timer.
    await expect(page.locator('h1')).toHaveText('Charlottenburg');
    expect(errors).toEqual([]);
    await page.evaluate(() => window.dispatchEvent(new Event('eatthis:open-cookie-settings')));
    await expect(page.locator('#cookieConsent')).toBeVisible();
    await page.locator('#cookieDecline').click();
    await expect(page.locator('.cookie-gate')).toBeHidden();
    await expect(page.locator('h1')).toHaveText('Charlottenburg');
    expect(errors).toEqual([]);
  });
}

test('dismissed consent releases the overlay and can reopen', async ({ page }) => {
  await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
  await page.goto('/en/bezirk/charlottenburg');
  await expect(page.locator('html')).not.toHaveAttribute('data-consent-pending');
  await page.locator('#cookieDecline').click();
  await expect(page.locator('.cookie-gate')).toBeHidden();
  await expect(page.locator('html')).not.toHaveAttribute('data-consent-gate');
  await page.evaluate(() => window.dispatchEvent(new Event('eatthis:open-cookie-settings')));
  await expect(page.locator('#cookieConsent')).toBeVisible();
  await page.locator('#cookieDecline').click();
  await expect(page.locator('.cookie-gate')).toBeHidden();
  await expect(page.locator('h1')).toHaveText('Charlottenburg');
});
