/**
 * Legt Must-Eats an und nimmt welche heraus — beides gegen ein Spec-JSON.
 *
 *   npx tsx scripts/curate-must-eats.ts --spec scripts/data/must-eat-curation-2026-08-29.json \
 *     --cards ../CARDS --dry-run
 *   npx tsx scripts/curate-must-eats.ts --spec … --cards ../CARDS --apply
 *
 * Ein Must-Eat hat zwei Hälften: die öffentliche in Sanity (Referenz auf das
 * Restaurant, Reihenfolge, Anon-Flag) und die bezahlte in Firestore plus
 * Cloud Storage (Gericht, Beschreibungen, Preis, Bild). Die Reihenfolge hier
 * ist kein Zufall: Firestore zuerst, Sanity danach und nur als **Draft**.
 * Veröffentlichen ist eine redaktionelle Entscheidung — und wenn der Draft
 * live geht, liegt der Premium-Datensatz schon bereit, statt dass
 * hydrateAuthorizedMustEats ins Leere greift.
 *
 * `retire` löscht das Sanity-Dokument und den Firestore-Datensatz. Das Objekt
 * im Bucket bleibt liegen (privat, ohne Dokument unerreichbar) und ebenso die
 * `unlockedMustEats`-Einträge der Nutzer, die die Karte schon aufgedeckt
 * hatten — beides ist der Rückweg, falls die Karte doch zurückkommt.
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

const COLLECTION = 'privateMustEats';
const OBJECT_PREFIX = 'premium/must-eats/';
const MAX_WIDTH = 1200;
const WEBP_QUALITY = 80;

interface AddSpec {
  id: string;
  order: number;
  restaurantId: string;
  revealedForAnon: boolean;
  file: string;
  dish: string;
  description: string;
  descriptionEn: string;
  price: string;
}

interface RetireSpec {
  id: string;
  note?: string;
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

/** Feldreihenfolge wie in migrate-must-eats-private.ts. */
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
  const specPath = arg('--spec');
  if (!specPath) throw new Error('Fehlt: --spec <json>');
  const cardsDir = arg('--cards');
  if (!cardsDir) throw new Error('Fehlt: --cards <ordner>');
  const projectId = arg('--project') ?? process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (!projectId) throw new Error('Fehlt: --project oder FIREBASE_ADMIN_PROJECT_ID');
  const bucketName = arg('--bucket') ?? `${projectId}.firebasestorage.app`;

  const full = JSON.parse(await readFile(specPath, 'utf8')) as {
    add: AddSpec[];
    retire: RetireSpec[];
  };
  // --only zieht eine einzelne Karte nach, ohne die uebrigen Eintraege der
  // Spec noch einmal anzufassen — etwa wenn ein Kartenmotiv korrigiert wurde.
  const only = arg('--only');
  const spec = only
    ? {
        add: full.add.filter((entry) => entry.id === only),
        retire: full.retire.filter((entry) => entry.id === only),
      }
    : full;
  if (only && spec.add.length + spec.retire.length === 0) {
    throw new Error(`--only ${only} kommt in der Spec nicht vor`);
  }

  const sanityProject = process.env.SANITY_PROJECT_ID ?? 'ehwjnjr2';
  const sanityDataset = process.env.SANITY_DATASET ?? 'production';
  // Ohne Write-Token laeuft nur die Firestore-Haelfte. Fuer Staging gibt es
  // lokal keinen — die Sanity-Dokumente kommen dort ueber die MCP-Tools bzw.
  // den CLI. Lesen geht auch ohne, das Dataset ist oeffentlich; Drafts sind
  // dann allerdings unsichtbar.
  const token = process.env.SANITY_API_WRITE_TOKEN;
  const sanity = createClient({
    projectId: sanityProject,
    dataset: sanityDataset,
    apiVersion: '2024-01-01',
    useCdn: false,
    perspective: token ? 'raw' : 'published',
    ...(token ? { token } : {}),
  });

  const app = initializeTarget(projectId, bucketName);
  const db = getFirestore(app);
  const bucket = getStorage(app).bucket(bucketName);

  console.log(`Firebase: ${projectId} / ${bucketName}`);
  console.log(
    `Sanity:   ${sanityProject}/${sanityDataset}${token ? '' : ' — ohne Write-Token, Sanity-Schritte bleiben offen'}`
  );

  for (const entry of spec.add) {
    const restaurant = await sanity.fetch<{ name: string } | null>(`*[_id == $id][0]{name}`, {
      id: entry.restaurantId,
    });
    if (!restaurant) throw new Error(`Restaurant ${entry.restaurantId} gibt es nicht`);
    const clash = await sanity.fetch<{ _id: string }[]>(
      `*[_type == "mustEat" && !(_id in path("drafts.**")) && order == $order && _id != $id]{_id}`,
      { order: entry.order, id: entry.id }
    );
    if (clash.length > 0) {
      console.log(
        `  ! order ${entry.order} ist publiziert schon belegt von ${clash.map((c) => c._id).join(', ')}`
      );
    }

    const image = await sharp(path.join(cardsDir, entry.file))
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    const imageSha256 = sha256(image);
    const imageObjectPath = `${OBJECT_PREFIX}${entry.id}/${imageSha256}.webp`;
    const record = {
      schemaVersion: 1 as const,
      dish: entry.dish,
      description: entry.description,
      descriptionEn: entry.descriptionEn,
      price: entry.price,
      restaurantId: entry.restaurantId,
      imageObjectPath,
      imageContentType: 'image/webp',
      imageSha256,
    };

    console.log(
      `${apply ? 'anlegen ' : 'wuerde anlegen'} ${entry.id} — ${restaurant.name} / ${entry.dish}, order ${entry.order}, ${Math.round(image.length / 1024)} kB`
    );
    if (!apply) continue;

    const file = bucket.file(imageObjectPath);
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
          metadata: { mustEatId: entry.id, imageSha256 },
        },
      });
    }
    await db
      .collection(COLLECTION)
      .doc(entry.id)
      .set({
        ...record,
        recordSha256: recordSha256(record),
        updatedAt: FieldValue.serverTimestamp(),
      });

    // createIfNotExists + patch statt createOrReplace: ein bereits offener
    // Draft aus anderer Arbeit bleibt so erhalten.
    const draftId = `drafts.${entry.id}`;
    if (!token) {
      console.log(
        `         OFFEN: Sanity-Dokument ${draftId} anlegen (mustEat, restaurantRef ${entry.restaurantId}, order ${entry.order}, revealedForAnon ${entry.revealedForAnon})`
      );
      continue;
    }
    await sanity
      .transaction()
      .createIfNotExists({ _id: draftId, _type: 'mustEat' })
      .patch(draftId, (patch) =>
        patch.set({
          _type: 'mustEat',
          restaurantRef: { _type: 'reference', _ref: entry.restaurantId },
          order: entry.order,
          revealedForAnon: entry.revealedForAnon,
        })
      )
      .commit();
    console.log(`         Sanity-Draft ${draftId} liegt bereit (nicht publiziert)`);
  }

  // Einmal lesen statt einmal pro Eintrag: die Subcollection liegt ueber alle
  // Nutzer verstreut, ein Scan pro Karte waere derselbe Scan mehrfach.
  const unlockCounts = new Map<string, number>();
  if (spec.retire.length > 0) {
    for (const document of (await db.collectionGroup('unlockedMustEats').get()).docs) {
      unlockCounts.set(document.id, (unlockCounts.get(document.id) ?? 0) + 1);
    }
  }

  for (const entry of spec.retire) {
    const doc = await sanity.fetch<{ _id: string; restaurant: string; order: number } | null>(
      `*[_id == $id || _id == $draftId][0]{_id, order, "restaurant": restaurantRef->name}`,
      { id: entry.id, draftId: `drafts.${entry.id}` }
    );
    const unlocked = unlockCounts.get(entry.id) ?? 0;
    const state = doc?._id?.startsWith('drafts.') ? 'nur Draft' : 'publiziert';
    console.log(
      `${apply ? 'entferne' : 'wuerde entfernen'} ${entry.id} — ${doc?.restaurant ?? 'nicht in Sanity'}, order ${doc?.order}, ${state}, von ${unlocked} Nutzern aufgedeckt`
    );
    if (!apply) continue;

    await db.collection(COLLECTION).doc(entry.id).delete();
    if (!token) {
      console.log(
        `         Firestore-Datensatz geloescht — OFFEN: Sanity ${entry.id} (und drafts.${entry.id}) loeschen`
      );
      continue;
    }
    await sanity.delete({
      query: `*[_id == $id || _id == $draftId]`,
      params: { id: entry.id, draftId: `drafts.${entry.id}` },
    });
    console.log(`         Sanity-Dokument und Firestore-Datensatz geloescht`);
  }

  console.log(
    JSON.stringify({
      status: apply ? 'applied' : 'dry-run',
      project: projectId,
      added: spec.add.length,
      retired: spec.retire.length,
    })
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Kuratierung fehlgeschlagen');
  process.exit(1);
});
