import { test, expect } from '@playwright/test';

test.describe('PWA & SEO', () => {
  test('manifest.json is accessible', async ({ page }) => {
    const res = await page.request.get('/manifest.json');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.name).toBe('EAT THIS — Berlin Food Guide');
    expect(json.icons.length).toBeGreaterThan(0);
  });

  test('service worker is registered', async ({ page }) => {
    await page.goto('/');
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration('/');
      return !!reg;
    });
    expect(swRegistered).toBe(true);
  });

  test('robots.txt is accessible', async ({ page }) => {
    const res = await page.request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('Sitemap:');
  });

  test('sitemap.xml is accessible', async ({ page }) => {
    const res = await page.request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('eatthisdot.com');
  });

  test('og:image meta tag is present', async ({ page }) => {
    await page.goto('/');
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toBeTruthy();
  });
});
