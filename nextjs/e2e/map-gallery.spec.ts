import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ context, page, baseURL }) => {
  await page.route('**/api/consent', (route) => route.fulfill({ status: 204 }));
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
});

for (const locale of ['de', 'en'] as const) {
  for (const reduced of [false, true]) {
    test(`restaurant gallery filmstrip ${locale}, reduced motion ${reduced}`, async ({ page, isMobile }, info) => {
      const english = locale === 'en';
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
      await page.goto(`${english ? '/en' : ''}/map?r=gazzo`, { waitUntil: 'domcontentloaded' });
      const opener = page.getByRole('button', { name: `Gazzo: ${english ? 'Photos' : 'Fotos'} 1/2`, exact: true });
      await opener.click();
      const gallery = page.getByRole('dialog', { name: `Gazzo – ${english ? 'Photo gallery' : 'Fotogalerie'}`, exact: true });
      const close = gallery.getByRole('button', { name: english ? 'Close gallery' : 'Galerie schließen' });
      const photoRegion = gallery.getByRole('region', { name: english ? 'Browse photos' : 'Fotos durchblättern' });
      await expect(close).toBeVisible();
      const next = gallery.getByRole('button', { name: english ? 'Next photo' : 'Nächstes Foto', exact: true });
      const previous = gallery.getByRole('button', { name: english ? 'Previous photo' : 'Vorheriges Foto', exact: true });
      const first = gallery.getByRole('button', { name: english ? 'Photo 1 of 2' : 'Foto 1 von 2', exact: true });
      const second = gallery.getByRole('button', { name: english ? 'Photo 2 of 2' : 'Foto 2 von 2', exact: true });
      await expect(close).toBeFocused();
      await expect(first).toHaveAttribute('aria-pressed', 'true');
      if (isMobile) {
        await expect(previous).toBeHidden();
        await expect(next).toBeHidden();
      } else {
        await expect(previous).toBeDisabled();
      }
      const photo = gallery.getByRole('img', { name: 'Gazzo', exact: true });
      await expect(photo).toBeVisible();
      await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      await expect(gallery.getByRole('link')).toHaveAttribute('href', /^https:\/\/(www\.)?instagram\.com\/gazzopizza\/?$/);
      const firstCredit = await gallery.getByRole('link').getAttribute('href');
      expect(await gallery.getByRole('link').evaluate(el => getComputedStyle(el).fontFamily)).toContain('providence');
      await expect(gallery.locator('span').filter({ hasText: /^Gazzo$/ })).toHaveCount(0);
      const creditBox = (await gallery.getByRole('link').boundingBox())!;
      expect(creditBox.x).toBeGreaterThan(page.viewportSize()!.width / 2);
      const photoBox = (await photo.boundingBox())!;
      expect(Math.abs(photoBox.x + photoBox.width / 2 - page.viewportSize()!.width / 2)).toBeLessThan(2);
      expect(Math.abs(photoBox.y + photoBox.height / 2 - page.viewportSize()!.height / 2)).toBeLessThan(2);
      expect(creditBox.y).toBeGreaterThan(photoBox.y + photoBox.height);
      expect(creditBox.y + creditBox.height).toBeLessThan((await first.boundingBox())!.y);
      await page.screenshot({ path: `/tmp/eat-this-gallery/refinement/${info.project.name}-${locale}-${reduced}.png` });

      if (isMobile) {
        const bounds = (await photo.boundingBox())!;
        const cdp = await page.context().newCDPSession(page);
        const y = bounds.y + bounds.height / 2;
        const start = bounds.x + bounds.width * 0.85;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start, y }] });
        for (let step = 1; step <= 10; step++) {
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: start - bounds.width * 0.7 * step / 10, y }],
          });
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cdp.detach();
        await expect(second).toHaveAttribute('aria-pressed', 'true');
        await expect(close).toBeVisible();
        await first.click();
        await expect(first).toHaveAttribute('aria-pressed', 'true');
      }

      // Direct thumbnail selection updates both photograph and attribution.
      await second.click();
      await expect(second).toHaveAttribute('aria-pressed', 'true');
      await expect(gallery.getByRole('status')).toHaveText(english ? 'Photo 2 of 2' : 'Foto 2 von 2');
      if (!isMobile) await expect(next).toBeDisabled();
      await expect(gallery.getByRole('link')).not.toHaveAttribute('href', firstCredit!);

      // Reflow must retain the chosen photo (especially phone rotation).
      const viewport = page.viewportSize()!;
      await page.setViewportSize({ width: viewport.height, height: viewport.width });
      await expect(second).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(() => gallery.getByRole('img').filter({ visible: true }).first().evaluate((img) => {
        const bounds = img.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= window.innerWidth;
      })).toBe(true);
      await page.setViewportSize(viewport);
      await expect(second).toHaveAttribute('aria-pressed', 'true');

      // Desktop arrows retain focus; touch uses thumbnails without hidden controls.
      if (isMobile) {
        await first.click();
        await expect(first).toHaveAttribute('aria-pressed', 'true');
        await close.focus();
        await page.keyboard.press('Tab');
        await expect(photoRegion).toBeFocused();
      } else {
        await previous.click();
        await expect(first).toHaveAttribute('aria-pressed', 'true');
        await expect(next).toBeFocused();
      }
      await page.keyboard.press('ArrowRight');
      await expect(second).toHaveAttribute('aria-pressed', 'true');
      await expect(isMobile ? photoRegion : previous).toBeFocused();
      await page.keyboard.press('ArrowLeft');
      await expect(first).toHaveAttribute('aria-pressed', 'true');
      await expect(isMobile ? photoRegion : next).toBeFocused();

      // Tab wraps inside the dialog; hidden slides cannot receive focus.
      await close.focus();
      await page.keyboard.press('Shift+Tab');
      await expect(second).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(close).toBeFocused();
      const a11y = await new AxeBuilder({ page })
        .include('[role="dialog"][aria-modal="true"]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(a11y.violations).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(gallery).toHaveCount(0);
      await expect(opener).toBeFocused();
      const secondOpener = page.getByRole('button', {
        name: `Gazzo: ${english ? 'Photos' : 'Fotos'} 2/2`, exact: true,
      });
      await secondOpener.click();
      await expect(second).toHaveAttribute('aria-pressed', 'true');
      await expect(gallery.getByRole('status')).toHaveText(english ? 'Photo 2 of 2' : 'Foto 2 von 2');
      if (isMobile) {
        const bounds = (await gallery.getByRole('img').filter({ visible: true }).first().boundingBox())!;
        const cdp = await page.context().newCDPSession(page);
        const x = bounds.x + bounds.width / 2;
        const y = bounds.y + bounds.height / 2;
        const swipe = async (distance: number, cancel = false) => {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
          for (let step = 1; step <= 10; step++) {
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchMove', touchPoints: [{ x: x + step, y: y + distance * step / 10 }],
            });
          }
          await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
        };
        await swipe(30);
        await expect(close).toBeVisible();
        await swipe(-120);
        await expect(close).toBeVisible();
        await swipe(140, true);
        await expect(close).toBeVisible();
        await swipe(140);
        await cdp.detach();
      } else {
        await close.click();
      }
      await expect(gallery).toHaveCount(0);
      await expect(secondOpener).toBeFocused();
      expect(errors).toEqual([]);
    });
  }
}

