import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

for (const route of ['/news', '/en/news']) {
  test(`news loads without the homepage bundle: ${route}`, async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', request => {
      if (request.resourceType() === 'script') scripts.push(decodeURIComponent(request.url()));
    });
    await page.goto(route);
    await expect(page.locator('[data-current-issue]')).toBeVisible();
    expect(scripts.filter(url => /\/\(spa\)\/page-[^/]+\.js/.test(url))).toEqual([]);
  });
}

for (const javaScriptEnabled of [true, false]) {
  test.describe(`footer lettering with JavaScript ${javaScriptEnabled ? 'enabled' : 'disabled'}`, () => {
    test.use({ javaScriptEnabled });
    for (const route of ['/', '/news']) {
      test(`renders on arrival at the footer: ${route}`, async ({ page, context, baseURL, isMobile, browserName }, info) => {
        test.skip(route === '/' && !isMobile, 'The desktop hero uses the same lettering above the fold.');
        await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
        const lettering: string[] = [];
        let letteringLoaded = false;
        page.on('requestfinished', async request => {
          if (request.url().includes('/slogan-desktop.webp')) {
            letteringLoaded = (await request.response())?.ok() === true;
          }
        });
        page.on('request', request => {
          if (request.url().includes('/slogan-desktop.webp')) lettering.push(request.url());
        });
        await page.goto(route);
        await expect(page.locator('h1').first()).toBeVisible();
        // Chromium defers masks in skipped content; WebKit fetches them early.
        // Both engines must still render the lettering without application JS.
        if (browserName === 'chromium') expect(lettering).toEqual([]);
        const footer = page.locator('[data-site-footer]');
        await footer.scrollIntoViewIfNeeded();
        await expect.poll(() => letteringLoaded).toBe(true);
        const slogan = footer.locator('[class*="BrandSlogan_slogan"]');
        await expect(slogan).toBeInViewport();
        expect((await slogan.boundingBox())!.height).toBeGreaterThan(20);
        await page.screenshot({ path: `/tmp/eat-this-footer-${info.project.name}-${javaScriptEnabled}-${route === '/' ? 'home' : 'news'}.png` });
      });
    }
  });
}
