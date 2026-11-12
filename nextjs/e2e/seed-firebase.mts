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
// Der Build liest Sanity aus dem Fetch-Cache des letzten Laufs (quality.yml),
// dieses Skript live. Bekommt eine Karte in der Zwischenzeit eine Fassung
// (`cardVersion`), fragt der Server noch nach dem alten Schlüssel. Darum
// liegt jede Karte unter beiden: Basis und gewählte Fassung.
const keys = cards.flatMap((card) => {
  const versioned = mustEatContentKey(card._id, card.cardVersion);
  return [card._id, versioned]
    .filter((key, index, all) => all.indexOf(key) === index)
    .map((key) => ({ key, restaurantId: card.restaurantId }));
});
for (let offset = 0; offset < keys.length; offset += 400) {
  const batch = db.batch();
  for (const { key, restaurantId } of keys.slice(offset, offset + 400)) {
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
console.log(`Seeded ${cards.length} synthetic cards in local Firebase emulators.`);
await db.terminate();
