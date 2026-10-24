import { expect, test, type Page } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
  await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
});

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

for (const [width, height, hour] of [[1440, 900, 10], [1366, 768, 10], [1280, 720, 10], [1280, 600, 10], [390, 844, 6], [320, 568, 6]]) {
  test(`Remy suggestions fit without scrolling at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.clock.setFixedTime(new Date(`2026-10-24T${String(hour).padStart(2, '0')}:00:00Z`));
    await openRemy(page);
    const buttons = page.locator('[data-buddy-intro] button');
    await expect(buttons).toHaveCount(4);
    for (const button of await buttons.all()) {
      const result = await button.evaluate(el => {
        let scroller = el.parentElement;
        while (scroller && !['auto', 'scroll'].includes(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
        if (!scroller) throw new Error('No chat scroller found');
        const view = scroller.getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        return { name: el.textContent, inside: rect.top >= view.top && rect.bottom <= view.bottom && rect.left >= view.left && rect.right <= view.right };
      });
      expect(result.inside, `Suggestion clipped: ${result.name}`).toBe(true);
    }
    await expect(page.getByText('Eat This · Berlin', { exact: true })).toHaveCount(0);
  });
}

test('Remy sinks without an upward jump or a moving cut edge', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/api/buddy', route => route.fulfill({
    contentType: 'application/x-ndjson',
    body: '{"type":"text","value":"Hier ist dein Tipp."}\n{"type":"done"}\n',
  }));
  await openRemy(page);
  const panel = page.locator('#buddy-panel');
  await panel.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
  await panel.locator('input').fill('Pizza?');
  const probe = page.evaluate(() => {
    const origin = document.querySelector('[data-buddy-avatar="intro"]')!.getBoundingClientRect();
    return new Promise<{ sourceY: number; sourceBottom: number; samples: { y: number; bottom: number }[] }>(resolve => {
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
          resolve({ sourceY: origin.y, sourceBottom: origin.bottom, samples });
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
  for (const frame of motion.samples) {
    expect(frame.y).toBeGreaterThanOrEqual(motion.sourceY - 0.5);
    expect(Math.abs(frame.bottom - motion.sourceBottom)).toBeLessThan(1);
  }
});

test('Remy enters the title bar in one continuous movement', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
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
