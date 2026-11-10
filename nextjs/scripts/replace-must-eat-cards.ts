/**
 * Gleicht die Premium-Must-Eats mit einem neuen Kartensatz ab: Bild, Gericht
 * und Beschreibungen.
 *
 *   npx tsx scripts/replace-must-eat-cards.ts --cards ../CARDS --dry-run
 *   npx tsx scripts/replace-must-eat-cards.ts --cards ../CARDS --apply
 *
 * --images-only bewahrt alle bestehenden Texte.
 * Optional: --map <json> (Standard: scripts/data/must-eat-cards.json).
 *
 * Die Karte ist die Quelle: `dish`, `description` und `descriptionEn` aus der
 * Mapping-Datei landen als neue Fassung in Firestore. Der Sanity-Entwurf
 * wählt sie aus; erst Veröffentlichen aktiviert sie. Der Preis steht
 * auf keiner Karte und bleibt unberührt. Das alte Objekt im Bucket bleibt
 * liegen: der neue Pfad
 * traegt den Hash des neuen Bildes, ein Rueckweg kostet also nur ein Update
 * des Feldes. Aufraeumen ist ein eigener, spaeterer Schritt.
 */
import { config as loadEnv } from 'dotenv';
import { createClient } from '@sanity/client';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { mustEatContentKey } from '../lib/must-eat/contentKey';
import { attachMustEatCardVersion, type MustEatDraft } from '../lib/must-eat/card-draft.server';

const COLLECTION = 'privateMustEats';
const OBJECT_PREFIX = 'premium/must-eats/';
const DEFAULT_MAP = 'scripts/data/must-eat-cards.json';
// Breiter als die oberste Sprosse von /api/must-eat-image (1200) muss nichts
// liegen, kleiner wird nichts hochgerechnet.
const MAX_WIDTH = 1200;
const WEBP_QUALITY = 80;

interface CardMapEntry {
  order: number;
  file: string;
  spot: string;
  dish: string;
  description: string;
  descriptionEn: string;
}

const TEXT_FIELDS = ['dish', 'description', 'descriptionEn'] as const;

interface SanityMustEat extends MustEatDraft {
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

function sha256(value: Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
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
  const imagesOnly = hasFlag('--images-only');
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
  const rows = await sanity.fetch<SanityMustEat[]>(
    `*[_type == "mustEat"] | order(order asc) {..., "restaurant": restaurantRef->name}`
  );
  const byId = new Map<string, SanityMustEat>();
  for (const row of rows) {
    const id = row._id.replace(/^drafts\./, '');
    if (!byId.has(id) || row._id.startsWith('drafts.')) byId.set(id, row);
  }
  const mustEats = [...byId.values()];
  if (apply && !token)
    throw new Error('SANITY_API_WRITE_TOKEN fehlt: Änderungen werden als Entwurf gespeichert.');

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

  let changed = 0;
  for (const { mustEat, card } of planned) {
    const id = mustEat._id.replace(/^drafts\./, '');
    const source = path.join(cardsDir, card.file);
    const image = await sharp(source)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    const imageSha256 = sha256(image);
    const objectPath = `${OBJECT_PREFIX}${id}/${imageSha256}.webp`;

    const snapshot = await db
      .collection(COLLECTION)
      .doc(mustEatContentKey(id, mustEat.cardVersion))
      .get();
    const data = snapshot.data();
    if (!data) throw new Error(`Kein Firestore-Dokument fuer ${mustEat._id}`);
    if (data.restaurantId === undefined) {
      throw new Error(`Firestore-Dokument ${mustEat._id} hat kein restaurantId`);
    }
    const label = `${String(card.order).padStart(3, '0')} ${card.spot} — ${card.dish}`;
    const textChanges = (imagesOnly ? [] : TEXT_FIELDS).filter(
      (field) => data[field] !== card[field]
    );
    const imageChanged = data.imageObjectPath !== objectPath;
    if (!imageChanged && textChanges.length === 0) {
      console.log(`unveraendert  ${label} (${mustEat._id})`);
      continue;
    }

    const text = Object.fromEntries(
      (imagesOnly ? [] : TEXT_FIELDS).map((field) => [field, card[field]])
    );
    const what = [imageChanged && 'Bild', ...textChanges].filter(Boolean).join(', ');
    console.log(`${apply ? 'tausche     ' : 'wuerde tauschen'} ${label} (${mustEat._id}): ${what}`);
    for (const field of textChanges) {
      console.log(
        `      ${field}: ${JSON.stringify(data[field])} -> ${JSON.stringify(card[field])}`
      );
    }
    changed += 1;
    if (!apply) continue;

    const file = bucket.file(objectPath);
    const [exists] = await file.exists();
    if (imageChanged && !exists) {
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
    const current = Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'updatedAt'));
    const next = {
      ...current,
      ...text,
      imageObjectPath: objectPath,
      imageContentType: 'image/webp',
      imageSha256,
    };
    const version = sha256(Buffer.from(JSON.stringify(next)));
    await db
      .collection(COLLECTION)
      .doc(mustEatContentKey(id, version))
      .set({
        ...next,
        updatedAt: FieldValue.serverTimestamp(),
      });
    const selected = { ...mustEat };
    delete selected.restaurant;
    await attachMustEatCardVersion(sanity, selected, version);
  }

  console.log(
    JSON.stringify({
      status: apply ? 'applied' : 'dry-run',
      project: projectId,
      changed,
      cardsWithoutMustEat: cardsWithoutMustEat.map((card) => card.order),
      mustEatsWithoutCard: mustEatsWithoutCard.map((mustEat) => mustEat._id),
    })
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Kartentausch fehlgeschlagen');
  process.exit(1);
});
