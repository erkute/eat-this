import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONSENT_VERSION } from '../lib/consent';

for (const locale of ['de', 'en'] as const) {
  for (const [width, height, reduced] of [[375, 812, false], [568, 320, true], [667, 375, true], [1440, 1000, false]] as const) {
    test(`magazine archive ${locale} ${width}x${height}`, async ({ page, context, baseURL, isMobile }) => {
      test.skip(isMobile ? width === 1440 : width !== 1440, 'Phone projects use phone viewports; the desktop project uses the desktop viewport.');
      await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
      await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
      await page.goto(`${locale === 'en' ? '/en' : ''}/news`);
      await expect(page.locator('[data-current-issue]')).toBeVisible();
      await expect(page.getByRole('searchbox')).toHaveCount(0);
      await expect(page.getByRole('combobox')).toHaveCount(0);
      await expect(page.getByRole('link', { name: locale === 'de' ? 'Im Archiv stöbern' : 'Browse the archive', exact: true })).toHaveCount(0);
      const recent = page.getByRole('region', { name: locale === 'de' ? 'Zuletzt erschienen' : 'Recent issues', exact: true });
      await expect(recent.getByRole('link')).toHaveCount(2);
      if (width > height) {
        await recent.getByRole('heading', { level: 2 }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `/tmp/eat-this-magazine-recent-${locale}-${width}.png` });
      }
      const archive = page.getByRole('region', { name: locale === 'de' ? 'Alle weiteren Ausgaben' : 'All other issues', exact: true });
      await archive.getByRole('heading', { level: 2 }).scrollIntoViewIfNeeded();
      await expect(archive.getByRole('heading', { level: 2 })).toBeInViewport();
      await expect(archive.getByRole('searchbox')).toHaveCount(0);
      await expect(archive.getByRole('combobox')).toHaveCount(0);
      expect(await archive.getByRole('listitem').count()).toBeGreaterThan(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const axe = await new AxeBuilder({ page }).include('main#news')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(axe.violations.map(({ id }) => id)).toEqual([]);
      await page.screenshot({ path: `/tmp/eat-this-magazine-${locale}-${width}.png` });
      const link = archive.getByRole('link').first();
      await link.scrollIntoViewIfNeeded();
      if (width > height) {
        const cover = link.locator('[data-magazine-cover]');
        expect((await cover.boundingBox())!.width).toBeGreaterThanOrEqual(140);
      }
      await page.screenshot({ path: `/tmp/eat-this-magazine-archive-${locale}-${width}.png` });
      const href = await link.getAttribute('href');
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }
}
