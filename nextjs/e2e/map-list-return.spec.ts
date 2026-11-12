import { expect, test } from '@playwright/test';

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`map detail returns to its row through history and the list button (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/map');
    const row = page.locator('[data-list-row]').nth(4);
    await row.scrollIntoViewIfNeeded();
    const id = await row.getAttribute('data-list-row');
    await row.getByRole('button').first().click();
    const detail = page.locator('[data-detail-root="restaurant"]');
    await expect(detail).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get('r')).toBeTruthy();
    const slug = new URL(page.url()).searchParams.get('r');
    await page.goBack();
    await expect(detail).toHaveCount(0);
    const returned = page.locator(`[data-list-row="${id}"]`);
    await expect(returned).toBeInViewport();
    await page.goForward();
    await expect(detail).toBeVisible();
    expect(new URL(page.url()).searchParams.get('r')).toBe(slug);
    await detail.locator('[data-detail-hero] button[aria-label="Liste"]').click();
    await expect(detail).toHaveCount(0);
    await expect(returned).toBeInViewport();
    expect(errors).toEqual([]);
  });
}
