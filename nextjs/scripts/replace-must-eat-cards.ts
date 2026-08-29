/**
 * Tauscht die Kartenbilder der Premium-Must-Eats gegen ein neues Set aus.
 *
 *   npx tsx scripts/replace-must-eat-cards.ts --cards ../CARDS --dry-run
 *   npx tsx scripts/replace-must-eat-cards.ts --cards ../CARDS --apply
 *
 * Optional: --map <json> (Standard: scripts/data/must-eat-cards.json),
 * --manifest <json> (schreibt die getauschten Einträge im Migrations-Manifest
 * fort, damit migrate-must-eats-private.ts verify weiter durchläuft).
 *
 * Nur das Bild wird angefasst. Gericht, Beschreibungen und Preis bleiben
 * unberührt — die stehen nicht auf der Karte zur Debatte, sondern im
 * Firestore-Dokument. Das alte Objekt im Bucket bleibt liegen: der neue Pfad
 * traegt den Hash des neuen Bildes, ein Rueckweg kostet also nur ein Update
 * des Feldes. Aufraeumen ist ein eigener, spaeterer Schritt.
 */
import { config as loadEnv } from 'dotenv';
import { createClient } from '@sanity/client';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import crypto from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const COLLECTION = 'privateMustEats';
const OBJECT_PREFIX = 'premium/must-eats/';
const DEFAULT_MAP = 'scripts/data/must-eat-cards.json';
// Gleiche Kante wie in migrate-must-eats-private.ts: breiter als die oberste
// Sprosse von /api/must-eat-image (1200) muss nichts liegen, kleiner wird
// nichts hochgerechnet.
const MAX_WIDTH = 1200;
const WEBP_QUALITY = 80;

interface CardMapEntry {
  order: number;
  file: string;
  spot: string;
  dish: string;
}

