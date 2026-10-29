import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

for (const theme of ['light', 'dark'] as const) {
  test(`article labels and catalogue use paper (${theme})`, async ({ page, context, baseURL }, info) => {
    const english = theme === 'dark';
    const prefix = english ? '/en' : '';
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
    await page.addInitScript(value => {
      localStorage.setItem('et-theme', value);
      Object.defineProperty(navigator, 'share', { value: undefined });
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: async (url: string) => { document.documentElement.dataset.copiedUrl = url; } },
      });
    }, theme);
    await page.emulateMedia({ reducedMotion: english ? 'reduce' : 'no-preference' });
    await page.goto(`${prefix}/news/essen-trinken-schoeneberg`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Schöneberg/);
    await expect(page).toHaveTitle(/Schöneberg.*EAT THIS/);
    await page.evaluate(() => document.fonts.ready);
    const progress = page.locator('[data-reading-progress]');
    await expect(progress).toHaveCSS('mask-image', 'none');
    await expect(progress).toHaveCSS('background-image', 'none');
    const fill = await progress.evaluate(element => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = getComputedStyle(element).backgroundColor;
      ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    });
    // A neutral grey rather than the red accent, in either theme.
    expect(Math.max(...fill.slice(0, 3)) - Math.min(...fill.slice(0, 3))).toBeLessThan(10);

    const name = page.locator('.et-label-title[href*="/map?r="]').first();
    await name.scrollIntoViewIfNeeded();
    await expect(name).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(name).toHaveCSS('color', 'rgb(21, 18, 14)');
    await expect(name.locator('..')).toHaveCSS('rotate', 'none');
    const card = name.locator('xpath=ancestor::span[contains(@class,"inlineSpot_")]');
    const meta = card.locator('.et-label-paper');
    await expect(meta).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(meta).toHaveCSS('color', 'rgb(21, 18, 14)');
    await expect(meta.locator('..')).toHaveCSS('rotate', 'none');
    await expect(meta).toHaveAttribute('href', /\/restaurant\//);
    await expect.poll(() => card.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect.poll(() => progress.evaluate(element => getComputedStyle(element).clipPath)).not.toBe('inset(0px 100% 0px 0px)');
    expect(await card.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: `/tmp/eat-this-article-paper/spot-${info.project.name}-${theme}.png` });
    await name.focus();
    await expect(name).toHaveCSS('outline-style', 'none');
    await meta.focus();
    await expect(meta).toHaveCSS('outline-style', 'none');

    const share = page.locator('button.et-btn-paper');
    await expect(share).toHaveAccessibleName(english ? 'Share' : 'Teilen');
    await share.scrollIntoViewIfNeeded();
    await expect(share).toHaveCSS('background-image', /folded-white/);
    await expect(share).toHaveCSS('border-radius', '0px');
    await share.focus();
    await expect(share).toHaveCSS('outline-style', 'none');
    await expect(share).toHaveCSS('color', english ? 'rgb(255, 255, 255)' : 'rgb(21, 18, 14)');
    await share.click();
    await expect(share).toHaveText(english ? 'Copied' : 'Kopiert');
    await expect(page.locator('html')).toHaveAttribute('data-copied-url', page.url());
    const hub = page.locator('.et-paper-link');
    await expect(hub).toHaveAttribute('href', `${prefix}/bezirk/schoeneberg`);
    await hub.scrollIntoViewIfNeeded();
    await expect(hub).toHaveCSS('background-image', /folded-white/);
    await hub.hover();
    await expect(hub).toHaveCSS('transform', 'none');
    await expect(hub).toHaveCSS('color', english ? 'rgb(255, 255, 255)' : 'rgb(21, 18, 14)');
    await hub.focus();
    await expect(hub).toBeFocused();
    await expect(hub).toHaveCSS('outline-style', 'none');
    const catalogueButton = hub.locator('.et-btn');
    await expect(catalogueButton).not.toHaveClass(/et-btn-paper/);
    await expect(catalogueButton).toHaveCSS('background-color', english ? 'rgb(255, 255, 255)' : 'rgb(21, 18, 14)');
    await page.screenshot({ path: `/tmp/eat-this-article-paper/hub-${info.project.name}-${theme}.png` });
    expect(errors).toEqual([]);
  });
}
