import { expect, test } from '@playwright/test';

for (const route of ['/news/vegane-restaurants-berlin', '/restaurant/standard-serious-pizza-mitte']) {
  test(`reading progress ends before recommendations: ${route}`, async ({ page, context }) => {
    await context.addCookies([{ name: 'cookieConsent', value: 'declined.4', url: test.info().project.use.baseURL as string || 'http://127.0.0.1:3100' }]);
    await page.goto(route);
    const progress = page.locator('[data-reading-progress]');
    await expect(progress).toBeAttached();
    await page.evaluate(() => document.fonts.ready);
    await page.locator('[data-reading-content]').evaluate(element => {
      const app = document.querySelector<HTMLElement>('.app-pages');
      const scroller = app && app.scrollHeight > app.clientHeight + 1 ? app : null;
      const bottom = element.getBoundingClientRect().bottom;
      if (scroller) scroller.scrollTop += bottom - scroller.getBoundingClientRect().bottom + 10;
      else window.scrollBy(0, bottom - innerHeight + 10);
    });
    // Der Balken wird per clip-path aufgedeckt: sichtbar ist 1 − rechter Einzug.
    await expect.poll(() => progress.evaluate(element => {
      const right = /inset\(\S+ ([\d.]+)%/.exec(getComputedStyle(element).clipPath);
      return right ? 1 - Number(right[1]) / 100 : 0;
    })).toBeGreaterThan(.99);
    await expect(page.locator('#navbar')).toHaveAttribute('data-visibility', 'visible');
    await page.locator('#burgerBtn').focus();
    expect(await page.locator('#burgerBtn').evaluate(e => getComputedStyle(e).outlineColor))
      .not.toBe(await progress.evaluate(e => getComputedStyle(e).backgroundColor));
    await page.locator('#burgerBtn').click();
    await expect(page.locator('#burgerBtn')).toHaveAttribute('aria-expanded', 'true');
  });
}