interface SanityMustEat {
  _id: string;
  order?: number;
  restaurant?: string;
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function sha256(value: Buffer | string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Feldreihenfolge wie in migrate-must-eats-private.ts — sonst passt der
 *  nachgerechnete Hash nicht zu dem, was verify erwartet. */
function recordSha256(data: FirebaseFirestore.DocumentData): string {
  return sha256(
    JSON.stringify({
      schemaVersion: data.schemaVersion,
      dish: data.dish,
      description: data.description,
      descriptionEn: data.descriptionEn,
      price: data.price,
      restaurantId: data.restaurantId,
      imageObjectPath: data.imageObjectPath,
      imageContentType: data.imageContentType,
      imageSha256: data.imageSha256,
    })
  );
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

async function main() {
  loadEnv({ path: arg('--env-file') ?? '.env.local', quiet: true });

  const apply = hasFlag('--apply');
  if (apply === hasFlag('--dry-run')) {
    throw new Error('Genau eines von --dry-run oder --apply waehlen');
  }
  const cardsDir = arg('--cards');
  if (!cardsDir) throw new Error('Fehlt: --cards <ordner>');
  const projectId = arg('--project') ?? process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (!projectId) throw new Error('Fehlt: --project oder FIREBASE_ADMIN_PROJECT_ID');
  const bucketName = arg('--bucket') ?? `${projectId}.firebasestorage.app`;

  const map = JSON.parse(await readFile(arg('--map') ?? DEFAULT_MAP, 'utf8')) as {
    cards: CardMapEntry[];
  };
  const byOrder = new Map(map.cards.map((card) => [card.order, card]));
  if (byOrder.size !== map.cards.length) throw new Error('Doppelte order in der Mapping-Datei');

  // Ohne Token liefert die API nur publizierte Dokumente — Drafts sind dann
  // unsichtbar, und eine noch nicht veroeffentlichte Karte faellt still durch.
  const token = process.env.SANITY_API_WRITE_TOKEN;
  const sanity = createClient({
    projectId: process.env.SANITY_PROJECT_ID ?? 'ehwjnjr2',
    dataset: process.env.SANITY_DATASET ?? 'production',
    apiVersion: '2024-01-01',
    useCdn: false,
    perspective: token ? 'raw' : 'published',
    ...(token ? { token } : {}),
  });
  // Drafts gehoeren dazu: eine noch nicht publizierte Karte hat ihren
  // Firestore-Datensatz laengst, und ein korrigiertes Motiv dafuer wuerde
  // sonst durch den Rost fallen. Der Praefix `drafts.` faellt weg — Firestore
  // und der Bucket kennen nur die nackte ID; liegt ein Dokument in beiden
  // Fassungen vor, bleibt es nach dem Entdoppeln trotzdem ein Tausch.
  const rows = await sanity.fetch<SanityMustEat[]>(
    `*[_type == "mustEat"] | order(order asc) {
      _id, order, "restaurant": restaurantRef->name
    }`
  );
  const mustEats = [
    ...new Map(
      rows.map((mustEat) => {
        const bare = { ...mustEat, _id: mustEat._id.replace(/^drafts\./, '') };
        return [bare._id, bare] as const;
      })
    ).values(),
  ];
  if (!token) {
    console.log('Hinweis: kein SANITY_API_WRITE_TOKEN — Drafts bleiben unsichtbar');
  }

  const planned = mustEats
    .filter((mustEat) => typeof mustEat.order === 'number' && byOrder.has(mustEat.order))
    .map((mustEat) => ({ mustEat, card: byOrder.get(mustEat.order!)! }));
  const cardsWithoutMustEat = map.cards.filter(
    (card) => !mustEats.some((mustEat) => mustEat.order === card.order)
  );
  const mustEatsWithoutCard = mustEats.filter(
    (mustEat) => typeof mustEat.order !== 'number' || !byOrder.has(mustEat.order)
  );

  console.log(`Ziel: ${projectId} / ${bucketName}`);
  console.log(`Zuordnung: ${planned.length} von ${map.cards.length} Karten`);
  for (const card of cardsWithoutMustEat) {
    console.log(`  ohne Must-Eat: Karte ${card.order} (${card.spot} — ${card.dish})`);
  }
  for (const mustEat of mustEatsWithoutCard) {
    console.log(`  ohne Karte: ${mustEat._id} (${mustEat.restaurant}, order=${mustEat.order})`);
  }

  const app = initializeTarget(projectId, bucketName);
  const db = getFirestore(app);
  const bucket = getStorage(app).bucket(bucketName);

  const swapped: { id: string; objectPath: string; imageSha256: string; recordSha256: string }[] =
    [];
  for (const { mustEat, card } of planned) {
    const source = path.join(cardsDir, card.file);
    const image = await sharp(source)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    const imageSha256 = sha256(image);
    const objectPath = `${OBJECT_PREFIX}${mustEat._id}/${imageSha256}.webp`;

    const snapshot = await db.collection(COLLECTION).doc(mustEat._id).get();
    const data = snapshot.data();
    if (!data) throw new Error(`Kein Firestore-Dokument fuer ${mustEat._id}`);
    if (data.restaurantId === undefined) {
      throw new Error(`Firestore-Dokument ${mustEat._id} hat kein restaurantId`);
    }
    const label = `${String(card.order).padStart(3, '0')} ${card.spot} — ${card.dish}`;
    if (data.imageObjectPath === objectPath) {
      console.log(`unveraendert  ${label} (${mustEat._id})`);
      continue;
    }

    const next = {
      ...data,
      imageObjectPath: objectPath,
      imageContentType: 'image/webp',
      imageSha256,
    };
    const nextRecordSha256 = recordSha256(next);
    console.log(
      `${apply ? 'tausche     ' : 'wuerde tauschen'} ${label} (${mustEat._id}, ${Math.round(image.length / 1024)} kB)`
    );
    if (!apply) continue;

    const file = bucket.file(objectPath);
    const [exists] = await file.exists();
    if (!exists) {
      await file.save(image, {
        resumable: false,
        validation: 'crc32c',
        preconditionOpts: { ifGenerationMatch: 0 },
        metadata: {
          contentType: 'image/webp',
          cacheControl: 'private, no-store',
          contentDisposition: 'inline',
          metadata: { mustEatId: mustEat._id, imageSha256 },
        },
      });
    }
    await db.collection(COLLECTION).doc(mustEat._id).update({
      imageObjectPath: objectPath,
      imageContentType: 'image/webp',
      imageSha256,
      recordSha256: nextRecordSha256,
      updatedAt: FieldValue.serverTimestamp(),
    });
    swapped.push({
      id: mustEat._id,
      objectPath,
      imageSha256,
      recordSha256: nextRecordSha256,
    });
  }

  const manifestPath = arg('--manifest');
  if (apply && manifestPath && swapped.length > 0) {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const bySwapped = new Map(swapped.map((entry) => [entry.id, entry]));
    for (const entry of manifest.entries as { id: string }[]) {
      const swap = bySwapped.get(entry.id);
      if (!swap) continue;
      Object.assign(entry, {
        privateObjectPath: swap.objectPath,
        imageSha256: swap.imageSha256,
        recordSha256: swap.recordSha256,
      });
    }
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    console.log(`Manifest fortgeschrieben: ${manifestPath}`);
  }

  console.log(
    JSON.stringify({
      status: apply ? 'applied' : 'dry-run',
      project: projectId,
      swapped: apply ? swapped.length : planned.length,
      cardsWithoutMustEat: cardsWithoutMustEat.map((card) => card.order),
      mustEatsWithoutCard: mustEatsWithoutCard.map((mustEat) => mustEat._id),
    })
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Kartentausch fehlgeschlagen');
  process.exit(1);
});
