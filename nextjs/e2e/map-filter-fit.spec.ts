import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

for (const locale of ['de', 'en']) {
  test(`all map filter values stay fully readable with all four filters active (${locale})`, async ({ page, context, baseURL }, info) => {
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
    await page.goto(`${locale === 'en' ? '/en' : ''}/map?cat=must-eats&bezirk=charlottenburg&price=10&open=1`, { waitUntil: 'domcontentloaded' });
    const row = page.locator('[data-filter-chip-row]');
    const district = row.getByRole('button', { name: 'Charlottenburg', exact: true });
    await expect(district).toBeVisible();
    const widths = info.project.name === 'desktop' ? [1024, 1280, 1440] : [320, 375, 390];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => row.evaluate(el => {
        const chips = [...el.children].map(chip => chip.getBoundingClientRect());
        return chips.every(box => Math.abs(box.top - chips[0].top) < 1) &&
          [...el.querySelectorAll('button')].every(button => button.getBoundingClientRect().width >= 24);
      })).toBe(true);
      await expect.poll(() => row.locator('[class*="filterChipLabel"]').evaluateAll(labels =>
        labels.length === 4 && labels.every(label => {
          const style = getComputedStyle(label);
          return style.textOverflow !== 'ellipsis' && label.scrollWidth <= label.clientWidth + 1 && label.scrollHeight <= label.clientHeight + 1;
        })
      )).toBe(true);
      if (width >= 1024) {
        await expect.poll(async () => {
          const menu = await page.getByRole('button', { name: locale === 'en' ? 'Menu' : 'Menü', exact: true }).boundingBox();
          const chip = await district.boundingBox();
          return Math.abs(menu!.y + menu!.height / 2 - chip!.y - chip!.height / 2);
        }).toBeLessThan(1);
      }
    }
    const open = row.getByRole('button', { name: locale === 'en' ? 'Open now' : 'Geöffnet', exact: true });
    await open.scrollIntoViewIfNeeded();
    await expect(open).toHaveAttribute('aria-pressed', 'true');
    await expect(open).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(open).toHaveCSS('background-blend-mode', 'difference');
    await expect(open).toHaveCSS('background-image', /silver-hero\/paper/);
    await open.click();
    await expect(open).toHaveAttribute('aria-pressed', 'false');
    await open.click();
    await expect(open).toHaveAttribute('aria-pressed', 'true');
    await district.scrollIntoViewIfNeeded();
    await district.click();
    await expect(district).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(district).toHaveAttribute('aria-expanded', 'false');
    await row.getByRole('button', { name: /: (Bezirk|District)$/ }).click();
    await expect(row.getByRole('button', { name: locale === 'en' ? 'District' : 'Bezirk', exact: true })).toBeVisible();
    await expect(open).toHaveAttribute('aria-pressed', 'true');
  });
}
