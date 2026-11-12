import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const theme of ['light', 'dark']) {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    test(`checkout remains readable in ${theme}, motion ${reducedMotion}`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('et-theme', value), theme);
      await page.emulateMedia({ reducedMotion });
      await page.goto('/checkout/success');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kauf nicht gefunden.');
      const contrast = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
      expect(contrast.violations).toEqual([]);
      expect(await page.locator('body').evaluate((body) => body.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: `/tmp/eat-this-${test.info().project.name}-checkout-${theme}-${reducedMotion}.png` });
    });
  }
}
