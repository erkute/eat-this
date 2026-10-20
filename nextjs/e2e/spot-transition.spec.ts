import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
  await page.addInitScript(() => {
    const observer = new MutationObserver(records => {
      for (const record of records) {
        const nodes = record.type === 'attributes' ? [record.target] : [...record.addedNodes];
        for (const node of nodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.hasAttribute('data-spot-transition')) document.documentElement.dataset.observedSpotOverlay = 'true';
          if (node.hasAttribute('data-spot-arrival')) document.documentElement.dataset.observedSpotArriving = 'true';
        }
      }
    });
    observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-spot-transition', 'data-spot-arrival'] });
  });
});

for (const motion of ['no-preference', 'reduce'] as const) {
  test(`category recommendation photos open their own spot (${motion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: motion });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const index of [0, 1]) {
      await page.goto('/kategorie/sweets');
      const card = page.locator('[data-spot-card]').nth(index);
      const path = (await card.locator('h3 a').getAttribute('href'))!;
      const photo = card.locator('[data-spot-photo] > img').first();
      await card.scrollIntoViewIfNeeded();
      await expect.poll(() => photo.evaluate(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
      const box = (await photo.boundingBox())!;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.locator('[data-spot-hero]')).toBeVisible();
      if (motion === 'no-preference') {
        await expect(page.locator('html')).toHaveAttribute('data-observed-spot-arriving', 'true');
      } else {
        await expect(page.locator('html')).not.toHaveAttribute('data-observed-spot-arriving');
      }
      await expect(page.locator('[data-spot-transition]')).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });
}

test('district recommendation and directory photos all enter their own spot', async ({ page }) => {
  for (const selector of ['[data-spot-card]', 'directory']) {
    await page.goto('/bezirk/schoeneberg');
    const scope = selector === 'directory'
      ? page.getByRole('region', { name: 'Weitere Spots', exact: true })
      : page;
    const card = scope.locator('[data-spot-card]').first();
    const link = card.locator('h3 a');
    const path = (await link.getAttribute('href'))!;
    const photo = card.locator('[data-spot-photo] > img').first();
    await photo.scrollIntoViewIfNeeded();
    await expect.poll(() => photo.evaluate(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
    // Click the image centre, including the stretched link on a recommendation.
    const bounds = (await photo.boundingBox())!;
    await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator('html')).toHaveAttribute('data-observed-spot-arriving', 'true');
    await expect(page.locator('[data-spot-transition]')).toHaveCount(0);
  }
});

test('brand description, recommendations, accessible image links and English navigation', async ({ page }) => {
  await page.goto('/kategorie/sweets');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { name: 'Unsere Empfehlungen', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Handverlesene/ })).toHaveCount(0);
  const description = page.locator('main > header p').first();
  expect(await description.evaluate(node => getComputedStyle(node).fontFamily)).toContain('neue-haas-grotesk');
  expect(await page.locator('body').evaluate(node => node.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.locator('main > header figure a')).toHaveCount(0);
  const result = await new AxeBuilder({ page }).include('main > header').analyze();
  expect(result.violations).toEqual([]);
  await page.screenshot({ path: `/tmp/eat-this-spot-after-${test.info().project.name}.png` });
  await page.goto('/en/kategorie/sweets');
  await expect(page.getByRole('heading', { name: 'Our recommendations', exact: true })).toBeVisible();
  const link = page.locator('[data-spot-card] h3 a').nth(1);
  await link.scrollIntoViewIfNeeded();
  const href = (await link.getAttribute('href'))!;
  expect(href).toMatch(/^\/en\/restaurant\//);
  await link.focus();
  expect(await link.evaluate(node => getComputedStyle(node, '::after').outlineStyle)).toBe('solid');
  await link.press('Enter');
  await expect(page).toHaveURL(new RegExp(`${href}$`));
});

test('changing reduced motion leaves the destination fully visible', async ({ page }) => {
  await page.goto('/kategorie/sweets');
  const photo = page.locator('[data-spot-card] [data-spot-photo] > img').first();
  await photo.scrollIntoViewIfNeeded();
  await expect.poll(() => photo.evaluate(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
  await page.locator('[data-spot-card] h3 a').first().click();
  await expect(page).toHaveURL(/\/restaurant\/sofi$/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('main')).not.toHaveAttribute('data-spot-arrival');
  await expect(page.locator('main')).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-spot-transition]')).toHaveCount(0);
  await expect(page).toHaveURL(/\/restaurant\/sofi$/);
});

test('category recommendations navigate without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, extraHTTPHeaders: { DNT: '1' } });
  try {
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    const page = await context.newPage();
    await page.goto(`${baseURL}/kategorie/sweets`);
    await page.locator('[data-spot-card] h3 a').nth(1).click();
    await expect(page).toHaveURL(/\/restaurant\/atelier-dough$/);
  } finally { await context.close(); }
});

test('further categories show four illustrated packs with keyboard navigation', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (isMobile) await page.setViewportSize({ width: 320, height: 850 });
  await page.goto('/kategorie/sweets');
  const categories = page.getByRole('navigation', { name: 'Oder doch …?', exact: true });
  await categories.scrollIntoViewIfNeeded();
  await expect(categories.getByRole('link')).toHaveCount(4);
  await expect(categories.locator('img')).toHaveCount(4);
  await expect(categories.locator('a[href="/kategorie/sweets"]')).toHaveCount(0);
  expect(await categories.getByRole('link').evaluateAll(links => links.every(link => link.scrollWidth <= link.clientWidth + 1))).toBe(true);
  const breakfast = categories.getByRole('link', { name: 'Frühstück', exact: true });
  await breakfast.focus();
  expect(await breakfast.evaluate(node => getComputedStyle(node).outlineStyle)).toBe('solid');
  await breakfast.press('Enter');
  await expect(page).toHaveURL(/\/kategorie\/breakfast$/);
});

for (const motion of ['no-preference', 'reduce'] as const) {
  test(`category editorial rows, favorites, guides and booster (${motion})`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: motion });
    await page.addInitScript(() => {
      new MutationObserver(records => {
        if (records.some(record => record.target instanceof HTMLElement && record.target.hasAttribute('data-discovery-pack') && record.target.style.transform)) {
          document.documentElement.dataset.observedPackMotion = 'true';
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['style'] });
    });
    await page.goto('/kategorie/sweets');
    await page.evaluate(() => document.fonts.ready);
    const cards = page.locator('[data-spot-card]:visible');
    if (!isMobile) {
      const positions = await cards.evaluateAll(nodes => nodes.map(node => {
        const top = (selector: string) => Math.round(node.querySelector(selector)!.getBoundingClientRect().top);
        return { photo: top('[data-spot-photo]'), title: top('h3'), meta: top(':scope > p'), description: top(':scope > div > p') };
      }));
      for (const row of [...new Set(positions.map(spot => spot.photo))].map(photo => positions.filter(spot => spot.photo === photo))) {
        for (const field of ['title', 'meta', 'description'] as const) {
          expect(new Set(row!.map(spot => spot[field])).size).toBe(1);
        }
      }
      await expect(page.getByText('Kuratiert von', { exact: true })).toHaveCount(0);
      await expect(cards.locator('[data-favorite]')).toHaveCount(0);
    }
    await expect(cards.locator('details')).toHaveCount(0);
    await expect(cards.locator('[data-favorite]')).toHaveCount(0);
    const booster = page.locator('[data-discovery-pack]');
    await booster.scrollIntoViewIfNeeded();
    await expect(booster.locator('img')).toBeVisible();
    await expect.poll(() => booster.evaluate(node => getComputedStyle(node).transform)).toBe('none');
    if (motion === 'no-preference') await expect(page.locator('html')).toHaveAttribute('data-observed-pack-motion', 'true');
    else await expect(page.locator('html')).not.toHaveAttribute('data-observed-pack-motion');
    if (motion === 'reduce') {
      expect(await booster.locator('img').evaluate(node => parseFloat(getComputedStyle(node).transitionDuration))).toBeLessThanOrEqual(0.001);
    }
    const guides = page.getByRole('region', { name: 'Ausführlich im Magazin' });
    await guides.scrollIntoViewIfNeeded();
    await expect(guides.getByRole('link')).toHaveCount(3);
    if (!isMobile) {
      const tops = await guides.getByRole('link').evaluateAll(links => links.map(link => Math.round(link.getBoundingClientRect().top)));
      expect(new Set(tops).size).toBe(1);
    }
    await page.screenshot({ path: `/tmp/eat-this-magazine-${test.info().project.name}-${motion}.png` });
    const guide = guides.getByRole('link').first();
    const href = (await guide.getAttribute('href'))!;
    await guide.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });
}

test('category gallery enters directly and the open directory filters its results', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/kategorie');
  const gallery = page.getByRole('navigation', { name: 'Alle Kategorien', exact: true });
  await expect(gallery.getByRole('link')).toHaveCount(9);
  const sweets = gallery.getByRole('link', { name: 'Süßes', exact: true });
  if (isMobile) await sweets.tap();
  else await sweets.click();
  await expect(page).toHaveURL(/\/kategorie\/sweets$/);
  await expect(page.locator('[data-category-pack] img')).toBeVisible();
  const directory = page.locator('section#alle');
  await expect(directory).toBeVisible();
  const directoryLinks = directory.locator('a[href*="/restaurant/"]');
  expect(await directoryLinks.count()).toBeGreaterThan(0);
  await expect(directoryLinks.first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Die Spots entdecken', exact: true })).toHaveCount(0);
  await expect(page.locator('main > header a[href*="/map"]')).toHaveCount(0);
  const filters = page.getByRole('group', { name: 'Süßes nach Bezirk filtern' });
  await filters.getByRole('button', { name: 'Mitte', exact: true }).click();
  await expect(directory).toBeVisible();
  expect(await directory.locator('a:visible').count()).toBeGreaterThan(0);
  await expect(page.getByRole('region', { name: 'Ausführlich im Magazin' })).toBeHidden();
  await filters.getByRole('button', { name: 'Alle', exact: true }).click();
  await expect(directory).toBeVisible();
  const guides = page.getByRole('region', { name: 'Ausführlich im Magazin' });
  const beforeGuides = await page.locator('[data-spot-card]').evaluateAll(cards => {
    const guides = document.querySelector('#guides-title')!;
    return cards.filter(card => Boolean(card.compareDocumentPosition(guides) & Node.DOCUMENT_POSITION_FOLLOWING)).length;
  });
  expect(beforeGuides).toBe(3);
  await expect(guides).toBeVisible();
});

test('category directory stays open and navigates without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, extraHTTPHeaders: { DNT: '1' } });
  try {
    await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
    const page = await context.newPage();
    await page.goto(`${baseURL}/en/kategorie/sweets`);
    const directory = page.locator('section#alle');
    await expect(directory).toBeVisible();
    const link = directory.locator('a[href*="/restaurant/"]').first();
    const href = (await link.getAttribute('href'))!;
    expect(href).toMatch(/^\/en\/restaurant\//);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  } finally { await context.close(); }
});

test('breakfast opens the real spot page without overlays, fading or photo scaling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/kategorie/breakfast');
  const card = page.locator('[data-spot-card]').first();
  const photo = card.locator('[data-spot-photo] > img');
  await photo.scrollIntoViewIfNeeded();
  await expect.poll(() => photo.evaluate(node => (node as HTMLImageElement).complete)).toBe(true);
  const href = (await card.locator('h3 a').getAttribute('href'))!;
  await card.locator('h3 a').click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator('[data-spot-transition]')).toHaveCount(0);
  await expect(page.locator('[data-spot-hero]')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-observed-spot-arriving', 'true');
  await expect(page.locator('html')).not.toHaveAttribute('data-observed-spot-overlay');
  await expect(page.locator('main')).toHaveCSS('opacity', '1');
  await expect(page.locator('main')).not.toHaveAttribute('data-spot-arrival');
  await page.screenshot({ path: `/tmp/eat-this-soft-arrival-${test.info().project.name}.png` });
  await page.goBack();
  await expect(page).toHaveURL(/\/kategorie\/breakfast$/);
  await expect(page.locator('[data-spot-transition]')).toHaveCount(0);
});
