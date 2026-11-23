import { expect, test } from '@playwright/test';

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`reading pages leave GSAP unloaded until animation intent (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    const scripts: Promise<string>[] = [];
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.request().resourceType() === 'script' && response.url().includes('/_next/static/')) {
        scripts.push(response.text());
      }
    });
    await page.goto('/restaurant/engelbecken');
    await expect(page.locator('h1')).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect((await Promise.all(scripts)).some(text => text.includes('GSAP target '))).toBe(false);
    scripts.length = 0;
    await page.goto('/news');
    const article = await page.locator('[data-current-issue]').getAttribute('href');
    expect(article).toMatch(/^\/news\/.+/);
    await page.waitForLoadState('networkidle');
    scripts.length = 0;
    await page.goto(article!);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-article-intro');
    await page.waitForLoadState('networkidle');
    expect((await Promise.all(scripts)).some(text => text.includes('GSAP target '))).toBe(false);
    // Reading content must render even when optional animation chunks fail.
    await page.route('**/_next/static/**/*.js', route => route.abort());
    await page.goto('/restaurant/engelbecken', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
