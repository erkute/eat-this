import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.route('**/api/consent', (route) => route.fulfill({ status: 204 }));
  await context.addCookies([
    { name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! },
  ]);
});

for (const route of [
  '/bezirk',
  '/kategorie',
  '/bezirk/schoeneberg',
  '/bezirk/charlottenburg',
  '/bezirk/steglitz',
  '/en/bezirk/steglitz',
  '/kategorie/pizza',
  '/en/bezirk',
  '/en/kategorie/pizza',
]) {
  test(`${route}: responsive content, metadata and accessibility`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= innerWidth + 1)).toBe(
      true
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://www.eatthisdot.com${route}`
    );
    expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))
    ).toEqual([]);
    await page.screenshot({
      path: `/tmp/eat-this-kiez-qa/${test.info().project.name}-${route.replaceAll('/', '-')}.png`,
    });
  });
}

test('restaurant continues with category packs and four next spots', async ({ page, isMobile }) => {
  await page.goto('/restaurant/bar-basta');
  const end = page.getByRole('region', { name: 'Noch nicht satt?' });
  await end.scrollIntoViewIfNeeded();
  await expect.poll(() => end.locator('img').evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await expect(end.getByRole('navigation', { name: 'Kategorien dieses Spots' })).toBeVisible();
  await expect(end.locator('a[href^="/restaurant/"]')).toHaveCount(4);
  await expect(end.getByRole('navigation', { name: 'Kategorien dieses Spots' }).locator('img')).toHaveCount(3);
  await expect(end.getByText('Gutes Essen geht weiter. Lass dich treiben.')).toHaveCount(0);
  await expect(end.getByRole('link', { name: 'Mitte entdecken' })).toHaveCount(0);
  expect(await end.evaluate((node) => getComputedStyle(node).borderTopWidth)).toBe('0px');
  if (!isMobile) {
    const spot = end.locator('a[href^="/restaurant/"]').first();
    await spot.hover();
    expect(await spot.evaluate((node) => getComputedStyle(node).textDecorationLine)).toBe('none');
  }
  const result = await new AxeBuilder({ page })
    .include('section[aria-labelledby="discovery-next"]')
    .analyze();
  expect(result.violations).toEqual([]);
  await page.screenshot({
    path: `/tmp/eat-this-kiez-qa/${test.info().project.name}-restaurant-end.png`,
  });
});

test('320px phone keeps district labels and packs within their space', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Narrow phone layout');
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/bezirk/charlottenburg');
  await page.evaluate(() => document.fonts.ready);
  const next = page.getByRole('navigation', { name: 'Zur Berlin-Karte', exact: true });
  const labelsFit = await next.getByRole('link').evaluateAll((links) => links.every((link) => {
    const bounds = link.getBoundingClientRect();
    return link.scrollWidth <= link.clientWidth + 1 && bounds.left >= 0 && bounds.right <= innerWidth;
  }));
  expect(labelsFit).toBe(true);
  await page.goto('/restaurant/bar-basta');
  const end = page.getByRole('region', { name: 'Noch nicht satt?' });
  await end.scrollIntoViewIfNeeded();
  await expect.poll(() => end.locator('img').evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: '/tmp/eat-this-kiez-qa/narrow-packs.png' });
});

