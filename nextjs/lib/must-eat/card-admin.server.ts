import 'server-only';

import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import sharp from 'sharp';

import { getAdminFirestore, getAdminProjectId, getAdminStorage } from '@/lib/firebase/admin';
import { PRIVATE_MUST_EATS_COLLECTION } from './private-store';

// Die Karte einer Must Eat aus dem Studio pflegen: Bild, Gericht,
// Beschreibungen, Preis. Das alles liegt geschützt in Firestore und Storage —
// Sanity-Bilder wären öffentlich, die Karte vor dem Freischalten sichtbar.
// Pfad und Format wie in scripts/replace-must-eat-cards.ts.

const OBJECT_PREFIX = 'premium/must-eats/';
const MAX_WIDTH = 1200;
const MIN_WIDTH = 500;
const WEBP_QUALITY = 80;
const PREVIEW_WIDTH = 360;
export const MAX_CARD_BYTES = 15 * 1024 * 1024;

// Welcher Sanity-Datensatz zu welchem Firebase-Projekt gehört. Lokal hängt
// die App oft an Staging-Sanity, aber an Produktions-Firebase — eine Karte
// darf dann nirgends landen statt im falschen Projekt.
const FIREBASE_FOR_DATASET: Record<string, string> = {
  'ehwjnjr2/production': 'eat-this-8a13b',
  'tqgkp8uc/staging': 'eat-this-staging-8a13b',
};

export class MustEatCardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MustEatCardError';
  }
}

/** Schreibt dieser Server für diesen Datensatz ins richtige Firebase-Projekt? */
export function firebaseServesDataset(projectId: string, dataset: string): boolean {
  const expected = FIREBASE_FOR_DATASET[`${projectId}/${dataset}`];
  return Boolean(expected) && getAdminProjectId() === expected;
}

export interface MustEatCardText {
  dish: string;
  description: string;
  descriptionEn: string;
  price: string;
}

export interface MustEatCardState extends MustEatCardText {
  exists: boolean;
  restaurantId: string | null;
  /** Kleines Vorschaubild als data:-URL; die Karte selbst bleibt privat. */
  preview: string | null;
}

const EMPTY_TEXT: MustEatCardText = { dish: '', description: '', descriptionEn: '', price: '' };

function cardRef(id: string) {
  return getAdminFirestore().collection(PRIVATE_MUST_EATS_COLLECTION).doc(id);
}

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Gleiche Feldfolge wie migrate-must-eats-private.ts, sonst passt verify nicht. */
function recordSha256(data: Record<string, unknown>): string {
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

const text = (value: unknown) => (typeof value === 'string' ? value : '');

async function previewOf(objectPath: string): Promise<string | null> {
  try {
    const [original] = await getAdminStorage().bucket().file(objectPath).download();
    const small = await sharp(original).resize({ width: PREVIEW_WIDTH }).webp({ quality: 70 }).toBuffer();
    return `data:image/webp;base64,${small.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function readMustEatCard(id: string, options: { preview?: boolean } = {}): Promise<MustEatCardState> {
  const data = (await cardRef(id).get()).data();
  if (!data) return { ...EMPTY_TEXT, exists: false, restaurantId: null, preview: null };
  const imageObjectPath = text(data.imageObjectPath);
  return {
    dish: text(data.dish),
    description: text(data.description),
    descriptionEn: text(data.descriptionEn),
    price: text(data.price),
    exists: Boolean(data.dish && data.description && data.descriptionEn && imageObjectPath),
    restaurantId: text(data.restaurantId) || null,
    preview:
      options.preview !== false && imageObjectPath.startsWith(OBJECT_PREFIX)
        ? await previewOf(imageObjectPath)
        : null,
  };
}

async function storeImage(id: string, upload: Buffer): Promise<{ objectPath: string; imageSha256: string }> {
  let image: Buffer;
  try {
    const source = sharp(upload).rotate();
    const { width } = await source.metadata();
    if (!width || width < MIN_WIDTH) {
      throw new MustEatCardError(`Die Karte ist zu klein — mindestens ${MIN_WIDTH} Pixel breit.`);
    }
    image = await source
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch (error) {
    if (error instanceof MustEatCardError) throw error;
    throw new MustEatCardError('Die Datei ist kein lesbares Bild (PNG, JPG oder WebP).');
  }

  const imageSha256 = sha256(image);
  const objectPath = `${OBJECT_PREFIX}${id}/${imageSha256}.webp`;
  const file = getAdminStorage().bucket().file(objectPath);
  const [exists] = await file.exists();
  if (!exists) {
    await file.save(image, {
      resumable: false,
      validation: 'crc32c',
      metadata: {
        contentType: 'image/webp',
        cacheControl: 'private, no-store',
        contentDisposition: 'inline',
        metadata: { mustEatId: id, imageSha256 },
      },
    });
  }
  return { objectPath, imageSha256 };
}

/**
 * Speichert Text und, falls mitgeschickt, ein neues Bild. Ohne neues Bild
 * bleibt das bisherige; eine ganz neue Karte braucht eins.
 */
export async function writeMustEatCard(input: {
  id: string;
  restaurantId: string;
  text: MustEatCardText;
  image: Buffer | null;
}): Promise<MustEatCardState> {
  const { id, restaurantId, image } = input;
  const cardText = {
    dish: input.text.dish.trim(),
    description: input.text.description.trim(),
    descriptionEn: input.text.descriptionEn.trim(),
    price: input.text.price.trim(),
  };
  if (!cardText.dish || !cardText.description || !cardText.descriptionEn) {
    throw new MustEatCardError('Gericht und beide Beschreibungen ausfüllen.');
  }

  const current = (await cardRef(id).get()).data() ?? {};
  const stored = image ? await storeImage(id, image) : null;
  const imageObjectPath = stored?.objectPath ?? text(current.imageObjectPath);
  if (!imageObjectPath) throw new MustEatCardError('Die Karte fehlt noch — bitte das Bild hinzufügen.');

  const next = {
    ...cardText,
    restaurantId,
    imageObjectPath,
    imageContentType: stored ? 'image/webp' : text(current.imageContentType) || 'image/webp',
    imageSha256: stored?.imageSha256 ?? text(current.imageSha256),
    schemaVersion: 1,
  };
  await cardRef(id).set(
    { ...next, recordSha256: recordSha256(next), updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  return readMustEatCard(id);
}
