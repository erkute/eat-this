import { expect, test, type Locator } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

// CSS viewport sizes, not a claim of physical-device coverage.
const viewports = [
  ['iphone', 390, 844], ['iphone-pro', 402, 874], ['iphone-pro-max', 440, 956],
  ['ipad-mini', 744, 1133], ['ipad-mini-classic', 768, 1024], ['ipad', 820, 1180], ['ipad-split-view', 540, 720],
] as const;

async function showSection(section: Locator) {
  await section.evaluate((element) => {
    const frame = element.closest<HTMLElement>('.app-pages');
    const scroller = frame && getComputedStyle(frame).overflowY === 'auto' ? frame : window;
    const scrollTop = scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop;
    scroller.scrollTo({ top: element.getBoundingClientRect().top + scrollTop - 52, behavior: 'instant' });
  });
}

for (const [device, width, height] of viewports) {
  test(`${device}: every home section fits in both orientations`, async ({ page, context, baseURL }, info) => {
    test.setTimeout(120_000);
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    for (const orientation of ['portrait', 'landscape', 'portrait-return'] as const) {
      const viewport = orientation === 'landscape' ? { width: height, height: width } : { width, height };
      await page.setViewportSize(viewport);
      const sections = page.locator('main[data-hub] > section, [data-hub-starter]');
      for (const section of await sections.all()) {
        await showSection(section);
        await expect.poll(() => section.evaluate(e => e.scrollWidth - e.clientWidth), { message: `${device} ${orientation}: section overflow`, timeout: 3000 }).toBeLessThanOrEqual(2);
        const heading = section.locator('h2:not([class*="heroAccessible"])').first();
        if (await heading.count()) {
          const box = (await heading.boundingBox())!;
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
        }
      }
      const heroCard = page.locator('[class*="heroCardFront"]').first();
      await expect.poll(async () => (await heroCard.boundingBox())?.width ?? 0).toBeGreaterThan(60);
      const intro = page.locator('[data-hub-map-intro]');
      await showSection(intro);
      const phone = intro.locator('[class*="showcase"]').first();
      if (viewport.width < 1024) expect((await phone.boundingBox())!.width).toBeLessThanOrEqual(240);
      const cards = page.locator('[data-hub-musteats] [data-stack-photo]');
      await showSection(page.locator('[data-hub-musteats]'));
      expect((await cards.first().boundingBox())!.width).toBeLessThanOrEqual(240);
      if (viewport.width >= 600 && viewport.width <= 899) {
        const first = (await cards.nth(0).boundingBox())!;
        const third = (await cards.nth(2).boundingBox())!;
        expect(Math.abs(first.y - third.y), 'tablet cards use three columns').toBeLessThan(2);
      }
      const remy = page.locator('[data-hub-fragremy]');
      await showSection(remy);
      const face = remy.locator('img[src*="buddy.webp"]');
      await expect.poll(() => face.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      const faceBox = (await face.boundingBox())!;
      const stage = (await remy.boundingBox())!;
      if (viewport.width < 600) {
        const form = (await remy.locator('form').boundingBox())!;
        expect(faceBox.y, 'The form must not cover Remy’s head').toBeGreaterThanOrEqual(form.y + form.height + 8);
      }
      expect(faceBox.y + faceBox.height * .5, 'Remy’s face remains above the clipped lower edge').toBeLessThan(stage.y + stage.height);
      if (orientation !== 'portrait-return') {
        await page.screenshot({ path: `/tmp/eat-this-device-layout/${info.project.name}-${device}-${orientation}-remy.png` });
        await showSection(page.locator('[data-hub-musteats]'));
        await page.screenshot({ path: `/tmp/eat-this-device-layout/${info.project.name}-${device}-${orientation}-cards.png` });
      }
    }
  });
}

for (const width of [390, 744]) {
  test(`Remy completes his entrance at ${width}px`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.setViewportSize({ width, height: width === 744 ? 1133 : 844 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const section = page.locator('[data-hub-fragremy]');
    await showSection(section);
    await expect.poll(async () => {
      const face = await section.locator('img[src*="buddy.webp"]').boundingBox();
      const stage = await section.boundingBox();
      return !!face && !!stage && face.y + face.height * .5 < stage.y + stage.height;
    }).toBe(true);
  });
}
