import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
  await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
});

for (const route of ['/', '/en/news', '/news/gazzo-pizza-neukoelln', '/map?r=gazzo', '/must-eats', '/packs', '/kategorie/pizza', '/bezirk/neukoelln', '/about', '/contact']) {
  test(`controls use app touch feedback: ${route}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('main')).toBeVisible();
    const controls = page.locator('a[href], button, summary, input, select, textarea, [role="button"]');
    expect(await controls.count()).toBeGreaterThan(0);
    const nativeHighlights = await controls.evaluateAll(elements => elements
      .filter(element => getComputedStyle(element).getPropertyValue('-webkit-tap-highlight-color') !== 'rgba(0, 0, 0, 0)')
      .map(element => ({ tag: element.tagName, label: element.getAttribute('aria-label'), text: element.textContent?.slice(0, 60) })));
    expect(nativeHighlights).toEqual([]);
  });
}

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`touch is frame-free and keyboard focus stays visible (${reducedMotion})`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/news');
    const menuButton = page.getByRole('button', { name: 'Menü', exact: true });
    if (isMobile) await menuButton.tap();
    else await menuButton.click();
    const menu = page.getByRole('dialog', { name: 'Navigation', exact: true });
    const dark = menu.getByRole('button', { name: 'Dunkel', exact: true });
    if (isMobile) await dark.tap();
    else await dark.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(dark).not.toHaveCSS('outline-style', 'solid');
    await expect(dark).toHaveCSS('box-shadow', 'none');

    // Tab switches input modality; a touch device can still have a keyboard.
    await page.keyboard.press('Tab');
    await dark.focus();
    await expect(dark).toHaveCSS('outline-style', 'solid');
    await expect(dark).toHaveCSS('outline-width', '2px');
    await page.keyboard.press('Tab');
    await menu.getByRole('button', { name: 'Hell', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
  });
}

test('map menu hover only responds to a mouse', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/map');
  const menuButton = page.locator('.et-btn-map-control');
  await expect(menuButton).toBeVisible();
  const restingFilter = await menuButton.evaluate(element => getComputedStyle(element).filter);
  if (isMobile) await menuButton.tap();
  else {
    await menuButton.hover();
    await expect(menuButton).not.toHaveCSS('filter', restingFilter);
    await menuButton.click();
  }
  const menu = page.getByRole('dialog', { name: 'Navigation', exact: true });
  await expect(menu).toBeVisible();
  if (isMobile) await expect(menuButton).toHaveCSS('filter', restingFilter);
  await menu.getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(menu).toBeHidden();
});

test('article link separates touch, mouse hover and keyboard focus', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/news/essen-trinken-schoeneberg');
  const link = page.locator('.et-paper-link');
  await expect(link).toBeVisible();
  const restingColor = await link.evaluate(element => getComputedStyle(element).backgroundColor);
  if (isMobile) {
    // Stay on this page to inspect the synthetic hover left behind by a tap.
    await link.evaluate(element => element.addEventListener('click', event => event.preventDefault(), { once: true }));
    await link.tap();
    await expect(link).toHaveCSS('background-color', restingColor);
  } else {
    await link.hover();
    await expect(link).not.toHaveCSS('background-color', restingColor);
    await page.mouse.move(0, 0);
    await expect(link).toHaveCSS('background-color', restingColor);
  }
  await page.keyboard.press('Tab');
  await link.focus();
  await expect(link).not.toHaveCSS('background-color', restingColor);
});

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`press feedback is visible and clears after release (${reducedMotion})`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/news');
    const controls = [
      page.getByRole('button', { name: 'Menü', exact: true }),
      page.locator('main .et-btn').first(),
      page.locator('main a[href^="/news/"]:not(.et-btn)').first(),
    ];
    for (const control of controls) {
      await control.scrollIntoViewIfNeeded();
      const restingOpacity = await control.evaluate(element => getComputedStyle(element).opacity);
      await control.evaluate(element => element.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        element.setAttribute('data-test-press-opacity', getComputedStyle(element).opacity);
      }, { capture: true, once: true }));
      let pressedOpacity: string | null;
      if (isMobile) {
        await control.tap();
        pressedOpacity = await control.getAttribute('data-test-press-opacity');
      } else {
        await control.hover();
        await page.mouse.down();
        pressedOpacity = await control.evaluate(element => getComputedStyle(element).opacity);
        await page.mouse.up();
        await page.mouse.move(0, 0);
      }
      expect(pressedOpacity).not.toBeNull();
      expect(Number(pressedOpacity)).toBeLessThan(Number(restingOpacity) - 0.1);
      await expect(control).toHaveCSS('opacity', restingOpacity);
    }
  });
}
