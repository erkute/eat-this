import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { CONSENT_VERSION } from '../lib/consent';

// A local SDK identity, not a real account. Every identity/session/data call
// is intercepted; Firebase writes and token refreshes cannot leave the test.
async function signedInFixture(context: BrowserContext, page: Page, baseURL: string, fullCatalog: boolean) {
  const localEnvPath = `${process.cwd()}/.env.local`;
  const localEnv = existsSync(localEnvPath) ? parse(readFileSync(localEnvPath)) : {};
  const source = readFileSync(`${process.cwd()}/lib/firebase/config.ts`, 'utf8');
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? localEnv.NEXT_PUBLIC_FIREBASE_API_KEY
    ?? source.match(/apiKey: '([^']+)'/)![1];
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? localEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ?? 'eat-this-8a13b';
  const uid = 'local-map-scroll-fixture';
  const response = await page.request.get(`${baseURL}/api/map-data`, { headers: { DNT: '1' } });
  expect(response.ok()).toBe(true);
  const publicData = await response.json();
  await context.route('**/api/auth/premium-access', route => route.fulfill({ json: { admin: false } }));
  await context.route('**/api/starter-pack', route => route.fulfill({ json: { granted: false } }));
  await context.route('**/api/map-data', route => route.fulfill({ json: { ...publicData, fullCatalog } }));
  await context.route('https://firestore.googleapis.com/**', route => route.abort());
  await context.route('https://securetoken.googleapis.com/**', route => route.abort());
  await context.route('https://identitytoolkit.googleapis.com/**', route => route.fulfill({ json: {
    users: [{ localId: uid, email: 'scroll@example.invalid', emailVerified: true, displayName: 'Scroll fixture',
      validSince: String(Math.floor(Date.now() / 1000) - 60), createdAt: String(Date.now() - 100000), lastLoginAt: String(Date.now()) }],
  } }));
  await context.addInitScript(({ apiKey, project, uid, fullCatalog }) => {
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: object) => btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
      iss: `https://securetoken.google.com/${project}`, aud: project, auth_time: now, sub: uid,
      user_id: uid, iat: now, exp: now + 3600, email: 'scroll@example.invalid', email_verified: true,
      firebase: { identities: {}, sign_in_provider: 'password' },
    })}.local-fixture`;
    localStorage.setItem(`firebase:authUser:${apiKey}:[DEFAULT]`, JSON.stringify({
      uid, email: 'scroll@example.invalid', emailVerified: true, displayName: 'Scroll fixture',
      isAnonymous: false, providerData: [], createdAt: String(Date.now()), lastLoginAt: String(Date.now()),
      stsTokenManager: { refreshToken: 'local-layout-test-only', accessToken: token, expirationTime: Date.now() + 3600000 },
      apiKey, appName: '[DEFAULT]',
    }));
    localStorage.setItem(`eatthis_entitlements_${uid}`, JSON.stringify(fullCatalog ? ['all-berlin'] : []));
    localStorage.setItem('_authHint', '1');
  }, { apiKey, project, uid, fullCatalog });
}

async function scrollToEnd(page: Page, selector: string, phone: boolean) {
  await page.locator(selector).evaluate(element => { element.scrollTop = element.scrollHeight; });
  if (phone) await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
}

for (const width of [390, 820, 1440]) {
  for (const theme of ['light', 'dark'] as const) {
    for (const account of ['guest', 'starter', 'full-catalog'] as const) {
      test(`map ends follow ${theme}, ${account}, ${width}px`, async ({ page, context, baseURL }, info) => {
        test.skip(info.project.name !== 'desktop', 'The test supplies its own viewport matrix.');
        test.setTimeout(120000);
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await context.addCookies([{ name: 'cookieConsent', value: `declined.${CONSENT_VERSION}`, url: baseURL! }]);
        await page.route('**/api/consent', route => route.fulfill({ status: 204 }));
        await page.addInitScript(theme => localStorage.setItem('et-theme', theme), theme);
        if (account !== 'guest') await signedInFixture(context, page, baseURL!, account === 'full-catalog');
        const expected = theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(21, 18, 14)';

        await page.goto('/map', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('[data-list-row]').first()).toBeAttached();
        if (account !== 'guest') await expect(page.locator('#loginBtn')).toHaveText('Profil');
        if (theme === 'dark') await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        else await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
        // Reach the real end, including rows appended by the list window.
        let previous = '';
        let stable = 0;
        for (let attempt = 0; attempt < 35 && stable < 3; attempt += 1) {
          await scrollToEnd(page, '[data-sheet-content]', width < 768);
          await page.waitForTimeout(150);
          const signature = await page.locator('[data-list-row]').last().getAttribute('data-list-row');
          stable = signature === previous ? stable + 1 : 0;
          previous = signature ?? '';
        }
        const lastRow = page.locator('[data-list-row]').last();
        await expect.poll(async () => {
          await scrollToEnd(page, '[data-sheet-content]', width < 768);
          const box = (await lastRow.boundingBox())!;
          return box.y + box.height <= 1001;
        }).toBe(true);
        await expect(page.locator('html')).toHaveCSS('background-color', expected);
        await expect(page.locator('body')).toHaveCSS('background-color', expected);
        await expect.poll(() => page.locator('[data-sheet-content]').evaluate(element => {
          // The desktop/tablet scroller is transparent over the sheet paper.
          for (let surface: Element | null = element; surface; surface = surface.parentElement) {
            const color = getComputedStyle(surface).backgroundColor;
            if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color;
          }
          return '';
        })).toBe(expected);
        await page.screenshot({ path: `/tmp/eat-this-map-end-${theme}-${account}-${width}-list.png` });

        await page.goto('/map?r=gazzo', { waitUntil: 'domcontentloaded' });
        const detail = page.getByRole('dialog', { name: 'Gazzo', exact: true });
        await expect(detail).toBeVisible();
        if (account === 'guest') await expect(detail.getByRole('button', { name: 'Anmelden', exact: true })).toBeAttached();
        else {
          await expect(page.locator('#loginBtn')).toHaveText('Profil');
          await expect(detail.getByRole('button', { name: 'Anmelden', exact: true })).toHaveCount(0);
          if (account === 'starter') await expect(detail.locator('a[href="/packs"]')).toBeAttached();
          else await expect(detail.locator('img[src*="/pics/booster/"]')).toHaveCount(0);
        }
        await expect(detail.getByText('Im Magazin', { exact: true })).toBeAttached();
        const lastSection = detail.locator('[data-detail-scroll] > section').last();
        const finalLink = lastSection.locator('a,button').last();
        await expect.poll(async () => {
          await scrollToEnd(page, '[data-detail-scroll]', width < 768);
          const box = (await lastSection.boundingBox())!;
          return box.y + box.height <= 1001;
        }).toBe(true);
        await expect(finalLink).toBeInViewport({ ratio: 1 });
        await finalLink.click({ trial: true });
        await expect(page.locator('html')).toHaveCSS('background-color', expected);
        await expect(page.locator('body')).toHaveCSS('background-color', expected);
        await expect(detail.locator('[data-detail-scroll]')).toHaveCSS('background-color', expected);
        if (width < 768) await expect(page.locator('#map-results-panel')).toHaveCSS('background-image', new RegExp(expected.replace(/[()]/g, '\\$&')));
        await page.screenshot({ path: `/tmp/eat-this-map-end-${theme}-${account}-${width}-detail.png` });
      });
    }
  }
}
