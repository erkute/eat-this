import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.route('**/api/consent', (route) => route.fulfill({ status: 204 }));
  await context.addCookies([
    { name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! },
  ]);
});

for (const locale of ['de', 'en'] as const) {
  test(`map preview filters, pins and handoff (${locale})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: locale === 'en' ? 'reduce' : 'no-preference' });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(locale === 'de' ? '/#hub-map' : '/en#hub-map');
    await expect(page.locator('html')).not.toHaveAttribute('data-hero-intro', '');
    const preview = page.locator('[data-hub-map-preview]');
    await preview.getByRole('button', { name: 'Pizza', exact: true }).click();
    await expect(preview.getByRole('button', { name: 'Gazzo', exact: true })).toBeVisible();
    await expect(preview.locator('h3')).toHaveText('Gazzo');
    await expect(preview.getByRole('button', { name: 'Gazzo', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(preview.locator('.maplibregl-marker [aria-pressed="true"]')).toHaveCount(1);
    const attribution = preview.locator('.maplibregl-ctrl-attrib');
    await expect(attribution.locator('summary')).toBeVisible();
    expect(await attribution.getAttribute('open')).toBeNull();
    await attribution.locator('summary').press('Enter');
    await expect(attribution.getByRole('link', { name: 'OpenStreetMap', exact: true })).toBeVisible();
    const creditBox = await attribution.boundingBox();
    const mapBox = await preview.getByRole('region', { name: /Berlin.*preview|Berlin.*Vorschau/ }).boundingBox();
    expect(Math.abs(mapBox!.y + mapBox!.height - creditBox!.y - creditBox!.height)).toBeLessThan(20);
    expect(creditBox!.x - mapBox!.x).toBeLessThan(20);
    const alignment = await attribution.evaluate((element) => {
      const icon = element.querySelector('summary')!.getBoundingClientRect();
      const text = element.querySelector('.maplibregl-ctrl-attrib-inner')!.getBoundingClientRect();
      return Math.abs(icon.y + icon.height / 2 - text.y - text.height / 2);
    });
    expect(alignment).toBeLessThan(1);
    await attribution.locator('summary').press('Enter');
    const coffee = locale === 'de' ? 'Kaffee' : 'Coffee';
    await preview.getByRole('button', { name: coffee, exact: true }).press('Enter');
    await expect(preview.getByRole('button', { name: coffee, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(preview.locator('h3')).toHaveText('Kolo Coffee');
    const pin = preview.locator('.maplibregl-marker [role="button"]').filter({ hasNot: page.locator('[aria-label="Kolo Coffee"]') }).last();
    const name = await pin.getAttribute('aria-label');
    await pin.press('Enter');
    await expect(preview.locator('h3')).toHaveText(name!);
    await expect(pin).toHaveAttribute('aria-pressed', 'true');
    await expect(preview.getByRole('button', { name: 'Kolo Coffee', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(preview.locator('a[href*="cat=coffee&r="]')).toHaveCount(1);
    expect(await preview.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    const axe = await new AxeBuilder({ page }).include('[data-hub-map-preview]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(axe.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
    if (locale === 'en') {
      expect(await preview.locator('img').last().evaluate((image) => getComputedStyle(image).animationName)).toBe('none');
    }
    await preview.getByRole('button', { name: 'Lunch', exact: true }).click();
    await expect(preview.locator('h3')).toHaveText('Schüsseldienst');
    await page.screenshot({ path: `/tmp/eat-this-map-preview-${test.info().project.name}-${locale}.png` });
    await preview.getByRole('link', { name: locale === 'de' ? 'Zur Map' : 'Open the map', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${locale === 'en' ? '/en' : ''}/map\\?cat=lunch$`));
    await expect(page.getByRole('button', { name: 'Lunch', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('a failed basemap keeps the selected map link usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/basemap/style.json', (route) => route.abort());
  await page.goto('/#hub-map');
  const preview = page.locator('[data-hub-map-preview]');
  await preview.getByRole('button', { name: 'Kaffee', exact: true }).click();
  await expect(preview.getByRole('status')).toContainText('Die Vorschau ist gerade nicht verfügbar');
  await expect(preview.getByRole('link', { name: 'Zur Map' })).toHaveAttribute('href', '/map?cat=coffee');
  await expect(preview.locator('h3')).toHaveText('Kolo Coffee');
});

for (const narrowDesktop of [false, true]) {
  test(`switching spot photos never stretches the map or moves its CTA${narrowDesktop ? ' (narrow desktop)' : ''}`, async ({ page, isMobile }) => {
    test.skip(narrowDesktop && isMobile, 'The regular case already covers the phone layout.');
    if (narrowDesktop) await page.setViewportSize({ width: 768, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Exercise different intrinsic dimensions independently of the current CMS
    // photos. Pin art is kept intact; only the detail photo uses w >= 256.
    let imageIndex = 0;
    await page.route('https://cdn.sanity.io/images/**', async (route) => {
      const width = Number(new URL(route.request().url()).searchParams.get('w'));
      if (width < 256) return route.continue();
      const [w, h] = imageIndex++ % 2 ? [1600, 400] : [400, 1600];
      await route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#a82b2e"/></svg>` });
    });
    await page.goto('/#hub-map');
    const preview = page.locator('[data-hub-map-preview]');
    let first: { height: number; ctaOffset: number; photoWidth: number; photoHeight: number } | undefined;
    for (const category of ['Pizza', 'Kaffee', 'Lunch']) {
      await preview.getByRole('button', { name: category, exact: true }).click();
      const pins = preview.locator('.maplibregl-marker [role="button"]');
      await expect(pins.first()).toBeVisible();
      await expect(pins.first()).toHaveAttribute('aria-label', ({ Pizza: 'Gazzo', Kaffee: 'Kolo Coffee', Lunch: 'Schüsseldienst' })[category]!);
      const names = await pins.evaluateAll((elements) => elements.map((el) => el.getAttribute('aria-label')!));
      // How many pins survive the screen-space spreading depends on the live
      // curation and the viewport (Pizza showed 3 on a phone on 09.10.2026).
      // Two are enough to switch between the portrait and landscape photo.
      expect(names.length).toBeGreaterThanOrEqual(2);
      const positions = await pins.evaluateAll((elements) => elements.map((el) => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, right: rect.right + 6, top: rect.top - 6, bottom: rect.bottom };
      }));
      for (let i = 0; i < positions.length; i++) {
        for (const b of positions.slice(i + 1)) {
          const a = positions[i];
          expect(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top).toBe(true);
        }
      }
      expect(names).not.toContain("VEG'D Friedrichshain");
      for (const name of names) {
        await preview.getByRole('button', { name, exact: true }).click();
        const photo = preview.locator('#home-map-preview > div').nth(1).locator('img');
        await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
        const layout = await preview.evaluate((section) => {
          const frame = section.querySelector('#home-map-preview')!;
          const map = frame.children[0].getBoundingClientRect();
          const detail = frame.children[1].getBoundingClientRect();
          const photo = frame.children[1].querySelector('img')!.getBoundingClientRect();
          const box = frame.getBoundingClientRect();
          const cta = section.lastElementChild!.getBoundingClientRect();
          return { height: box.height, ctaOffset: cta.top - box.top, photoWidth: photo.width, photoHeight: photo.height,
            unexplainedSpace: box.height - (window.innerWidth < 768 ? map.height + detail.height : map.height),
            overflows: section.scrollWidth > section.clientWidth + 1 || frame.children[1].scrollHeight > frame.children[1].clientHeight + 1 };
        });
        first ??= layout;
        expect(Math.abs(layout.height - first.height)).toBeLessThan(1);
        expect(Math.abs(layout.ctaOffset - first.ctaOffset)).toBeLessThan(1);
        expect(Math.abs(layout.photoWidth - first.photoWidth)).toBeLessThan(1);
        expect(Math.abs(layout.photoHeight - first.photoHeight)).toBeLessThan(1);
        expect(Math.abs(layout.unexplainedSpace)).toBeLessThan(1);
        expect(layout.overflows).toBe(false);
      }
    }
  });
}
