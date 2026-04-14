import { test, expect } from '@playwright/test';
import { readdirSync } from 'fs';
import { join } from 'path';

// Pick the first generated article slug for testing
const newsDir = join(process.cwd(), 'news');
let slugs = [];
try {
  slugs = readdirSync(newsDir)
    .filter(f => f.endsWith('.html'))
    .map(f => f.replace('.html', ''));
} catch {
  // /news/ directory doesn't exist yet — tests will be skipped
}

test.describe('Article pages', () => {
  test('article page loads with correct title', async ({ page }) => {
    test.skip(slugs.length === 0, 'No generated article pages — run npm run build:articles first');

    const slug = slugs[0];
    await page.goto(`/news/${slug}`);

    // Page title contains "Eat This Berlin"
    await expect(page).toHaveTitle(/Eat This Berlin/);

    // Article body is visible
    await expect(page.locator('.news-article')).toBeVisible();

    // Back link points to /#news
    const backLink = page.locator('.article-page-back');
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/#news');
  });

  test('article page has SEO meta tags', async ({ page }) => {
    test.skip(slugs.length === 0, 'No generated article pages — run npm run build:articles first');

    const slug = slugs[0];
    await page.goto(`/news/${slug}`);

    // canonical URL is set
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain(`/news/${slug}`);

    // og:title is set
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    expect(ogTitle.length).toBeGreaterThan(3);

    // JSON-LD is present and valid
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    const parsed = JSON.parse(jsonLd);
    expect(parsed['@type']).toBe('Article');
    expect(parsed.headline).toBeTruthy();
  });

  test('back link returns to news section', async ({ page }) => {
    test.skip(slugs.length === 0, 'No generated article pages — run npm run build:articles first');

    const slug = slugs[0];
    await page.goto(`/news/${slug}`);

    await page.locator('.article-page-back').click();

    // Should navigate to /#news
    await expect(page).toHaveURL(/#news/);
  });
});
