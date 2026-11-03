import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

for (const orientation of ['vertical', 'horizontal'] as const) {
  for (const paneSize of [360, 540]) {
    test(`dialogs avoid the ${orientation} hinge (${paneSize}px) and recover after unfolding`, async ({ page, context, browserName }, info) => {
      test.skip(browserName !== 'chromium' || info.project.name !== 'desktop', 'Chromium display-feature emulation.');
      const span = paneSize * 2 + 34;
      const viewport = orientation === 'vertical' ? { width: span, height: 720 } : { width: 720, height: span };
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
      await page.goto('/about');
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        ...viewport, screenWidth: viewport.width, screenHeight: viewport.height,
        deviceScaleFactor: 1, mobile: true,
        displayFeature: { orientation, offset: paneSize, maskLength: 34 },
        devicePosture: { type: 'folded' },
      });
      const segment = orientation === 'vertical'
        ? { left: paneSize + 34, top: 0, right: span, bottom: 720 }
        : { left: 0, top: paneSize + 34, right: 720, bottom: span };
      const fits = async (selector: string) => {
        const panel = page.locator(selector);
        await expect(panel).toBeVisible();
        await expect.poll(() => panel.evaluate((el, bounds) => {
          const box = el.getBoundingClientRect();
          return box.left >= bounds.left && box.top >= bounds.top &&
            box.right <= bounds.right + 1 && box.bottom <= bounds.bottom + 1 && el.scrollWidth <= el.clientWidth + 1;
        }, segment)).toBe(true);
      };
      await fits('.cookie-consent:visible');
      await page.getByRole('button', { name: 'Ablehnen', exact: true }).click();
      await page.locator('#burgerBtn').click();
      await fits('[role="dialog"][aria-label="Navigation"]');
      await expect.poll(() => page.locator('[role="dialog"][aria-label="Navigation"] [class*="scroller"]').evaluate(el => el.scrollHeight - el.clientHeight), { message: 'All Duo menu actions must fit without scrolling' }).toBeLessThanOrEqual(1);
      await expect(page.locator('#openContact')).toBeInViewport({ ratio: 1 });
      await mkdir('/tmp/eat-this-foldable-menu', { recursive: true });
      const menuImage = await cdp.send('Page.captureScreenshot', { format: 'png' });
      await writeFile(`/tmp/eat-this-foldable-menu/${orientation}-${paneSize}.png`, Buffer.from(menuImage.data, 'base64'));
      await page.getByRole('button', { name: 'Frag Remy', exact: true }).click();
      await fits('#buddy-panel');
      await fits('div:has(> #buddy-panel)');
      await expect(page.locator('#buddy-panel input')).toBeInViewport({ ratio: 1 });
      await page.locator('#buddy-panel').getByRole('button', { name: 'Schließen', exact: true }).click();
      await page.locator('#burgerBtn').click();
      await page.getByRole('dialog', { name: 'Navigation', exact: true }).getByRole('button', { name: 'Anmelden', exact: true }).click();
      await fits('[data-login-panel]');
      const submit = page.locator('[data-login-panel] button[type="submit"]');
      await submit.scrollIntoViewIfNeeded();
      await expect(submit).toBeInViewport({ ratio: 1 });
      // Playwright's mobile screenshot resets device metrics, including the hinge.
      const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      await mkdir('/tmp/eat-this-responsive', { recursive: true });
      await writeFile(`/tmp/eat-this-responsive/fold-${orientation}-${paneSize}-login.png`, Buffer.from(screenshot.data, 'base64'));
      await cdp.send('Emulation.clearDisplayFeaturesOverride');
      await cdp.send('Emulation.clearDevicePostureOverride');
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(submit).toBeInViewport({ ratio: 1 });
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-login-panel]')).toHaveCount(0);
    });
  }
}
