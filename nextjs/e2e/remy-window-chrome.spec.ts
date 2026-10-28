import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

for (const width of [390, 1440]) {
  test(`Remy title bar and close control stay aligned after sending at ${width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
    await page.route('**/api/buddy', route => route.fulfill({ contentType: 'application/x-ndjson', body: '{"type":"text","value":"Hier ist dein Tipp."}\n{"type":"done"}\n' }));
    await page.goto('/about');
    await page.locator('#burgerBtn').click();
    await page.getByRole('dialog', { name: 'Navigation' }).getByRole('button', { name: 'Frag Remy', exact: true }).click();
    const panel = page.locator('#buddy-panel');
    const close = panel.getByRole('button', { name: 'Schließen', exact: true });
    await expect(panel).toBeVisible();
    const before = await close.boundingBox();
    await panel.locator('input').fill('Pizza?');
    await panel.getByRole('button', { name: 'Senden', exact: true }).click();
    await expect(panel.locator('[data-buddy-avatar="header"]')).toBeVisible();
    const after = await close.boundingBox();
    expect(Math.abs(after!.y - before!.y), 'Close button must not move down when the portrait enters').toBeLessThan(1);
    const glyph = await close.locator('svg').boundingBox();
    expect(Math.abs(glyph!.x + glyph!.width / 2 - after!.x - after!.width / 2)).toBeLessThan(1);
    expect(Math.abs(glyph!.y + glyph!.height / 2 - after!.y - after!.height / 2)).toBeLessThan(1);
    await page.screenshot({ path: `/tmp/eat-this-followup-remy-${width}.png` });
    await close.click();
    await expect(panel).toBeHidden();
  });
}
