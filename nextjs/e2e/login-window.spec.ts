import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONSENT_VERSION } from '../lib/consent';

for (const english of [false, true]) {
  test(`login window keeps its form and keyboard navigation usable (${english ? 'EN' : 'DE'})`, async ({ page, context, baseURL, isMobile }, info) => {
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
    await page.addInitScript(dark => localStorage.setItem('et-theme', dark ? 'dark' : 'light'), english);
    await page.emulateMedia({ reducedMotion: english ? 'reduce' : 'no-preference' });
    await page.goto(`${english ? '/en' : ''}/map?r=gazzo`, { waitUntil: 'domcontentloaded' });
    await page.locator('.maplibregl-marker').first().waitFor({ state: 'visible' });
    const opener = page.locator('[data-detail-root="restaurant"]').getByRole('button', { name: english ? 'Heart this spot' : 'Spot herzen', exact: true });
    await opener.click();
    const dialog = page.getByRole('dialog').filter({ has: page.getByRole('textbox') });
    await expect(dialog).toHaveAccessibleName(/.+/);
    const close = dialog.getByRole('button', { name: english ? 'Back' : 'Zurück', exact: true });
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(close).toBeFocused();
    await expect(dialog).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(dialog).toHaveCSS('background-image', 'none');
    await expect(dialog).toHaveCSS('border-width', '0px');
    await expect(dialog).toHaveCSS('box-shadow', 'none');
    await expect(dialog.locator('..')).toHaveCSS('background-image', /folded-white\.webp/);
    await expect(dialog.locator('..')).toHaveCSS('background-color', 'rgb(207, 63, 47)');
    await expect(dialog.locator('img')).toHaveCount(1);
    await expect(dialog.locator('img')).toHaveAttribute('src', /starter-pack-front\.webp/);
    const sizes = isMobile ? [{ width: 390, height: 844 }] : [{ width: 1440, height: 1000 }, { width: 1024, height: 600 }];
    for (const viewport of sizes) {
      await page.setViewportSize(viewport);
      await expect.poll(() => dialog.evaluate((element, size) => {
        const bounds = element.getBoundingClientRect();
        return bounds.left >= 0 && bounds.top >= 0 && bounds.right <= size.width && bounds.bottom <= size.height;
      }, viewport)).toBe(true);
      const submit = dialog.locator('button[type="submit"]');
      await submit.scrollIntoViewIfNeeded();
      await expect(submit).toBeInViewport({ ratio: 1 });
      if (!isMobile) await expect(close).toBeInViewport({ ratio: 1 });
    }
    await page.setViewportSize(sizes[0]);
    const email = dialog.getByRole('textbox');
    await expect(email).toHaveCSS('mask-image', 'none');
    await expect(email).toHaveCSS('box-shadow', 'none');
    const idleBackground = await email.evaluate(element => getComputedStyle(element).backgroundColor);
    await email.click();
    await expect(email).toBeFocused();
    await expect(email).toHaveCSS('mask-image', 'none');
    await expect(email).toHaveCSS('box-shadow', 'none');
    await expect(email).toHaveCSS('outline-style', 'none');
    await expect(email).not.toHaveCSS('background-color', idleBackground);
    await page.screenshot({ path: `/tmp/eat-this-login-field/focus-${info.project.name}-${english ? 'en' : 'de'}.png` });
    await close.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('link').last()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await dialog.getByRole('textbox').fill('keine-adresse');
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByRole('alert')).toBeVisible();
    const a11y = await new AxeBuilder({ page }).include('[role="dialog"][aria-modal="true"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(a11y.violations).toEqual([]);
    await page.screenshot({ path: `/tmp/eat-this-login-window/${info.project.name}-${english ? 'en' : 'de'}.png` });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await opener.click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(2, 2);
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
}
