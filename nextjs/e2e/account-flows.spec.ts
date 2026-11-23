import { expect, test } from '@playwright/test';
import { createAccount, emulatorRoutes, readDocument, requireEmulators, restoreAccount, clientApiKey } from './account-fixture';
import type { MapMustEat } from '../lib/types';

test.beforeEach(({ baseURL }) => requireEmulators(baseURL));

for (const motion of ['no-preference', 'reduce'] as const) {
  test(`signed-in heart uses the server transaction and survives reload (${motion})`, async ({ page, context, request }) => {
    await page.emulateMedia({ reducedMotion: motion });
    const account = await createAccount(request);
    await restoreAccount(context, account);
    const data = await (await request.get('/api/map-data')).json();
    const spot = data.restaurants.find((r: { slug: string }) => r.slug === 'engelbecken');
    expect(spot).toBeTruthy();
    const count = async () => Number((await readDocument(request, `restaurants/${spot._id}`))?.heartCount?.integerValue ?? 0);
    const before = await count();
    await page.goto('/restaurant/engelbecken');
    await expect(page.locator('#loginBtn')).toHaveText('Profil');
    const heart = page.getByRole('button', { name: /^Engelbecken herzen/ });
    await expect(heart).toHaveAttribute('aria-pressed', 'false');
    const added = page.waitForResponse(r => r.url().endsWith('/api/heart') && r.request().method() === 'POST');
    await heart.click();
    expect((await added).status()).toBe(200);
    await expect(page.getByRole('button', { name: /^Herz für Engelbecken entfernen/ })).toHaveAttribute('aria-pressed', 'true');
    expect(await readDocument(request, `users/${account.localId}/favorites/${spot._id}`)).not.toBeNull();
    expect(await count()).toBe(before + 1);
    // Repeating the same server action cannot count the account twice.
    const repeated = await request.post('/api/heart', { headers: { Authorization: `Bearer ${account.idToken}` }, data: { restaurantId: spot._id, action: 'add' } });
    expect(repeated.status()).toBe(200);
    expect(await count()).toBe(before + 1);
    await page.reload();
    const remove = page.getByRole('button', { name: /^Herz für Engelbecken entfernen/ });
    await expect(remove).toHaveAttribute('aria-pressed', 'true');
    const removed = page.waitForResponse(r => r.url().endsWith('/api/heart') && r.request().method() === 'POST');
    await remove.click();
    expect((await removed).status()).toBe(200);
    await expect(page.getByRole('button', { name: /^Engelbecken herzen/ })).toHaveAttribute('aria-pressed', 'false');
    expect(await readDocument(request, `users/${account.localId}/favorites/${spot._id}`)).toBeNull();
    expect(await count()).toBe(before);
    await page.screenshot({ path: `/tmp/eat-this-account-heart-${test.info().project.name}-${motion}.png` });
  });
}

test('signed-in account reveals a nearby card without a purchase and keeps it after reload', async ({ page, context, request }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const account = await createAccount(request);
  await restoreAccount(context, account);
  const data = await (await request.get('/api/map-data')).json();
  const card = (data.mustEats as MapMustEat[]).find(c => !data.revealedMustEatIds.includes(c._id))!;
  expect(card).toBeTruthy();
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: card.restaurant.lat, longitude: card.restaurant.lng });
  await page.goto(`/map?me=${encodeURIComponent(card._id)}`);
  await expect(page.locator('#loginBtn')).toHaveText('Profil');
  const detail = page.locator('[data-detail-root="must-eat"]');
  const reveal = detail.locator('[data-reveal-ready]');
  await expect(reveal).toBeVisible();
  const response = page.waitForResponse(r => r.url().endsWith('/api/must-eat-reveal'));
  await reveal.click();
  const result = await response;
  expect(result.status()).toBe(200);
  const { mustEat } = await result.json();
  expect(mustEat._id).toBe(card._id);
  await expect(detail.getByText(mustEat.dish, { exact: true }).first()).toBeVisible();
  expect(await readDocument(request, `users/${account.localId}/unlockedMustEats/${card._id}`)).not.toBeNull();
  expect(await readDocument(request, `users/${account.localId}/entitlements/starter`)).toBeNull();
  await page.reload();
  await expect(page.locator('[data-detail-root="must-eat"]').getByText(mustEat.dish, { exact: true }).first()).toBeVisible();
  const image = page.locator('[data-detail-root="must-eat"] img[src*="/api/must-eat-image/"]').first();
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: `/tmp/eat-this-account-reveal-${test.info().project.name}.png` });
});

test('email-link sign-in grants the promised starter card once', async ({ page, context, request, baseURL }) => {
  await emulatorRoutes(context);
  const data = await (await request.get('/api/map-data')).json();
  const wanted = (data.mustEats as MapMustEat[]).find(c => !data.revealedMustEatIds.includes(c._id))!;
  const email = `starter-${crypto.randomUUID()}@example.invalid`;
  // Auth emulator generates a real, single-use mail code without sending mail.
  const sent = await request.post(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${clientApiKey()}`, {
    data: { requestType: 'EMAIL_SIGNIN', email, continueUrl: `${baseURL}/`, canHandleCodeInApp: true },
  });
  expect(sent.ok()).toBe(true);
  const codes = await (await request.get('http://127.0.0.1:9099/emulator/v1/projects/demo-eat-this-quality/oobCodes')).json();
  const code = codes.oobCodes.find((c: { email: string }) => c.email === email);
  expect(code).toBeTruthy();
  await context.addInitScript(email => localStorage.setItem('emailForSignIn', email), email);
  const granted = page.waitForResponse(r => r.url().endsWith('/api/starter-pack') && r.request().method() === 'POST');
  await page.goto(`/?mode=signIn&oobCode=${encodeURIComponent(code.oobCode)}&apiKey=${clientApiKey()}&starter=${encodeURIComponent(wanted._id)}&e=untrusted@example.invalid`);
  await expect(page.getByRole('dialog').getByText(email, { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).not.toContainText('untrusted@example.invalid');
  await expect(page).not.toHaveURL(/oobCode=/);
  await page.getByRole('dialog', { name: 'Anmeldung bei Eat This' }).getByRole('button', { name: 'Anmelden', exact: true }).click();
  const grant = await granted;
  expect(grant.status()).toBe(200);
  const pack = await grant.json();
  expect(pack.granted).toBe(true);
  expect(pack.faceUpIds).toHaveLength(20);
  expect(new Set(pack.faceUpIds).size).toBe(20);
  expect(pack.faceUpIds[0]).toBe(wanted._id);
  const accountList = await (await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-eat-this-quality/accounts:lookup', { headers: { Authorization: 'Bearer owner' }, data: { email: [email] } })).json();
  const account = accountList.users.find((u: { email: string }) => u.email === email);
  expect(account).toBeTruthy();
  const stored = await readDocument(request, `users/${account.localId}/entitlements/starter`);
  expect(stored?.mustEatIds?.arrayValue?.values?.map(v => v.stringValue)).toEqual(pack.faceUpIds);
  // Revisit in a fresh tab: no session flag, so the listener really calls the
  // endpoint again, and the entitlement's create guard must reject a re-grant.
  const next = await context.newPage();
  const repeated = next.waitForResponse(r => r.url().endsWith('/api/starter-pack'));
  await next.goto('/restaurant/engelbecken');
  expect((await repeated).status()).toBe(200);
  expect(await (await repeated).json()).toMatchObject({ granted: false, reason: 'already_claimed' });
  await expect(next.locator('#loginBtn')).toHaveText('Profil');
  await next.close();
});
