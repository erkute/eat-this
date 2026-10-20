import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

// The translated tablet sheet must keep its final content inside the viewport.
for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 768 }, { width: 820, height: 1180 }, { width: 1440, height: 1000 }]) {
  test(`restaurant detail reaches its final content at ${viewport.width}px`, async ({ page, context, baseURL }, info) => {
    test.skip(info.project.name !== 'desktop', 'This test supplies its own viewport matrix.');
    await page.setViewportSize(viewport);
    await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.goto('/map?r=gazzo');
    const detail = page.getByRole('dialog', { name: 'Gazzo', exact: true });
    const lastSection = detail.locator('[data-detail-scroll] > section').last();
    await expect(lastSection.getByRole('button', { name: 'Anmelden', exact: true })).toBeAttached();
    const tablet = viewport.width >= 768 && viewport.width < 1024;
    for (const lowerSheet of tablet ? [false, true] : [false]) {
      if (lowerSheet) {
        const handle = page.locator('[data-sheet-handle]');
        const box = (await handle.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2, viewport.height * .5, { steps: 15 });
        await page.mouse.up();
        await expect.poll(() => handle.evaluate(el => el.getBoundingClientRect().top)).toBeGreaterThan(100);
      }
      await expect.poll(async () => {
        await detail.locator('[data-detail-scroll]').evaluate(el => { el.scrollTop = el.scrollHeight; });
        if (viewport.width < 768) await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        return lastSection.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return rect.top >= 0 && rect.bottom <= window.innerHeight + 1;
        });
      }).toBe(true);
      const button = lastSection.getByRole('button', { name: 'Anmelden', exact: true });
      await expect(button).toBeInViewport({ ratio: 1 });
      await button.click({ trial: true });
    }
  });
}
