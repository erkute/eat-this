import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['de', 'en'] as const) {
  test(`public opt-out persists without an admin session (${locale})`, async ({ page, context }) => {
    const path = locale === 'en' ? '/en/no-count' : '/no-count';
    const exclude = locale === 'en' ? 'Exclude this browser' : 'Nicht mitzählen';
    const include = locale === 'en' ? 'Count me again' : 'Wieder mitzählen';
    const measurements: string[] = [];
    page.on('request', (request) => {
      if (/\/api\/count(?:\?|$)|googletagmanager\.com|google-analytics\.com/.test(request.url())) {
        measurements.push(request.url());
      }
    });

    await page.goto(path);
    await expect(page.getByRole('heading', { name: exclude, exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByRole('link', { name: locale === 'en' ? 'Home' : 'Zur Startseite', exact: true }))
      .toHaveAttribute('href', locale === 'en' ? '/en' : '/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: exclude, exact: true }).click();
    await expect(page.getByText('eatthis_nocount=1', { exact: true })).toBeVisible();
    const cookie = (await context.cookies()).find((item) => item.name === 'eatthis_nocount');
    expect(cookie).toMatchObject({ value: '1', path: '/', httpOnly: false, sameSite: 'Lax' });
    expect(cookie!.expires).toBeGreaterThan(Date.now() / 1000 + 364 * 86400);

    await page.reload();
    await expect(page.getByText('eatthis_nocount=1', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: include, exact: true }).click();
    await expect(page.getByRole('button', { name: exclude, exact: true })).toBeVisible();
    expect((await context.cookies()).find((item) => item.name === 'eatthis_nocount')).toBeUndefined();
    expect(measurements).toEqual([]);
  });
}

test.describe('native form', () => {
  test.use({ javaScriptEnabled: false });

  test('sets and verifies the opt-out without JavaScript', async ({ page, context }) => {
    await page.goto('/no-count');
    await page.getByRole('button', { name: 'Nicht mitzählen', exact: true }).click();
    await expect(page.getByText('eatthis_nocount=1', { exact: true })).toBeVisible();
    await page.reload();
    expect((await context.cookies()).find((item) => item.name === 'eatthis_nocount')?.value).toBe('1');
    await expect(page.getByRole('button', { name: 'Wieder mitzählen', exact: true })).toBeVisible();
  });
});

test('respects dark mode and reduced motion without hiding the form', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('et-theme', 'dark'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/no-count');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Nicht mitzählen', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Nicht mitzählen', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('eatthis_nocount=1', { exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(21, 18, 14)');
  await page.screenshot({ path: `/tmp/eat-this-no-count-dark-${testInfo.project.name}.png` });
});