test('Charlottenburg title, editorial cards, illustrated directory and next districts', async ({ page, isMobile }) => {
  await page.goto('/bezirk/charlottenburg');
  await page.evaluate(() => document.fonts.ready);
  const title = page.locator('h1');
  expect(await title.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  const cards = page.locator('#restaurants article');
  if (!isMobile) {
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    const third = await cards.nth(2).boundingBox();
    expect(Math.abs(first!.y - second!.y)).toBeLessThan(2);
    expect(first!.width).toBeCloseTo(second!.width, 0);
    const photo = (await cards.first().locator('[data-spot-photo]').boundingBox())!;
    expect(photo.height / photo.width).toBeCloseTo(3 / 4, 1);
    expect(third!.x).toBeGreaterThan(second!.x);
    expect(third!.y).toBeCloseTo(second!.y, 0);
  }
  await expect(cards.locator('details')).toHaveCount(0);
  await expect(page.locator('[data-favorite]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Eat This Favorites', exact: true })).toBeVisible();
  await cards.first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/tmp/eat-this-kiez-qa/${test.info().project.name}-compact-spots.png` });
  const directory = page.getByRole('region', { name: 'Weitere Spots', exact: true });
  await expect(directory.getByRole('heading', { name: 'Weitere Spots' })).toHaveCount(0);
  expect(await directory.locator('img').count()).toBeGreaterThan(3);
  await directory.locator('[data-spot-card]').first().scrollIntoViewIfNeeded();
  await expect.poll(() => directory.locator('img').first().evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: `/tmp/eat-this-kiez-qa/${test.info().project.name}-directory.png` });
  const next = page.getByRole('navigation', { name: 'Zur Berlin-Karte', exact: true });
  await next.scrollIntoViewIfNeeded();
  await expect(next.getByRole('link')).toBeVisible();
  await page.screenshot({ path: `/tmp/eat-this-kiez-qa/${test.info().project.name}-district-links.png` });
  await next.getByRole('link').click();
  await expect(page).toHaveURL(/\/bezirk$/);
});

test('rubric navigation and spot links survive without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    extraHTTPHeaders: { DNT: '1' },
  });
  const page = await context.newPage();
  try {
    await page.goto(`${baseURL}/en/kategorie`);
    await page
      .getByRole('navigation', { name: 'All categories' })
      .getByRole('link', { name: 'Pizza', exact: true })
      .click();
    await expect(page).toHaveURL(/\/en\/kategorie\/pizza$/);
    await expect(page.locator('h1')).toContainText('Pizza');
    expect(await page.locator('a[href^="/en/restaurant/"]').count()).toBeGreaterThan(0);
  } finally {
    await context.close();
  }
});


test('district keyboard links, map intent and complete unfiltered directory', async ({ page }) => {
  await page.goto('/bezirk');
  const choice = page.getByRole('navigation', { name: 'Alle Bezirke', exact: true })
    .getByRole('link', { name: 'Steglitz', exact: true });
  await choice.focus();
  await expect(choice).toBeFocused();
  expect(await choice.evaluate((node) => getComputedStyle(node).strokeWidth)).toBe('3px');
  await choice.press('Enter');
  await expect(page).toHaveURL(/\/bezirk\/steglitz$/);
  await expect(page).toHaveURL(/\/bezirk\/steglitz$/);
  await expect(page.getByRole('link', { name: 'Auf der Map', exact: true })).toHaveCount(0);
  await expect(page.locator('[data-district-header]')).not.toContainText('Stand ');
  const displayed = await page.locator('#restaurants a[href^="/restaurant/"]').evaluateAll((links) => links.map((link) => new URL((link as HTMLAnchorElement).href).pathname));
  const schema = await page.locator('#schema-bezirk-steglitz').textContent();
  const graph = JSON.parse(schema!)['@graph'];
  const list = graph.find((node: { '@type': string }) => node['@type'] === 'ItemList');
  expect(displayed).toEqual(list.itemListElement.map((entry: { item: { url: string } }) => new URL(entry.item.url).pathname));
});

test('district overview and restaurant links survive without JavaScript', async ({ browser, baseURL, isMobile }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: isMobile ? 375 : 1440, height: 900 }, extraHTTPHeaders: { DNT: '1' } });
  const page = await context.newPage();
  try {
    await page.goto(`${baseURL}/en/bezirk`);
    await page.getByRole('navigation', { name: 'All districts', exact: true })
      .getByRole('link', { name: 'Steglitz', exact: true }).press('Enter');
    await expect(page).toHaveURL(/\/en\/bezirk\/steglitz$/);
    await expect(page.locator('h1')).toContainText('Steglitz');
    expect(await page.locator('#restaurants a[href^="/en/restaurant/"]').count()).toBeGreaterThan(0);
    const back = page.getByRole('navigation', { name: 'Back to the Berlin map', exact: true }).getByRole('link');
    await expect(back).toHaveAttribute('href', '/en/bezirk');
    await back.click();
    await expect(page).toHaveURL(/\/en\/bezirk$/);
  } finally { await context.close(); }
});


test('district filters preserve the opening photo scale', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Desktop column proportions');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/bezirk/steglitz');
  const photo = page.locator('#spot-crapulix [data-spot-photo]');
  const before = (await photo.boundingBox())!;
  await page.getByRole('button', { name: 'Süßes', exact: true }).click();
  await expect(page).toHaveURL(/cat=sweets/);
  const after = (await photo.boundingBox())!;
  expect(after.width).toBeCloseTo(before.width, 0);
  expect(after.height).toBeCloseTo(before.height, 0);
});
