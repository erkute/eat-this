import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Guest-only UI flows.
for (const route of ['/restaurant/engelbecken', '/news', '/en/news']) {
  test(`${route}: accessible content and SEO metadata`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).toHaveTitle(route.includes('restaurant') ? /Engelbecken/ : /News/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /^https:\/\/www\.eatthisdot\.com\//
    );
    await expect(page.locator('html')).toHaveAttribute(
      'lang',
      route.startsWith('/en/') ? 'en' : 'de'
    );
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= innerWidth + 1)).toBe(
      true
    );
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))
    ).toEqual([]);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `/tmp/eat-this-${test.info().project.name}-${route.replaceAll('/', '-')}.png`,
    });
  });
}

test('magazine opens an article and the footer switches language', async ({
  page,
}) => {
  await page.goto('/news');
  const cover = page.locator('[data-current-issue]');
  const href = await cover.getAttribute('href');
  expect(href).toMatch(/^\/news\/.+/);
  await cover.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator('h1')).toBeVisible();
  await page.goto('/news');
  await page.getByRole('button', { name: 'EN — English', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/news$/);
  await expect(page.locator('h1')).toHaveText('On the plate');
});

test('reduced motion keeps magazine navigation usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/news');
  const cover = page.locator('[data-current-issue]');
  const href = await cover.getAttribute('href');
  expect(href).toMatch(/^\/news\/.+/);
  await cover.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator('h1')).toBeVisible();
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`guest card opens starter login (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/');
    await expect(page.locator('[data-hub-musteats] ul')).toHaveAttribute('data-deal-state', 'spread');
    await page
      .getByRole('button', { name: 'Verdecktes Must Eat — anmelden und aufdecken', exact: true })
      .click();
    await expect(page.getByRole('heading', { name: 'Schau drunter', exact: true })).toBeVisible();
    await expect(page.locator('input[type="email"]').last()).toBeVisible();
  });
}
