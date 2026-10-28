import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

for (const locale of ['de', 'en'] as const) {
  for (const reduced of [false, true]) {
    test(`home map screens swipe and still open the map (${locale}, reduced ${reduced})`, async ({ page, context, baseURL, isMobile }, info) => {
      await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
      await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
      await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      const prefix = locale === 'en' ? '/en' : '';
      await page.goto(prefix || '/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).not.toHaveAttribute('data-hero-intro', '');
      const section = page.locator('[data-hub-map-intro]');
      const controls = section.getByRole('group');
      const first = controls.getByRole('button').nth(0);
      const second = controls.getByRole('button').nth(1);
      const phone = section.getByRole('link', { name: locale === 'de' ? 'Food Map öffnen' : 'Open the food map', exact: true });
      await first.click();
      await phone.scrollIntoViewIfNeeded();
      await expect(first).toHaveAttribute('aria-pressed', 'true');
      if (isMobile) {
        const cdp = await context.newCDPSession(page);
        const swipe = async (dx: number, dy = 0) => {
          const bounds = (await phone.boundingBox())!;
          const x = bounds.x + bounds.width * (dx < 0 ? .8 : dx > 0 ? .2 : .5);
          const y = bounds.y + bounds.height * .55;
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
          for (let step = 1; step <= 12; step++) {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * step / 12, y: y + dy * step / 12 }] });
            await page.waitForTimeout(16);
          }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        };
        const width = (await phone.boundingBox())!.width;
        await swipe(-width * .6);
        await expect(second).toHaveAttribute('aria-pressed', 'true');
        await page.waitForTimeout(200);
        await expect(page).toHaveURL(prefix || '/');
        await swipe(width * .6);
        await expect(first).toHaveAttribute('aria-pressed', 'true');
        await page.waitForTimeout(200);
        const before = await page.evaluate(() => window.scrollY);
        await swipe(0, -120);
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 30);
        await expect(first).toHaveAttribute('aria-pressed', 'true');
        await expect(page).toHaveURL(prefix || '/');
        await cdp.detach();
        await phone.scrollIntoViewIfNeeded();
        // A tap during kinetic page scrolling stops the scroll rather than opening a link.
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `/tmp/eat-this-home-map-swipe-${info.project.name}-${locale}-${reduced}.png` });
        await phone.tap();
      } else {
        await second.click();
        await expect(second).toHaveAttribute('aria-pressed', 'true');
        await page.screenshot({ path: `/tmp/eat-this-home-map-swipe-${info.project.name}-${locale}-${reduced}.png` });
        await phone.click();
      }
      await expect(page).toHaveURL(`${prefix}/map`);
      expect(errors).toEqual([]);
    });
  }
}
