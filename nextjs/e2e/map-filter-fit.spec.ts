import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

for (const locale of ['de', 'en']) {
  test(`all map filters remain reachable with three selections (${locale})`, async ({ page, context, baseURL }, info) => {
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
    await page.goto(`${locale === 'en' ? '/en' : ''}/map?cat=dinner&bezirk=charlottenburg&price=20`, { waitUntil: 'domcontentloaded' });
    const row = page.locator('[data-filter-chip-row]');
    const district = row.getByRole('button', { name: 'Charlottenburg', exact: true });
    await expect(district).toBeVisible();
    const widths = info.project.name === 'desktop' ? [1024, 1280, 1440] : [320, 375, 390];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => row.evaluate(el => {
        const bounds = el.getBoundingClientRect();
        return el.scrollWidth <= el.clientWidth + 1 && [...el.querySelectorAll('button')].every(button => {
          const box = button.getBoundingClientRect();
          return box.left >= bounds.left && box.right <= bounds.right && box.width >= 24;
        });
      })).toBe(true);
      if (width >= 1024) {
        await expect.poll(async () => {
          const menu = await page.getByRole('button', { name: locale === 'en' ? 'Menu' : 'Menü', exact: true }).boundingBox();
          const chip = await district.boundingBox();
          return Math.abs(menu!.y + menu!.height / 2 - chip!.y - chip!.height / 2);
        }).toBeLessThan(1);
      }
    }
    const open = row.getByRole('button', { name: locale === 'en' ? 'Open now' : 'Geöffnet', exact: true });
    await open.click();
    await expect(open).toHaveAttribute('aria-pressed', 'true');
    await district.click();
    await expect(district).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(district).toHaveAttribute('aria-expanded', 'false');
    await row.getByRole('button', { name: /: (Bezirk|District)$/ }).click();
    await expect(row.getByRole('button', { name: locale === 'en' ? 'District' : 'Bezirk', exact: true })).toBeVisible();
    await expect(open).toHaveAttribute('aria-pressed', 'true');
  });
}
