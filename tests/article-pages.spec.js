import { test, expect } from '@playwright/test';
import { readdirSync } from 'fs';
import { join } from 'path';

// Each /news/[slug].html is an index.html clone with per-article meta patched
// in. The SPA renders the article body on load; crawlers see the meta.
const newsDir = join(process.cwd(), 'news');
let slugs = [];
try {
  slugs = readdirSync(newsDir)
    .filter(f => f.endsWith('.html'))
    .map(f => f.replace('.html', ''));
} catch {
  // /news/ directory doesn't exist yet — tests will be skipped
}

test.describe('Article shell pages', () => {
  test('article page has per-article <title>', async ({ page }) => {
    test.skip(slugs.length === 0, 'No generated article pages — run npm run build:articles first');

    const slug = slugs[0];
    await page.goto(`/news/${slug}`);

    // Title includes the site suffix the generator appends
    await expect(page).toHaveTitle(/Eat This Berlin$/);
  });

  test('article page has SEO meta tags', async ({ page }) => {
    test.skip(slugs.length === 0, 'No generated article pages — run npm run build:articles first');

    const slug = slugs[0];
    await page.goto(`/news/${slug}`);

    // Canonical points at this article
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain(`/news/${slug}`);

    // og:type is article (vs website on the homepage)
    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');
    expect(ogType).toBe('article');

    // og:title is populated
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    expect(ogTitle.length).toBeGreaterThan(3);

    // og:url matches canonical
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
    expect(ogUrl).toContain(`/news/${slug}`);
  });

  test('article page carries a NewsArticle JSON-LD block', async ({ page }) => {
    test.skip(slugs.length === 0, 'No generated article pages — run npm run build:articles first');

    const slug = slugs[0];
    await page.goto(`/news/${slug}`);

    // Multiple JSON-LD scripts exist (site schema + article schema) — find the article one
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const articleLd = blocks
      .map(t => { try { return JSON.parse(t); } catch { return null; } })
      .filter(Boolean)
      .find(obj => obj['@type'] === 'NewsArticle');

    expect(articleLd, 'expected a NewsArticle JSON-LD block in the head').toBeTruthy();
    expect(articleLd.headline).toBeTruthy();
    expect(articleLd.author?.name).toBe('Eat This Berlin');
    expect(articleLd.publisher?.name).toBe('Eat This Berlin');
  });

  test('SPA activates the article view from the URL path', async ({ page }) => {
    test.skip(slugs.length === 0, 'No generated article pages — run npm run build:articles first');

    const slug = slugs[0];
    await page.goto(`/news/${slug}`);

    // SPA detects /news/[slug] and activates the article page container.
    // The article body itself is populated async from Sanity (language-matched
    // fetch) — that path is exercised by the real browser, not this shell test.
    const articlePage = page.locator('.app-page[data-page="news-article"]');
    await expect(articlePage).toHaveClass(/active/, { timeout: 15_000 });
  });
});
