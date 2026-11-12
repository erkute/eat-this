/** Synthetic private content for CI only; public IDs still match the Sanity catalog. */
import { createClient } from '@sanity/client';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { mustEatContentKey } from '../lib/must-eat/contentKey';

const projectId = 'demo-eat-this-quality';
if (
  process.env.FIREBASE_ADMIN_PROJECT_ID !== projectId ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8089' ||
  process.env.FIREBASE_STORAGE_EMULATOR_HOST !== '127.0.0.1:9199'
) {
  throw new Error('Seed requires the isolated demo project and both loopback emulators');
}

const catalog = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
  perspective: 'published',
});
const cards = await catalog.fetch<Array<{ _id: string; cardVersion?: string; restaurantId: string }>>(
  '*[_type == "mustEat" && defined(restaurantRef._ref)]{_id, cardVersion, "restaurantId": restaurantRef._ref}'
);
if (cards.length === 0) throw new Error('No public Must-Eat metadata available for UI fixtures');

/* CI builds with a restored Sanity fetch cache of up to 24 hours (quality.yml),
 * so the server can ask for a card revision the live catalog no longer names.
 * Every card is seeded under its base key, its current revision and every
 * revision that cache holds, or a card edited in Sanity turns / and /map into
 * a 500 for a day. */
async function cachedRevisions(): Promise<Array<{ _id: string; cardVersion?: string }>> {
  const dir = '.next-verify/cache/fetch-cache';
  const ids = new Set(cards.map((card) => card._id));
  const found = new Map<string, { _id: string; cardVersion?: string }>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (typeof record._id === 'string' && ids.has(record._id)) {
      const cardVersion = typeof record.cardVersion === 'string' ? record.cardVersion : undefined;
      found.set(`${record._id}/${cardVersion ?? ''}`, { _id: record._id, cardVersion });
    }
    Object.values(record).forEach(visit);
  };
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  for (const file of files) {
    try {
      const entry = JSON.parse(await readFile(join(dir, file), 'utf8'));
      if (typeof entry?.data?.body !== 'string') continue;
      visit(JSON.parse(Buffer.from(entry.data.body, 'base64').toString('utf8')));
    } catch {
      // Not every cache entry is a JSON response.
    }
  }
  return [...found.values()];
}
const restaurantOf = new Map(cards.map((card) => [card._id, card.restaurantId]));
const revisions = new Map(
  [
    ...cards.map((card) => ({ _id: card._id })),
    ...cards,
    ...(await cachedRevisions()),
  ].map((card) => [
    mustEatContentKey(card._id, card.cardVersion),
    restaurantOf.get(card._id)!,
  ])
);

const app = initializeApp({ projectId, storageBucket: `${projectId}.firebasestorage.app` });
const imageObjectPath = 'premium/must-eats/ci-fixture.webp';
await getStorage(app)
  .bucket()
  .file(imageObjectPath)
  .save(await readFile('public/pics/eat-this-crumpled-wordmark.webp'), { contentType: 'image/webp' });
const db = getFirestore(app);
const entries = [...revisions];
for (let offset = 0; offset < entries.length; offset += 400) {
  const batch = db.batch();
  for (const [key, restaurantId] of entries.slice(offset, offset + 400)) {
    batch.set(db.collection('privateMustEats').doc(key), {
      dish: 'CI Testgericht',
      description: 'Synthetische Karte für den Browser-Test.',
      descriptionEn: 'Synthetic card for the browser test.',
      price: '',
      imageObjectPath,
      imageContentType: 'image/webp',
      restaurantId,
      schemaVersion: 1,
    });
  }
  await batch.commit();
}
console.log(`Seeded ${entries.length} synthetic card revisions for ${cards.length} cards in local Firebase emulators.`);
await db.terminate();
