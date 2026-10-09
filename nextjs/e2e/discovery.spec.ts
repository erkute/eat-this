import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.route('**/api/consent', (route) => route.fulfill({ status: 204 }));
  await context.addCookies([
    { name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! },
  ]);
});

for (const motion of ['no-preference', 'reduce'] as const) {
  test(`mobile district photos swipe without navigating (${motion})`, async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Touch gallery');
    await page.emulateMedia({ reducedMotion: motion });
    await page.goto('/bezirk');
    const preview = page.locator('#discovery-preview');
    const gallery = preview.locator('a[aria-hidden="true"]');
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery.locator('img')).toHaveCount(3);
    const session = await page.context().newCDPSession(page);
    const swipe = async () => {
      const box = (await gallery.boundingBox())!;
      const x = box.x + box.width * 0.85;
      const y = box.y + box.height / 2;
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 8; step++) {
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchMove', touchPoints: [{ x: x - box.width * 0.075 * step, y }],
        });
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    await swipe();
    await expect(gallery.locator('img').nth(1)).toBeInViewport({ ratio: 0.9 });
    await swipe();
    await expect(gallery.locator('img').nth(2)).toBeInViewport({ ratio: 0.9 });
    await expect(page).toHaveURL(/\/bezirk$/);
    await page.screenshot({ path: `/tmp/eat-this-kiez-qa/mobile-swiped-${motion}.png` });
    await page.getByRole('navigation', { name: 'Alle Bezirke', exact: true })
      .getByRole('link', { name: 'Mitte', exact: true }).tap();
    await expect(preview.getByRole('heading')).toHaveText('Mitte');
    await expect(gallery).toHaveJSProperty('scrollLeft', 0);
    await preview.getByRole('link', { name: 'Entdecken', exact: true }).tap();
    await expect(page).toHaveURL(/\/bezirk\/mitte$/);
    await session.detach();
  });

  test(`district preview, navigation, back and filtering (${motion})`, async ({
    page,
    isMobile,
  }) => {
    await page.emulateMedia({ reducedMotion: motion });
    await page.addInitScript(() => {
      const observer = new MutationObserver((records) => {
        if (records.some((record) => record.type === 'attributes' && record.target instanceof HTMLElement && record.target.matches('[data-discovery-motion]') && record.target.style.transform)) {
          document.documentElement.dataset.observedDiscoveryEntrance = 'true';
        }
        if (
          records.some((record) =>
            [...record.addedNodes].some(
              (node) => node instanceof Element && node.hasAttribute('data-discovery-transition')
            )
          )
        ) {
          document.documentElement.dataset.observedDiscoveryArrival = 'true';
        }
      });
      observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/bezirk');
    const names = page.getByRole('navigation', { name: 'Alle Bezirke', exact: true });
    const mitte = names.getByRole('link', { name: 'Mitte', exact: true });
    if (isMobile) await mitte.tap();
    else await mitte.hover();
    await expect(page).toHaveURL(/\/bezirk$/);
    await expect(page.locator('#discovery-preview').getByRole('heading')).toHaveText('Mitte');
    await expect(page.getByRole('link', { name: 'Entdecken', exact: true })).toBeVisible();
    await expect(mitte).toHaveAttribute('aria-current', 'true');
    await expect
      .poll(() =>
        page
          .locator('#discovery-preview img')
          .first()
          .evaluate((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)
      )
      .toBe(true);
    await page.getByRole('link', { name: 'Entdecken', exact: true }).click();
    await expect(page).toHaveURL(/\/bezirk\/mitte$/);
    await expect(page.locator('h1')).toContainText('Mitte');
    if (motion === 'no-preference') {
      await expect(page.locator('html')).toHaveAttribute('data-observed-discovery-arrival', 'true');
      await expect(page.locator('html')).toHaveAttribute('data-observed-discovery-entrance', 'true');
    } else {
      await expect(page.locator('html')).not.toHaveAttribute(
        'data-observed-discovery-arrival',
        'true'
      );
      await expect(page.locator('html')).not.toHaveAttribute('data-observed-discovery-entrance', 'true');
    }
    await expect(page.locator('[data-discovery-transition]')).toHaveCount(0);
    await page.goBack();
    await expect(page.locator('#discovery-preview').getByRole('heading')).toHaveText('Mitte');
    await page.getByRole('link', { name: 'Entdecken', exact: true }).click();
    const filters = page.getByRole('group', { name: 'In Mitte nach Kategorie filtern' });
    await filters.getByRole('button', { name: 'Kaffee', exact: true }).click();
    await expect(page).toHaveURL(/cat=coffee/);
    await expect(page.getByRole('status')).toContainText('Kaffee in Mitte');
    await expect(filters.getByRole('button', { name: 'Kaffee', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await filters.getByRole('button', { name: 'Alle', exact: true }).click();
    await expect(page).not.toHaveURL(/cat=/);
    expect(errors).toEqual([]);
  });
}

for (const route of [
  '/bezirk',
  '/kategorie',
  '/bezirk/schoeneberg',
  '/bezirk/charlottenburg',
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
  const next = page.getByRole('navigation', { name: 'Weitere Bezirke', exact: true });
  const labelsFit = await next.getByRole('link').evaluateAll((links) => links.every((link) => {
    const photo = link.firstElementChild!;
    const name = link.lastElementChild!;
    const caption = name.getBoundingClientRect();
    const image = photo.getBoundingClientRect();
    return name.scrollWidth <= name.clientWidth + 1 && caption.left >= image.left && caption.right <= image.right && caption.bottom <= image.bottom;
  }));
  expect(labelsFit).toBe(true);
  await page.goto('/restaurant/bar-basta');
  const end = page.getByRole('region', { name: 'Noch nicht satt?' });
  await end.scrollIntoViewIfNeeded();
  await expect.poll(() => end.locator('img').evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: '/tmp/eat-this-kiez-qa/narrow-packs.png' });
});

test('desktop preview stays fixed and every district CTA fits the first screen', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Hover layout is a desktop interaction');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/bezirk');
  await page.evaluate(() => document.fonts.ready);
  const choices = page.getByRole('navigation', { name: 'Alle Bezirke', exact: true }).getByRole('link');
  const measurements = [];
  for (const choice of await choices.all()) {
    await choice.hover();
    await expect(page.locator('#discovery-preview').getByRole('heading')).toHaveText((await choice.textContent())!.trim());
    await expect(page.locator('#discovery-preview').getByRole('link')).toHaveText('Entdecken');
    const bounds = await page.locator('#discovery-preview').evaluate((preview) => {
      const cta = preview.querySelector('a:last-child')!;
      const heading = preview.querySelector('h2')!;
      const text = document.createRange();
      text.selectNodeContents(heading);
      return {
        name: heading.textContent,
        ctaBottom: cta.getBoundingClientRect().bottom,
        ctaWidth: cta.clientWidth,
        ctaContentWidth: cta.scrollWidth,
        titleLines: text.getClientRects().length,
        titleFits: heading.scrollWidth <= heading.clientWidth + 1,
        magazineTop: document.querySelector('#magazine-title')!.getBoundingClientRect().top,
      };
    });
    measurements.push(bounds);
  }
  await choices.filter({ hasText: 'Charlottenburg' }).hover();
  await expect.poll(() => page.locator('#discovery-preview img').evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await expect.poll(() => page.locator('[data-discovery-photo] img').evaluateAll((photos) => photos.every((photo) => getComputedStyle(photo).transform === 'none'))).toBe(true);
  await page.screenshot({ path: `/tmp/eat-this-kiez-qa/stability-${process.env.DISCOVERY_QA_PHASE ?? 'after'}.png` });
  await test.info().attach('preview-bounds', { body: JSON.stringify(measurements, null, 2), contentType: 'application/json' });
  expect(measurements.every((m) => m.ctaBottom <= 780 && m.ctaContentWidth <= m.ctaWidth + 1 && m.titleLines === 1 && m.titleFits), JSON.stringify(measurements)).toBe(true);
  expect(Math.max(...measurements.map((m) => m.magazineTop)) - Math.min(...measurements.map((m) => m.magazineTop))).toBeLessThan(2);
});

test('Charlottenburg title, compact cards, illustrated directory and next districts', async ({ page, isMobile }) => {
  await page.goto('/bezirk/charlottenburg');
  await page.evaluate(() => document.fonts.ready);
  const title = page.locator('h1');
  expect(await title.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  const cards = page.locator('#restaurants article');
  if (!isMobile) {
    const first = await cards.nth(0).boundingBox();
    const fourth = await cards.nth(3).boundingBox();
    expect(Math.abs(first!.y - fourth!.y)).toBeLessThan(2);
    expect(first!.width).toBeLessThan(400);
  }
  const tip = cards.first().locator('details');
  await tip.locator('summary').click();
  await expect(tip).toHaveAttribute('open', '');
  await expect(tip.locator('p')).toBeVisible();
  await tip.locator('summary').click();
  await cards.first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/tmp/eat-this-kiez-qa/${test.info().project.name}-compact-spots.png` });
  const directory = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Weitere Spots', exact: true }) });
  expect(await directory.locator('img').count()).toBeGreaterThan(3);
  await directory.getByRole('heading').scrollIntoViewIfNeeded();
  await expect.poll(() => directory.locator('img').first().evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: `/tmp/eat-this-kiez-qa/${test.info().project.name}-directory.png` });
  const next = page.getByRole('navigation', { name: 'Weitere Bezirke', exact: true });
  await next.scrollIntoViewIfNeeded();
  await expect(next.getByRole('link', { name: 'Mitte', exact: true })).toBeVisible();
  await page.screenshot({ path: `/tmp/eat-this-kiez-qa/${test.info().project.name}-district-links.png` });
  await next.getByRole('link', { name: 'Mitte', exact: true }).click();
  await expect(page).toHaveURL(/\/bezirk\/mitte$/);
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
