import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.route('**/api/consent', (route) => route.fulfill({ status: 204 }));
  await context.addCookies([
    { name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! },
  ]);
});

for (const route of ['/', '/news', '/en/news']) {
  for (const reduced of [false, true]) {
    test(`${route}: Remy opens and leaves by touch (reduced motion: ${reduced})`, async ({ page, isMobile }) => {
      const errors: string[] = [];
      const consoleErrors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page).toHaveTitle(route === '/' ? /EAT THIS/ : /News/);
      await expect(page.locator('html')).not.toHaveAttribute('data-hero-intro', '');

      const launcher = page.locator('[data-buddy-launcher]');
      const dock = launcher.locator('..');
      await expect(dock).not.toHaveAttribute('data-entrance', 'playing');
      await expect(launcher).toBeVisible();
      if (isMobile) await launcher.tap();
      else await launcher.click();
      const panel = page.locator('#buddy-panel');
      await expect(panel).toBeVisible();
      const close = panel.getByRole('button', { name: route.startsWith('/en') ? 'Close' : 'Schließen', exact: true });
      if (isMobile) await close.tap();
      else await close.click();
      await expect(panel).toBeHidden();
      await expect(launcher).toBeVisible();

      // The fixed controls must also work after scrolling, above the footer.
      await page.locator('[data-site-footer]').scrollIntoViewIfNeeded();
      if (isMobile) await launcher.tap();
      else await launcher.click();
      await expect(panel).toBeVisible();
      if (isMobile) await close.tap();
      else await close.click();
      await expect(panel).toBeHidden();
      const dismiss = page.locator('[data-buddy-launcher-dismiss]');
      const box = (await dismiss.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(await launcher.evaluate((element) => getComputedStyle(element, '::before').backgroundColor))
        .not.toBe(await page.locator('[data-site-footer]').evaluate((element) => getComputedStyle(element).backgroundColor));
      await page.screenshot({ path: `/tmp/eat-this-remy-${test.info().project.name}-${route.replaceAll('/', '-')}-${reduced}.png`, scale: 'css' });

      // Tap outside the visible 28px badge, inside its real 44px button.
      if (isMobile) await dismiss.tap({ position: { x: 4, y: 4 } });
      else await dismiss.click({ position: { x: 4, y: 4 } });
      if (!reduced) {
        await expect(dock).toHaveAttribute('data-leaving', 'true');
        const finalLeft = await dock.evaluate((element) => {
          const animation = element.getAnimations()[0];
          if (!animation) throw new Error('Missing Remy exit animation');
          animation.pause();
          animation.currentTime = Number(animation.effect!.getTiming().duration);
          return element.getBoundingClientRect().left;
        });
        expect(finalLeft).toBeGreaterThan(page.viewportSize()!.width);
      }
      await expect(launcher).toHaveCount(0);
      expect(await page.evaluate(() => sessionStorage.getItem('buddyLauncherHidden'))).toBe('1');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1')).toBeVisible();
      await expect(launcher).toHaveCount(0);
      expect(errors).toEqual([]);
      // WebKit reports the site's intentional Report-Only CSP here; local
      // previews can also lack private Must-Eat images. Keep the evidence
      // without making unrelated infrastructure part of this interaction test.
      if (consoleErrors.length) {
        await test.info().attach('console-observations', {
          body: consoleErrors.join('\n'),
          contentType: 'text/plain',
        });
      }
    });
  }
}
