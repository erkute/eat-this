// One-shot: delete residual pack docs from Firestore after Plan 2 deploys.
// Idempotent — safe to re-run. Requires Firebase admin credentials in scope:
//   - GOOGLE_APPLICATION_CREDENTIALS env var pointing at a service-account JSON, OR
//   - `firebase login` + project selected, with default credentials available.
//
// Run from repo root:
//   node scripts/wipe-packs-collection.mjs
//
// What it deletes:
//   - users/<uid>/packs/<packId> docs (the welcome Booster Pack collection)
//   - userPacks/<uid> docs (root legacy starter pack collection — old onUserCreate path)

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function deleteSubcollectionDocs(parentCollection, subcollection) {
  const parents = await db.collection(parentCollection).get();
  let deleted = 0;
  for (const parentDoc of parents.docs) {
    const subSnap = await parentDoc.ref.collection(subcollection).get();
    if (subSnap.empty) continue;
    // Batches cap at 500 ops — small here, no chunking needed
    const batch = db.batch();
    subSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += subSnap.size;
  }
  return deleted;
}

async function deleteRootCollectionDocs(name) {
  const snap = await db.collection(name).get();
  if (snap.empty) return { parents: 0, subDeleted: 0 };
  // For the legacy userPacks collection, each doc might itself contain a
  // subcollection of packs/* — drop those first before deleting parents.
  let subDeleted = 0;
  for (const parentDoc of snap.docs) {
    const subSnap = await parentDoc.ref.collection('packs').get();
    if (!subSnap.empty) {
      const subBatch = db.batch();
      subSnap.docs.forEach((d) => subBatch.delete(d.ref));
      await subBatch.commit();
      subDeleted += subSnap.size;
    }
  }
  const parentBatch = db.batch();
  snap.docs.forEach((d) => parentBatch.delete(d.ref));
  await parentBatch.commit();
  return { parents: snap.size, subDeleted };
}

const usersPacks = await deleteSubcollectionDocs('users', 'packs');
console.log(`✓ deleted ${usersPacks} docs from users/<uid>/packs/`);

const userPacksResult = await deleteRootCollectionDocs('userPacks');
console.log(`✓ deleted ${userPacksResult.subDeleted} docs from userPacks/<uid>/packs/`);
console.log(`✓ deleted ${userPacksResult.parents} doc(s) at userPacks/<uid>`);

console.log('Done.');
process.exit(0);
