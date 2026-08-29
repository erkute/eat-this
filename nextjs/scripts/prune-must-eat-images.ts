/**
 * Loescht Kartenbilder im Bucket, auf die kein Firestore-Datensatz mehr zeigt.
 *
 *   npx tsx scripts/prune-must-eat-images.ts --dry-run
 *   npx tsx scripts/prune-must-eat-images.ts --apply
 *
 * Jeder Kartentausch legt das neue Motiv unter einem Pfad mit seinem eigenen
 * Hash ab und laesst das alte liegen — bewusst, denn solange es da ist, kostet
 * ein Rueckweg nur ein Feld-Update. Irgendwann sammelt sich das an, und dann
 * raeumt dieser Schritt auf.
 *
 * Massgeblich ist ausschliesslich Firestore: was in `imageObjectPath` steht,
 * bleibt, alles andere unter dem Prefix faellt weg. Ein Objekt zu behalten,
 * das niemand referenziert, kostet nur Platz — eines zu loeschen, das noch
 * gebraucht wird, macht eine Karte kaputt. Deshalb wird nach dem Loeschen
 * jedes verbliebene Bild heruntergeladen und gegen seinen Hash gerechnet:
 * lieber einmal zu viel geprueft als eine tote Karte in Produktion.
 */
import { config as loadEnv } from 'dotenv';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import crypto from 'node:crypto';

const COLLECTION = 'privateMustEats';
const OBJECT_PREFIX = 'premium/must-eats/';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function initializeTarget(projectId: string, bucket: string) {
  if (getApps().length > 0) return getApps()[0];
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const explicitProject = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const hasAllExplicit = Boolean(explicitProject && clientEmail && privateKey);
  if (hasAllExplicit && explicitProject !== projectId) {
    throw new Error(
      `Die Anmeldedaten in der Env gehoeren zu ${explicitProject}, angefordert ist ${projectId}`
    );
  }
  return initializeApp({
    credential: hasAllExplicit
      ? cert({ projectId: explicitProject!, clientEmail: clientEmail!, privateKey: privateKey! })
      : applicationDefault(),
    projectId,
    storageBucket: bucket,
  });
}

function kb(bytes: number): string {
  return `${Math.round(bytes / 1024)} kB`;
}

async function main() {
  loadEnv({ path: arg('--env-file') ?? '.env.local', quiet: true });

  const apply = hasFlag('--apply');
  if (apply === hasFlag('--dry-run')) {
    throw new Error('Genau eines von --dry-run oder --apply waehlen');
  }
  const projectId = arg('--project') ?? process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (!projectId) throw new Error('Fehlt: --project oder FIREBASE_ADMIN_PROJECT_ID');
  const bucketName = arg('--bucket') ?? `${projectId}.firebasestorage.app`;

  const app = initializeTarget(projectId, bucketName);
  const db = getFirestore(app);
  const bucket = getStorage(app).bucket(bucketName);

  const snapshot = await db.collection(COLLECTION).get();
  const referenced = new Map<string, string>();
  for (const document of snapshot.docs) {
    const path = document.data().imageObjectPath;
    if (typeof path !== 'string' || !path.startsWith(OBJECT_PREFIX)) {
      throw new Error(`Datensatz ${document.id} hat keinen brauchbaren imageObjectPath`);
    }
    referenced.set(path, document.id);
  }
  // Ein leerer Referenzsatz waere kein "alles ist verwaist", sondern ein Fehler
  // beim Lesen — und wuerde den ganzen Bucket leerraeumen.
  if (referenced.size === 0) {
    throw new Error('Keine Referenzen in Firestore gefunden — Abbruch, bevor alles faellt');
  }

  const [files] = await bucket.getFiles({ prefix: OBJECT_PREFIX });
  const orphans = files.filter((file) => !referenced.has(file.name));
  const missing = [...referenced.keys()].filter(
    (path) => !files.some((file) => file.name === path)
  );

  console.log(`Ziel: ${projectId} / ${bucketName}`);
  console.log(
    `${files.length} Objekte, ${referenced.size} referenziert, ${orphans.length} verwaist`
  );
  if (missing.length > 0) {
    throw new Error(`Referenziertes Objekt fehlt im Bucket: ${missing.join(', ')} — Abbruch`);
  }

  // Nach Must-Eat gruppiert, damit sichtbar wird, wessen altes Motiv faellt.
  const byMustEat = new Map<string, { name: string; size: number }[]>();
  for (const file of orphans) {
    const id = file.name.slice(OBJECT_PREFIX.length).split('/')[0];
    const list = byMustEat.get(id) ?? [];
    list.push({ name: file.name, size: Number(file.metadata.size ?? 0) });
    byMustEat.set(id, list);
  }
  let total = 0;
  for (const [id, list] of [...byMustEat].sort()) {
    const bytes = list.reduce((sum, entry) => sum + entry.size, 0);
    total += bytes;
    const owned = snapshot.docs.some((document) => document.id === id);
    console.log(
      `  ${apply ? 'loesche  ' : 'wuerde loeschen'} ${id}: ${list.length} Objekt(e), ${kb(bytes)}${owned ? '' : ' — Karte existiert nicht mehr'}`
    );
  }
  console.log(`Summe: ${kb(total)}`);

  if (!apply) {
    console.log(JSON.stringify({ status: 'dry-run', project: projectId, orphans: orphans.length }));
    return;
  }

  for (const file of orphans) await file.delete();

  // Gegenprobe: jedes referenzierte Bild muss noch da sein und stimmen.
  let verified = 0;
  for (const document of snapshot.docs) {
    const data = document.data();
    const [buffer] = await bucket.file(data.imageObjectPath).download();
    if (crypto.createHash('sha256').update(buffer).digest('hex') !== data.imageSha256) {
      throw new Error(`Nach dem Aufraeumen stimmt ${document.id} nicht mehr`);
    }
    verified += 1;
  }
  console.log(`Nachher: ${verified}/${snapshot.size} Karten heruntergeladen und geprueft`);
  console.log(
    JSON.stringify({ status: 'applied', project: projectId, deleted: orphans.length, freed: total })
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Aufraeumen fehlgeschlagen');
  process.exit(1);
});
