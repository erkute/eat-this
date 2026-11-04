import { expect, test, type Locator } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

async function show(section: Locator) {
  await section.evaluate(e => {
    const frame = e.closest<HTMLElement>('.app-pages');
    const scroller = frame && getComputedStyle(frame).overflowY === 'auto' ? frame : window;
    scroller.scrollTo({ top: e.getBoundingClientRect().top + (scroller === window ? scrollY : (scroller as HTMLElement).scrollTop) - 52, behavior: 'instant' });
  });
}
test.beforeEach(async ({ page, context, baseURL, browserName }) => {
  await page.setViewportSize({ width: 874, height: 402 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
  if (browserName === 'chromium') {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 59, right: 59, bottom: 21 } });
  }
});

test('landscape signup keeps the artwork and copy readable', async ({ page }) => {
  await page.goto('/about');
  await page.locator('#burgerBtn').click();
  await page.getByRole('dialog', { name: 'Navigation' }).getByRole('button', { name: 'Anmelden', exact: true }).click();
  const panel = page.locator('[data-login-panel]');
  await expect(panel).toBeVisible();
  await expect.poll(async () => (await panel.locator('img').boundingBox())?.height ?? 0).toBeGreaterThan(130);
  expect(await panel.locator('p[class*="lead"]').evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(14);
  await expect(panel.getByRole('link').last()).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: '/tmp/eat-this-iphone16/verified-login.png' });
  for (const viewport of [{ width: 874, height: 286 }, { width: 874, height: 320 }, { width: 667, height: 375 }, { width: 874, height: 402 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => panel.evaluate(e => e.scrollHeight - e.clientHeight), { message: `${viewport.width}×${viewport.height}: signup fits the safe area` }).toBeLessThanOrEqual(1);
    await expect(panel.locator('button[type="submit"]')).toBeInViewport({ ratio: 1 });
    await expect(panel.getByRole('link').last()).toBeInViewport({ ratio: 1 });
  }

});

test('gallery credit sits below and aligns with the right edge of the photo, clear of the filmstrip', async ({ page }) => {
  await page.goto('/map?r=gazzo');
  await page.getByRole('button', { name: 'Gazzo: Fotos 1/2', exact: true }).click();
  const gallery = page.getByRole('dialog', { name: 'Gazzo – Fotogalerie' });
  await expect(gallery.getByRole('button', { name: 'Galerie schließen' })).toBeVisible();
  for (const index of [1, 2]) {
    await gallery.getByRole('button', { name: `Foto ${index} von 2`, exact: true }).click();
    const photo = gallery.getByRole('img').first();
    const credit = gallery.getByRole('link');
    await expect.poll(async () => {
      const image = await photo.boundingBox(); const label = await credit.boundingBox();
      return !!image && !!label && label.y >= image.y + image.height && Math.abs(label.x + label.width - image.x - image.width) < 2;
    }).toBe(true);
  }
  await page.screenshot({ path: '/tmp/eat-this-iphone16/verified-gallery.png' });
});

