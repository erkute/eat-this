import { expect, test } from '@playwright/test';
import { CONSENT_VERSION } from '../lib/consent';

// Der Hero vom Server muss derselbe Knoten bleiben, bis React ihn übernommen
// hat: nie doppelt im DOM, nie verschwunden, nie im Browser neu gebaut.
const WATCH_HERO = () => {
  const log = { first: null as Element | null, most: 0, gone: false };
  (window as unknown as { heroLog: typeof log }).heroLog = log;
  new MutationObserver(() => {
    const heroes = document.querySelectorAll('[data-hub-hero]');
    log.most = Math.max(log.most, heroes.length);
    log.first ??= heroes[0] ?? null;
    if (log.first && heroes.length === 0) log.gone = true;
  }).observe(document, { childList: true, subtree: true });
};

test('the server-rendered home page survives hydration on a slow phone', async ({
  page,
  context,
  baseURL,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Drosselung gibt es nur über das Chrome-Protokoll.');
  await context.addCookies([
    { name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! },
  ]);
  await page.addInitScript(WATCH_HERO);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await page.goto('/', { waitUntil: 'commit' });
  const hero = page.locator('#appPages [data-hub-hero]');
  // React hängt seinen Fiber an den Knoten, sobald es ihn übernommen hat.
  await expect
    .poll(
      () =>
        hero.evaluateAll((found) =>
          found.some((el) => Object.keys(el).some((key) => key.startsWith('__reactFiber')))
        ),
      { timeout: 30_000 }
    )
    .toBe(true);
  // Die Anmeldung meldet sich erst kurz nach dem Übernehmen.
  await page.waitForTimeout(1_000);

  const log = await hero.evaluate((current) => {
    const { first, most, gone } = (
      window as unknown as { heroLog: { first: Element | null; most: number; gone: boolean } }
    ).heroLog;
    return { sameNode: first === current, most, gone };
  });
  expect(log).toEqual({ sameNode: true, most: 1, gone: false });
});