test('gallery reserves the photo and credit layout while the full image loads', async ({ page }, info) => {
  await page.goto('/map?r=gazzo', { waitUntil: 'domcontentloaded' });
  const opener = page.getByRole('button', { name: 'Gazzo: Fotos 1/2', exact: true });
  await expect(opener).toBeVisible();
  let releaseImages!: () => void;
  const imagesReady = new Promise<void>((resolve) => { releaseImages = resolve; });
  await page.route('https://cdn.sanity.io/images/**', async (route) => {
    await imagesReady;
    await route.continue();
  });
  try {
    await opener.click();
    const gallery = page.getByRole('dialog', { name: 'Gazzo – Fotogalerie', exact: true });
    const photo = gallery.getByRole('img', { name: 'Gazzo', exact: true });
    await expect(photo).toBeAttached();
    expect(await photo.evaluate((img: HTMLImageElement) => img.complete)).toBe(false);
    const credit = gallery.getByRole('link');
    const creditBox = (await credit.boundingBox())!;
    expect(creditBox.height, 'Credit must stay on one line before the photo loads').toBeLessThan(30);
    const before = (await photo.boundingBox())!;
    expect(before.width).toBeGreaterThan(200);
    expect(before.height).toBeGreaterThan(200);
    await page.screenshot({ path: `/tmp/eat-this-gallery/loading-${info.project.name}.png` });
    releaseImages();
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const after = (await photo.boundingBox())!;
    for (const dimension of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(before[dimension] - after[dimension]), `${dimension} must not jump after loading`).toBeLessThan(2);
    }
  } finally {
    releaseImages();
    await page.unrouteAll({ behavior: 'wait' });
  }
});