test('category, district and price open inside the right rail', async ({ page }) => {
  await page.goto('/map');
  for (const name of ['Kategorie', 'Bezirk', 'Preis']) {
    const chip = page.locator('[data-filter-chip-row]').getByRole('button', { name, exact: true });
    await chip.click();
    const picker = page.locator('[class*="pickerSheet"]').first();
    await expect(picker).toHaveAttribute('role', 'group');
    const rail = (await page.locator('#map-results-panel').boundingBox())!;
    const box = (await picker.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(rail.x);
    expect(box.x + box.width).toBeLessThanOrEqual(rail.x + rail.width + 1);
    await page.screenshot({ path: `/tmp/eat-this-iphone16/verified-filter-${name}.png` });
    await page.keyboard.press('Escape');
    await expect(chip).toHaveAttribute('aria-expanded', 'false');
  }
});

test('Must Eat paging arrows leave space around the complete card fan', async ({ page }) => {
  await page.goto('/map?me=mustead-main-13');
  const detail = page.locator('[data-detail-root="must-eat"]');
  await expect(detail).toBeVisible();
  const stack = detail.locator('[class*="fdCardStack"]').first();
  await expect.poll(async () => {
    const bounds = await stack.locator('img').evaluateAll(images => images.map(img => img.getBoundingClientRect().toJSON()).filter(b => b.width > 0));
    const right = Math.max(...bounds.map(b => b.right));
    const left = Math.min(...bounds.map(b => b.left));
    const prev = (await detail.locator('[class*="fdPagerPrev"] svg').boundingBox())!;
    const next = (await detail.locator('[class*="fdPagerNext"] svg').boundingBox())!;
    return Math.min(left - prev.x - prev.width, next.x - right);
  }).toBeGreaterThanOrEqual(16);
  const fanBottom = await stack.locator('img').evaluateAll(images => Math.max(...images.map(img => img.getBoundingClientRect().bottom)));
  const hint = (await detail.locator('[class*="fdSwipeHint"]').boundingBox())!;
  expect(hint.y - fanBottom).toBeGreaterThanOrEqual(10);
  await page.screenshot({ path: '/tmp/eat-this-iphone16/verified-card-arrows.png' });
});

test('Zoom controls stay clear of the enlarged card after rotation', async ({ page }) => {
  await page.goto('/must-eats');
  await page.locator('button[data-face="down"]').first().click();
  const zoom = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Großansicht schließen', exact: true }) });
  for (const viewport of [{ width: 874, height: 402 }, { width: 402, height: 874 }, { width: 874, height: 320 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => {
      const card = await zoom.locator('img').last().boundingBox(); const action = await zoom.getByRole('link', { name: 'Zum Spot', exact: true }).boundingBox();
      return card && action ? viewport.width > viewport.height
        ? Math.max(action.x - card.x - card.width, card.x - action.x - action.width)
        : action.y - card.y - card.height : -1;
    }).toBeGreaterThanOrEqual(12);
    if (viewport.width > viewport.height) expect((await zoom.locator('img').last().boundingBox())!.height).toBeGreaterThan(viewport.height * .8);
    await expect(zoom.getByRole('link', { name: 'Zum Spot', exact: true })).toBeInViewport({ ratio: 1 });
  }
  await page.screenshot({ path: '/tmp/eat-this-iphone16/verified-zoom.png' });
});

test('home uses six equally sized magazines and an intact Must Eats introduction', async ({ page }) => {
  await page.goto('/');
  const magazines = page.locator('[data-hub-magazine]');
  await show(magazines);
  const covers = magazines.locator('ol > li:visible [data-magazine-cover]');
  await expect(covers).toHaveCount(6);
  const widths = await covers.evaluateAll(es => es.map(e => e.getBoundingClientRect().width));
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(2);
  const section = page.locator('[data-hub-musteats]');
  await show(section);
  const title = section.locator('h2');
  expect(await title.evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(40);
  const text = section.locator('p').first();
  expect((await text.boundingBox())!.width).toBeGreaterThanOrEqual(190);
  await page.screenshot({ path: '/tmp/eat-this-iphone16/verified-home-musteats.png' });
});

test('Remy chat suggestions fit when the browser toolbar reduces landscape height', async ({ page }) => {
  await page.setViewportSize({ width: 874, height: 294 });
  await page.goto('/about');
  await page.locator('#burgerBtn').click();
  await page.getByRole('dialog', { name: 'Navigation' }).getByRole('button', { name: 'Frag Remy', exact: true }).click();
  const panel = page.locator('#buddy-panel');
  await expect(panel).toBeVisible();
  const log = panel.locator('[class*="_log_"]');
  await expect.poll(() => log.evaluate(e => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: '/tmp/eat-this-iphone16/verified-remy-chat.png' });
});

test('home Remy keeps the questions and input together in landscape', async ({ page }) => {
  await page.goto('/');
  const remy = page.locator('[data-hub-fragremy]');
  await show(remy);
  await remy.locator('input').scrollIntoViewIfNeeded();
  await expect(remy.locator('input')).toBeInViewport({ ratio: 1 });
  const form = (await remy.locator('form').boundingBox())!;
  const face = (await remy.locator('img[src*="buddy.webp"]').boundingBox())!;
  expect(face.x).toBeGreaterThanOrEqual(form.x + form.width);
  await page.screenshot({ path: '/tmp/eat-this-iphone16/verified-home-remy.png' });
});

test('landscape menu groups navigation beside account controls without scrolling', async ({ page }) => {
  await page.goto('/about');
  await page.locator('#burgerBtn').click();
  const menu = page.getByRole('dialog', { name: 'Navigation', exact: true });
  const scroller = menu.locator('[class*="scroller"]');
  expect(await scroller.evaluate(e => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(1);
  const legal = menu.getByRole('link', { name: 'Impressum', exact: true });
  await expect(legal).toBeInViewport({ ratio: 1 });
  const nav = menu.getByRole('navigation');
  const login = menu.getByRole('button', { name: 'Anmelden', exact: true });
  expect((await login.boundingBox())!.x).toBeGreaterThan((await nav.boundingBox())!.x + (await nav.boundingBox())!.width);
  await page.screenshot({ path: '/tmp/eat-this-iphone16/verified-menu.png' });
});

test('iPad Mini magazines form two equally sized rows in both orientations', async ({ page }) => {
  await page.goto('/');
  for (const viewport of [{ width: 744, height: 996 }, { width: 1133, height: 628 }]) {
    await page.setViewportSize(viewport);
    const covers = page.locator('[data-hub-magazine] ol > li:visible [data-magazine-cover]');
    await expect(covers).toHaveCount(6);
    await expect.poll(async () => {
      const widths = await covers.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().width));
      return Math.max(...widths) - Math.min(...widths);
    }).toBeLessThan(2);
  }
});

test('portrait photo credits wrap below the photo in short landscape', async ({ page }) => {
  await page.setViewportSize({ width: 874, height: 294 });
  await page.goto('/map?r=bostich');
  await page.getByRole('button', { name: 'Bostich: Fotos 1/4', exact: true }).click();
  const gallery = page.getByRole('dialog', { name: 'Bostich – Fotogalerie' });
  await gallery.getByRole('button', { name: 'Foto 3 von 4', exact: true }).click();
  const credit = gallery.locator('[class*="galleryLbCredit"]').nth(2);
  await expect.poll(() => credit.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  const photo = (await gallery.locator('[class*="galleryLbImg"]').nth(2).boundingBox())!;
  const label = (await credit.boundingBox())!;
  expect(label.y).toBeGreaterThanOrEqual(photo.y + photo.height);
  expect(label.y + label.height).toBeLessThan((await gallery.getByRole('group', { name: 'Foto auswählen' }).boundingBox())!.y);
});

// Inject the VisualViewport events that desktop engines cannot produce with a
// software keyboard. Native Safari separately verifies the actual keyboard.
for (const action of ['Frag Remy', 'Anmelden']) {
  test(`${action} keeps input and close control inside a panned keyboard viewport`, async ({ page }) => {
    await page.goto('/about');
    await page.locator('#burgerBtn').click();
    await page.getByRole('dialog', { name: 'Navigation' }).getByRole('button', { name: action, exact: true }).click();
    const panel = page.locator(action === 'Frag Remy' ? '#buddy-panel' : '[data-login-panel]');
    const input = panel.locator('input').first();
    await input.focus();
    for (const height of [170, 57]) {
      await page.evaluate(height => {
        Object.defineProperties(visualViewport!, {
          height: { value: height, configurable: true },
          offsetTop: { value: 70, configurable: true },
        });
        visualViewport!.dispatchEvent(new Event('resize'));
        visualViewport!.dispatchEvent(new Event('scroll'));
      }, height);
      for (const control of [input, panel.getByRole('button').first(), panel.locator('button[type="submit"]')]) {
        await expect.poll(async () => {
          const rect = (await control.boundingBox())!;
          return rect.y >= 70 && rect.y + rect.height <= 70 + height;
        }).toBe(true);
      }
    }
    await input.fill(action === 'Frag Remy' ? 'Pizza in Mitte' : 'test@example.com');
    await page.evaluate(() => window.dispatchEvent(new Event('orientationchange')));
    await expect(input).not.toBeFocused();
    await expect(input).toHaveValue(action === 'Frag Remy' ? 'Pizza in Mitte' : 'test@example.com');
  });
}

test('contact content clears the landscape cutout', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Safe-area injection requires CDP; native Safari covers the real cutout.');
  await page.goto('/contact');
  expect((await page.getByRole('heading', { level: 1 }).boundingBox())!.x).toBeGreaterThanOrEqual(59);
});

test('pack tiles navigate from their blank area and expose one keyboard target', async ({ page }) => {
  await page.goto('/packs');
  await expect(page.getByRole('heading', { level: 1, name: 'Booster Packs' })).toBeVisible();
  const tile = page.locator('a[class*="PacksOverview_tile_"]').last();
  await tile.scrollIntoViewIfNeeded();
  const href = await tile.getAttribute('href');
  await expect(tile.locator('a,button')).toHaveCount(0);
  const box = (await tile.boundingBox())!;
  await tile.click({ position: { x: box.width - 8, y: box.height - 8 } });
  await expect(page).toHaveURL(new RegExp(`${href}$`));
});

test('category packs use complete rows of three', async ({ page }) => {
  await page.goto('/kategorie');
  const tiles = page.locator('[class*="CategoryGallery_packs_"] > li');
  await expect(tiles).toHaveCount(9);
  for (const viewport of [{ width: 852, height: 393 }, { width: 393, height: 852 }]) {
    await page.setViewportSize(viewport);
    const rows = await tiles.evaluateAll(elements => elements.map(e => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(rows).size).toBe(3);
    for (const y of new Set(rows)) expect(rows.filter(row => row === y)).toHaveLength(3);
  }
});

test('district hint stays above the landscape safe area, including a selected name', async ({ page }) => {
  for (const viewport of [{ width: 932, height: 430 }, { width: 852, height: 393 }, { width: 667, height: 375 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/bezirk');
    const hint = page.locator('#discovery-announcement');
    await expect(hint).toBeInViewport({ ratio: 1 });
    const districts = page.getByRole('navigation', { name: 'Alle Bezirke', exact: true });
    await districts.getByRole('link').first().focus();
    await expect.poll(async () => {
      const box = (await hint.boundingBox())!;
      return box.y + box.height <= viewport.height - 16;
    }).toBe(true);
  }
});

test('tablet starter pack leaves the show-all control visible and clickable', async ({ page }) => {
  await page.goto('/must-eats');
  for (const viewport of [{ width: 768, height: 1024 }, { width: 744, height: 1133 }, { width: 800, height: 1024 }]) {
    await page.setViewportSize(viewport);
    const more = page.getByRole('button', { name: 'Alle Karten anzeigen', exact: true });
    await more.scrollIntoViewIfNeeded();
    const art = page.locator('[data-pack-poster][data-guest-only] img');
    await expect.poll(() => art.evaluateAll(images => images.every(image => {
      const img = image as HTMLImageElement;
      return img.complete && img.naturalWidth > 0;
    }))).toBe(true);
    const button = (await more.boundingBox())!;
    const packTop = await art.evaluateAll(images => Math.min(...images.map(image => image.getBoundingClientRect().top)));
    expect(packTop - button.y - button.height).toBeGreaterThan(20);
    expect(await more.evaluate(element => {
      const box = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    })).toBe(true);
  }
});
