import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { initializeApp, deleteApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({ db: null as Firestore | null }));
vi.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: () => state.db,
  getAdminAuth: () => ({
    verifyIdToken: async (uid: string) => ({ uid }),
    getUser: async (uid: string) => ({ email: `${uid}@example.test`, metadata: { creationTime: new Date().toISOString() } }),
  }),
}));
vi.mock('@/lib/map/cached-sanity', () => ({ getCachedMapData: async () => ({ restaurants: [], mustEats: [{ _id: 'last-card' }] }) }));
vi.mock('@/lib/firebase/entitlements', () => ({ resolveEntitlements: async () => ({}) }));
vi.mock('@/lib/firebase/unlockedMustEats.server', () => ({ getUnlockedMustEatIds: async () => new Set() }));
vi.mock('@/lib/map/visible-restaurants.server', () => ({ composeAccountSurface: async () => ({ faceUpIds: new Set() }) }));
import { POST } from '@/app/api/referral/confirm/route';

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const inviter = randomUUID().replaceAll('-', '').slice(0, 28);
const friends = [randomUUID(), randomUUID()].map((id) => id.replaceAll('-', '').slice(0, 28));
let app: App;
beforeAll(() => {
  if (!enabled) return;
  app = initializeApp({ projectId: 'demo-eat-this-referral-test' }, `referral-${inviter}`);
  state.db = getFirestore(app);
});
afterAll(async () => {
  if (!enabled) return;
  await Promise.all([inviter, ...friends].map((uid) => state.db!.recursiveDelete(state.db!.doc(`users/${uid}`))));
  await deleteApp(app);
});

it.skipIf(!enabled)('concurrent signups preserve both friendships and award the last card only once', async () => {
  const responses = await Promise.all(friends.map((uid) => POST(new NextRequest('https://example.test/api/referral/confirm', {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: `pending_referrer=${inviter}` },
    body: JSON.stringify({ idToken: uid }),
  }))));
  expect(responses.map((response) => response.status)).toEqual([200, 200]);
  const relationships = await state.db!.collection(`users/${inviter}/referralBonuses`).get();
  expect(relationships.size).toBe(2);
  expect(relationships.docs.flatMap((doc) => doc.data().mustEatIds)).toEqual(['last-card']);
  const counter = await state.db!.doc(`users/${inviter}/referralStats/inviter`).get();
  expect(counter.data()?.awardedCount).toBe(1);
  for (const uid of friends) expect((await state.db!.doc(`users/${uid}/referralBonuses/invited-by`).get()).exists).toBe(true);
}, 20_000);
