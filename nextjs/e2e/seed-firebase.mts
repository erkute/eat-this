/** Synthetic private content for CI only; public IDs still match the Sanity catalog. */
import { createClient } from '@sanity/client';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readFile } from 'node:fs/promises';
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

const app = initializeApp({ projectId, storageBucket: `${projectId}.firebasestorage.app` });
const imageObjectPath = 'premium/must-eats/ci-fixture.webp';
await getStorage(app)
  .bucket()
  .file(imageObjectPath)
  .save(await readFile('public/pics/eat-this-crumpled-wordmark.webp'), { contentType: 'image/webp' });
const db = getFirestore(app);
/* Jede Karte unter ihrem aktuellen Schluessel UND unter dem ohne Version.
   Der Build der Browser-Pruefung liest Sanity aus einem bis zu 24 h alten
   Fetch-Cache (quality.yml), dieser Seed dagegen frisch. Bekommt eine Karte
   in dieser Zeit ihre erste Version, sucht der Server noch den alten
   Schluessel, und `/` und `/map` antworten 500 (12.11.2026, Karte 21). */
const keysOf = (card: (typeof cards)[number]) => [
  ...new Set([mustEatContentKey(card._id, card.cardVersion), mustEatContentKey(card._id)]),
];
const BATCH_CARDS = 200; // zwei Schreibvorgaenge je Karte, Firestore erlaubt 500 je Batch
for (let offset = 0; offset < cards.length; offset += BATCH_CARDS) {
  const batch = db.batch();
  for (const card of cards.slice(offset, offset + BATCH_CARDS)) {
    for (const key of keysOf(card)) {
      batch.set(db.collection('privateMustEats').doc(key), {
        dish: 'CI Testgericht',
        description: 'Synthetische Karte für den Browser-Test.',
        descriptionEn: 'Synthetic card for the browser test.',
        price: '',
        imageObjectPath,
        imageContentType: 'image/webp',
        restaurantId: card.restaurantId,
        schemaVersion: 1,
      });
    }
  }
  await batch.commit();
}
console.log(`Seeded ${cards.length} synthetic cards in local Firebase emulators.`);
await db.terminate();
