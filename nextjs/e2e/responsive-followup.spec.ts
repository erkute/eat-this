import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

for (const size of [{ width: 320, height: 740 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test(`editorial surfaces and footer fit ${size.width}x${size.height}`, async ({ page, context, baseURL }, info) => {
    test.skip(info.project.name !== 'desktop', 'Explicit viewport matrix.');
    await page.setViewportSize(size);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    for (const path of ['/news/schuesseldienst-schoeneberg', '/restaurant/schuesseldienst']) {
      await page.goto(path);
      const surface = page.locator('[data-page="news-article"], main[data-page="restaurant"]');
      await expect(surface).toBeVisible();
      await expect(surface).toHaveCSS('background-image', 'none');
      if (path.startsWith('/news/') && size.width > size.height && size.width < 1024) {
        const opener = surface.locator('[class*="heroMedia_"]');
        await expect(opener).toBeVisible();
        expect((await opener.boundingBox())!.height).toBeLessThan(size.height - 60);
      }
      const overflow = await surface.evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, elements: [...el.querySelectorAll('*')].filter(node => { const r = node.getBoundingClientRect(); return r.right > window.innerWidth + 1 || r.left < -1; }).map(node => ({ tag: node.tagName, cls: node.className, width: node.getBoundingClientRect().width, text: node.textContent?.slice(0, 50) })).slice(0, 15) }));
      expect(overflow.scroll, JSON.stringify({ path, ...overflow })).toBeLessThanOrEqual(overflow.width + 1);
      const footer = page.getByRole('contentinfo');
      await footer.getByRole('button', { name: 'Dunkel', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expect(surface).toHaveCSS('background-image', 'none');
      await footer.getByRole('button', { name: 'Hell', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      await expect(footer.getByRole('navigation').getByRole('button', { name: 'Cookies verwalten' })).toHaveCount(0);
      await expect(footer.getByRole('button', { name: 'Cookies verwalten' })).toBeVisible();
    }
  });
}
