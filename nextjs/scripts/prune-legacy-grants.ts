/**
 * Räumt die Geschenke der alten Staffelung weg.
 *
 * Bis zum 06.09.2026 war die Map gestaffelt, und ein Konto brachte Spots mit.
 * Die Belege dafür liegen noch in Firestore und richten in der neuen Welt zwei
 * Schäden an:
 *
 *   1. `entitlements/starter` — 60 Dokumente mit je zehn `mustEatIds`. Sie
 *      wurden für Spots vergeben; jetzt sind Karten das Produkt, und 26 Konten
 *      halten zehn davon geschenkt. Kein Code vergibt sie mehr.
 *   2. `unlockedMustEats/*` mit `source: 'starter-pack'` — 356 Dokumente. Diese
 *      Collection ist seit dem Umbau der BELEG, dass jemand vor Ort war (nur
 *      /api/must-eat-reveal schreibt hinein). Die Altdaten stempeln Karten ab,
 *      die nie jemand besucht hat.
 *   3. `entitlements/signup-spot` — der Gratis-Spot der Anmeldung. Der Spot ist
 *      frei, das Dokument ist wirkungslos; es steht nur noch im Weg.
 *
 * Standard ist ein Trockenlauf. Erst `--apply` löscht.
 *
 * Aus `nextjs/`:
 *   npx tsx scripts/prune-legacy-grants.ts
 *   npx tsx scripts/prune-legacy-grants.ts --apply
 */
import { config as loadEnv } from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

loadEnv({ path: '.env.local' });

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore();
const apply = process.argv.includes('--apply');

/** Dokument-IDs in `entitlements`, die aus der Spot-Ära stammen. */
const LEGACY_ENTITLEMENT_IDS = new Set(['starter', 'signup-spot']);
/** Der Vermerk, mit dem der Starter-Grant seine Aufdeckungen geschrieben hat. */
const LEGACY_UNLOCK_SOURCE = 'starter-pack';

async function main() {
  const doomed: FirebaseFirestore.DocumentReference[] = [];

  const entitlements = await db.collectionGroup('entitlements').get();
  const byPack = new Map<string, number>();
  for (const doc of entitlements.docs) {
    if (!LEGACY_ENTITLEMENT_IDS.has(doc.id)) continue;
    byPack.set(doc.id, (byPack.get(doc.id) ?? 0) + 1);
    doomed.push(doc.ref);
  }

  /* Client-seitig gefiltert, nicht per `where`: eine Collection-Group-Abfrage
     auf `source` braucht einen eigenen Index, den es hier nicht gibt — und für
     einen einmaligen Lauf ist ein voller Durchgang billiger als ein Index. */
  const unlocks = await db.collectionGroup('unlockedMustEats').get();
  let legacyUnlocks = 0;
  for (const doc of unlocks.docs) {
    if (doc.data().source !== LEGACY_UNLOCK_SOURCE) continue;
    legacyUnlocks++;
    doomed.push(doc.ref);
  }

  console.log(apply ? '— LÖSCHEN —' : '— TROCKENLAUF (nichts wird geschrieben) —');
  for (const [id, count] of [...byPack].sort()) {
    console.log(`entitlements/${id}: ${count}`);
  }
  console.log(`unlockedMustEats mit source='${LEGACY_UNLOCK_SOURCE}': ${legacyUnlocks}`);
  console.log(
    `unlockedMustEats gesamt: ${unlocks.size} → danach ${unlocks.size - legacyUnlocks} echte Aufdeckungen`
  );
  console.log(`Summe zu löschen: ${doomed.length}`);

  if (!apply) {
    console.log('\nZum Ausführen: npx tsx scripts/prune-legacy-grants.ts --apply');
    return;
  }

  // 500 ist das Batch-Limit von Firestore.
  for (let i = 0; i < doomed.length; i += 500) {
    const batch = db.batch();
    for (const ref of doomed.slice(i, i + 500)) batch.delete(ref);
    await batch.commit();
    console.log(`gelöscht: ${Math.min(i + 500, doomed.length)}/${doomed.length}`);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
