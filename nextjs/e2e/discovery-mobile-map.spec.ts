import { expect, test, type Page } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ page, context, baseURL, isMobile }) => {
  if (isMobile) await page.setViewportSize({ width: 375, height: 812 });
  await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
});

/** Use an actual point inside the polygon, including WebKit's SVG hit test. */
async function selectDistrict(page: Page, slug: string, touch: boolean) {
  const point = await page.locator(`[data-map-area="${slug}"] path`).evaluate(node => {
    const path = node as SVGPathElement;
    const bounds = path.getBBox();
    const matrix = path.getScreenCTM()!;
    for (let y = .2; y <= .8; y += .1) for (let x = .2; x <= .8; x += .1) {
      const local = new DOMPoint(bounds.x + bounds.width * x, bounds.y + bounds.height * y);
      if (!path.isPointInFill(local)) continue;
      const screen = local.matrixTransform(matrix);
      if (path.parentElement!.contains(document.elementFromPoint(screen.x, screen.y))) return { x: screen.x, y: screen.y };
    }
    throw new Error('No visible hit target inside district');
  });
  if (touch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}

for (const locale of ['de', 'en'] as const) {
  for (const motion of ['no-preference', 'reduce'] as const) {
    test(`unlabelled Berlin map opens a district page and returns (${locale}, ${motion})`, async ({ page, isMobile }) => {
      const prefix = locale === 'de' ? '' : '/en';
      await page.emulateMedia({ reducedMotion: motion });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${prefix}/bezirk`);
      await page.evaluate(() => document.fonts.ready);
      const map = page.getByRole('group', { name: locale === 'de' ? 'Berlin-Karte' : 'Map of Berlin', exact: true });
      await expect(map.locator('[data-map-area]')).toHaveCount(23);
      await expect(map.locator('text')).toHaveCount(0);
      await expect(page.locator('[data-map-remy], #magazine-title, #discovery-preview')).toHaveCount(0);
      await expect(page.locator('#discovery-map-help')).toHaveCount(0);
      await expect(page.locator('#discovery-announcement')).toHaveText(locale === 'de' ? 'Tippe auf einen Bezirk.' : 'Tap a district on the map.');
      await map.evaluate(node => {
        const widths: number[] = [];
        (window as unknown as { discoveryWidths: number[] }).discoveryWidths = widths;
        new MutationObserver(() => widths.push(Number(node.getAttribute('viewBox')!.split(' ')[2])))
          .observe(node, { attributes: true, attributeFilter: ['viewBox'] });
      });
      // The entrance finishes without changing the camera, so there is no
      // unsolicited zoom even when animations are enabled.
      if (motion === 'no-preference') await expect(map.locator('[data-map-boundaries]')).not.toHaveAttribute('style', /opacity:/);
      await expect(map).toHaveAttribute('viewBox', '0 0 640 550');
      expect(await page.evaluate(() => (window as unknown as { discoveryWidths: number[] }).discoveryWidths)).toEqual([]);
      const outline = await map.locator('[data-map-area="mitte"] path').getAttribute('d');
      await page.screenshot({ path: `/tmp/eat-this-map-redesign/qa/${isMobile ? 'phone' : 'desktop'}-${locale}-${motion}-overview.png` });
      await selectDistrict(page, 'mitte', isMobile);
      await expect(page).toHaveURL(`${prefix}/bezirk/mitte`);
      await expect(page.locator('h1')).toHaveText('Mitte');
      await expect(page.locator('[data-district-outline="mitte"]')).toBeVisible();
      await expect(page.locator('[data-district-outline] path')).toHaveAttribute('d', outline!);
      expect(await page.locator('#restaurants [data-spot-card]').count()).toBeGreaterThan(0);
      await expect.poll(() => page.locator('#restaurants img').first().evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      expect(await page.locator('body').evaluate(node => node.scrollWidth <= innerWidth + 1)).toBe(true);
      const widths = await page.evaluate(() => (window as unknown as { discoveryWidths: number[] }).discoveryWidths);
      const sharedZoom = await page.evaluate(() => typeof document.startViewTransition === 'function');
      if (motion === 'reduce' || sharedZoom) expect(widths).toEqual([]);
      else {
        expect(widths.some(width => width > 200 && width < 640)).toBe(true);
        expect(widths.every((width, index) => index === 0 || width <= widths[index - 1])).toBe(true);
      }
      await page.screenshot({ path: `/tmp/eat-this-map-redesign/qa/${isMobile ? 'phone' : 'desktop'}-${locale}-${motion}-mitte.png` });
      await page.getByRole('navigation', { name: locale === 'de' ? 'Zur Berlin-Karte' : 'Back to the Berlin map', exact: true }).getByRole('link').click();
      await expect(page).toHaveURL(`${prefix}/bezirk`);
      await expect(map).toHaveAttribute('viewBox', '0 0 640 550');
      await expect(page.locator('[data-map-opening]')).toHaveAttribute('data-map-opening', 'false');
      expect(errors).toEqual([]);
    });
  }
}

test('hover and keyboard focus identify the district without map labels or underlines', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/bezirk');
  const district = page.getByRole('navigation', { name: 'Alle Bezirke', exact: true }).getByRole('link', { name: 'Mitte', exact: true });
  await district.focus();
  await expect(page.locator('#discovery-announcement')).toContainText('Mitte');
  await expect(district).toHaveAttribute('data-highlighted', 'true');
  expect(await district.evaluate(node => getComputedStyle(node).outlineStyle)).toBe('none');
  expect(await district.evaluate(node => getComputedStyle(node).textDecorationLine)).toBe('none');
  await district.press('Enter');
  await expect(page).toHaveURL(/\/bezirk\/mitte$/);
  const back = page.getByRole('link', { name: 'Zur Berlin-Karte', exact: true });
  if (!isMobile) await back.hover();
  expect(await back.evaluate(node => getComputedStyle(node).textDecorationLine)).toBe('none');
  await page.goBack();
  await expect(page.locator('[data-map-view]')).toHaveAttribute('viewBox', '0 0 640 550');
  if (!isMobile) {
    await district.hover();
    await expect(page.locator('#discovery-announcement')).toContainText('Mitte');
    await expect(district).toHaveAttribute('data-highlighted', 'true');
  }
});

test('districts without spots stay inert and all available districts have real links', async ({ page }) => {
  await page.goto('/bezirk');
  const nav = page.getByRole('navigation', { name: 'Alle Bezirke', exact: true });
  for (const slug of ['spandau', 'lichtenberg', 'reinickendorf']) {
    await expect(nav.locator(`[data-map-area="${slug}"]`)).not.toHaveAttribute('href');
  }
  const links = await nav.getByRole('link').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
  expect(links.length).toBeGreaterThan(5);
  expect(links.every(href => href?.startsWith('/bezirk/'))).toBe(true);
});


test('district glow cycles without a permanent tint and stops on interaction', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/bezirk');
  const preview = page.locator('[data-preview="true"]');
  await expect(preview).toHaveCount(1);
  const first = await preview.getAttribute('data-map-area');
  await expect(preview).not.toHaveAttribute('data-map-area', first!);
  await expect(page.locator('#discovery-announcement')).toContainText('Tippen zum Entdecken');
  await expect(preview).toHaveCSS('fill', 'rgb(168, 43, 46)');
  await page.screenshot({ path: `/tmp/eat-this-map-redesign/qa/${test.info().project.name}-glow.png` });
  await page.getByRole('link', { name: 'Mitte', exact: true }).press('Tab');
  await expect(preview).toHaveCount(0);
  // Ruhend in der Schriftfarbe (--et-fg), hell also Ink, dunkel Weiss.
  await expect(page.locator('[data-map-area="neukoelln"]')).toHaveCSS('fill', 'rgb(21, 18, 14)');
  await page.waitForTimeout(4500);
  await expect(preview).toHaveCount(0);
});

test('reduced motion keeps the idle map in ink without automatic glow', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/bezirk');
  await page.waitForTimeout(2500);
  await expect(page.locator('[data-preview="true"]')).toHaveCount(0);
  await expect(page.locator('[data-map-area="mitte"]')).toHaveCSS('fill', 'rgb(21, 18, 14)');
});
