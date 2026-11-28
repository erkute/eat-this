import { expect, test, type Page } from './test';

// Exercise the same dayparts on developer machines and UTC CI runners.
test.use({ timezoneId: 'UTC' });

async function openRemy(page: Page) {
  await page.goto('/news', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1')).toBeVisible();
  const toggle = page.locator('#burgerBtn');
  await expect(async () => {
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true', { timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole('dialog', { name: 'Navigation' }).getByRole('button', { name: 'Frag Remy', exact: true }).click();
  await expect(page.locator('#buddy-panel')).toBeVisible();
}

async function expectSuggestionsToFit(page: Page, min: number, max = min) {
  const intro = page.locator('[data-buddy-intro]');
  await expect(async () => {
    const { count, overflow, inside } = await intro.evaluate(el => {
      const log = el.parentElement!.parentElement!;
      const view = log.getBoundingClientRect();
      const buttons = [...el.querySelectorAll('button')].filter(button => button.getClientRects().length);
      const inside = [el.querySelector('h2')!, ...buttons].every(node => {
        const rect = node.getBoundingClientRect();
        return rect.top >= view.top - 1 && rect.bottom <= view.bottom + 1
          && rect.left >= view.left - 1 && rect.right <= view.right + 1;
      });
      return { count: buttons.length, overflow: log.scrollHeight - log.clientHeight, inside };
    });
    expect(count).toBeGreaterThanOrEqual(min);
    expect(count).toBeLessThanOrEqual(max);
    expect(overflow).toBe(0);
    expect(inside).toBe(true);
  }).toPass({ timeout: 5000 });
}

async function expectPortraitAtComposer(page: Page) {
  const portrait = page.locator('[data-buddy-avatar="intro"]');
  await expect.poll(() => portrait.evaluate(node => {
    const canvas = node.parentElement!;
    const composer = node.closest('#buddy-panel')!.querySelector('form')!;
    const field = composer.getBoundingClientRect();
    const mask = canvas.getBoundingClientRect();
    const picture = node.querySelector('img')!.getBoundingClientRect();
    const visible = (field.top - picture.top) / picture.height;
    return getComputedStyle(canvas).clipPath !== 'none'
      && Math.abs(mask.bottom - field.top) < 1
      && mask.left >= field.left - 1
      && mask.right <= field.right + 1
      && visible >= 0.97
      && visible < 0.99;
  })).toBe(true);
}

for (const [width, height, hour] of [[1440, 900, 10], [1440, 900, 12], [1440, 900, 16], [1440, 900, 20], [1440, 900, 1], [1366, 768, 10], [1280, 720, 10], [1280, 600, 10], [390, 844, 6], [431, 804, 20], [320, 568, 6]]) {
  test(`Remy suggestions fit without scrolling at ${width}×${height}, hour ${hour}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.clock.setFixedTime(new Date(`2026-10-24T${String(hour).padStart(2, '0')}:00:00Z`));
    await openRemy(page);
    await expectSuggestionsToFit(page, width <= 600 ? 3 : 4);
    await expectPortraitAtComposer(page);
  });
}

test('an open greeting refits on height, width and orientation changes', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-24T06:00:00Z'));
  await page.setViewportSize({ width: 390, height: 844 });
  await openRemy(page);
  for (const [width, height, min, max] of [
    [390, 844, 3, 3], [320, 385, 1, 2], [320, 640, 3, 3], [320, 641, 3, 3],
    [320, 650, 3, 3], [600, 650, 3, 3], [600, 385, 3, 3], [320, 385, 1, 2],
    [874, 294, 3, 3], [1440, 900, 4, 4], [390, 844, 3, 3],
  ]) {
    await page.setViewportSize({ width, height });
    await expectSuggestionsToFit(page, min, max);
    await expectPortraitAtComposer(page);
  }
});

test('Remy sinks behind the composer without an upward jump', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/api/buddy', route => route.fulfill({
    contentType: 'application/x-ndjson',
    body: '{"type":"text","value":"Hier ist dein Tipp."}\n{"type":"done"}\n',
  }));
  await openRemy(page);
  const panel = page.locator('#buddy-panel');
  await panel.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
  await panel.locator('input').fill('Pizza?');
  await expectPortraitAtComposer(page);
  const probe = page.evaluate(() => {
    const origin = document.querySelector('[data-buddy-avatar="intro"]')!.getBoundingClientRect();
    const composerTop = document.querySelector('#buddy-panel form')!.getBoundingClientRect().top;
    return new Promise<{ sourceY: number; composerTop: number; samples: { y: number; bottom: number }[] }>(resolve => {
      const samples: { y: number; bottom: number }[] = [];
      const deadline = performance.now() + 5000;
      const sample = () => {
        const node = document.querySelector<HTMLElement>('[data-buddy-avatar="header"]');
        if (node?.dataset.buddyMotion === 'leaving') {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          const inset = style.clipPath.match(/inset\((.*)\)/)?.[1].split(/\s+/).map(parseFloat) ?? [0];
          const bottom = inset.length >= 3 ? inset[2] : inset[0];
          samples.push({ y: rect.y, bottom: rect.bottom - bottom * rect.height / parseFloat(style.height) });
        } else if (samples.length || performance.now() >= deadline) {
          resolve({ sourceY: origin.y, composerTop, samples });
          return;
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
  });
  await panel.getByRole('button', { name: 'Senden', exact: true }).click();
  const motion = await probe;
  expect(motion.samples.length).toBeGreaterThan(2);
  let previousY = motion.sourceY;
  for (const frame of motion.samples) {
    expect(frame.y).toBeGreaterThanOrEqual(previousY - 0.5);
    expect(Math.abs(frame.bottom - motion.composerTop)).toBeLessThan(1);
    previousY = frame.y;
  }
  expect(previousY).toBeGreaterThan(motion.sourceY);
});

test('Remy enters the title bar in one continuous movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/api/buddy', route => route.fulfill({ contentType: 'application/x-ndjson', body: '{"type":"text","value":"Hier ist dein Tipp."}\n{"type":"done"}\n' }));
  await openRemy(page);
  const panel = page.locator('#buddy-panel');
  await panel.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
  await panel.locator('input').fill('Pizza?');
  const probe = page.evaluate(() => new Promise<{ time: number; y: number }[]>(resolve => {
    const frames: { time: number; y: number }[] = [];
    const deadline = performance.now() + 5000;
    const sample = () => {
      const node = document.querySelector<HTMLElement>('[data-buddy-avatar="header"]');
      if (node?.dataset.buddyMotion === 'entering') {
        frames.push({ time: performance.now(), y: node.firstElementChild!.getBoundingClientRect().top - node.getBoundingClientRect().top });
      } else if (frames.length || performance.now() > deadline) { resolve(frames); return; }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
  await panel.getByRole('button', { name: 'Senden', exact: true }).click();
  const frames = await probe;
  expect(frames.length).toBeGreaterThan(5);
  let pausedSince = frames[0].time;
  let longestPause = 0;
  for (let i = 1; i < frames.length; i++) {
    const previous = frames[i - 1];
    const current = frames[i];
    if (Math.abs(current.y - previous.y) > 0.1) pausedSince = current.time;
    if (current.y > 5 && current.y < 35) longestPause = Math.max(longestPause, current.time - pausedSince);
    expect(current.y).toBeLessThanOrEqual(previous.y + 0.5);
  }
  expect(longestPause, 'Remy pauses mid-entry before starting again').toBeLessThan(45);
});

test('reduced motion places Remy directly in the header after a suggestion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(new Date('2026-10-24T12:00:00Z'));
  await page.route('**/api/buddy', route => route.fulfill({
    contentType: 'application/x-ndjson',
    body: '{"type":"text","value":"Hier ist dein Tipp."}\n{"type":"done"}\n',
  }));
  await openRemy(page);
  const panel = page.locator('#buddy-panel');
  expect(await panel.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  // Auch kurz gesetzte Bewegungsphasen erkennen, während React das Porträt wechselt.
  const phases = await panel.evaluateHandle(el => {
    const records: string[] = [];
    new MutationObserver(mutations => records.push(...mutations.map(m => m.attributeName!)))
      .observe(el, { subtree: true, attributes: true, attributeFilter: ['data-buddy-motion'] });
    return records;
  });
  await panel.getByRole('button', { name: 'Schnelles Mittagessen' }).click();
  await expect(panel.getByRole('status')).toHaveText('Hier ist dein Tipp.');
  await expect(panel.locator('[data-buddy-avatar="header"]')).toBeVisible();
  expect(await phases.jsonValue()).toEqual([]);
  await panel.getByRole('button', { name: 'Neues Gespräch mit Remy' }).click();
  await expectSuggestionsToFit(page, page.viewportSize()!.width <= 600 ? 3 : 4);
});
