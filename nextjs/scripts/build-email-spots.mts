// Rendert die Spot-Cards der Anmelde-Mail vor.
//
// Warum lokal statt zur Laufzeit: die Karten setzen die Restaurantnamen in der
// Markenschrift, und FF Providence Sans Pro liegt unter einer Desktop-Lizenz —
// die deckt das Erstellen von Grafiken ab, nicht das Ausliefern der Schrift auf
// einem Server. Vorrendern hält die Schrift auf diesem Rechner und legt nur
// fertige Bilder ins Repo. Nebeneffekt: auf Staging waren die Karten hinter der
// Basic Auth nicht abrufbar, statische Bilder unter /pics sind es.
//
// Der Preis: die kuratierten Spots rotieren nicht mehr von selbst aus Sanity.
// Wenn sich die Auswahl ändern soll, dieses Skript neu laufen lassen.
//
// Run:  npm run build:email-spots
//       npm run build:email-spots -- --limit 4
//
// Output: public/pics/email/spots/<slug>.jpg + emails/spots.generated.ts

import React from 'react';
// tsx übersetzt JSX außerhalb von Next mit dem klassischen Runtime, der ein
// globales `React` erwartet — anders als Next, das den automatischen benutzt.
(globalThis as unknown as { React: typeof React }).React = React;
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { createClient } from '@sanity/client';
import { readdir, writeFile, mkdir, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import {
  SpotCardImage,
  SPOT_CARD_WIDTH,
  SPOT_CARD_HEIGHT,
  isValidSlug,
} from '../lib/email/spotCard.tsx';
import { loadBrandFont } from '../lib/email/brandFont.ts';
import { emailSpotsQuery } from '../lib/queries.ts';

/** Muss zu MAX_SPOTS in emails/SignupEmail.tsx passen. */
const DEFAULT_LIMIT = 3;

/** Anzeigebreite in der Mail; das JPEG selbst ist 2x. */
const DISPLAY_WIDTH = 536;

const OUT_DIR = join(process.cwd(), 'public', 'pics', 'email', 'spots');
const MANIFEST = join(process.cwd(), 'emails', 'spots.generated.ts');

const limitArg = process.argv.indexOf('--limit');
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : DEFAULT_LIMIT;
if (!Number.isInteger(limit) || limit < 1 || limit > 8) {
  console.error(`❌ --limit muss zwischen 1 und 8 liegen, war: ${process.argv[limitArg + 1]}`);
  process.exit(1);
}

// Eigener Client statt lib/sanity.ts: das Modul ist `server-only` und wirft
// außerhalb von Next. Gelesen wird nur das öffentliche Produktions-Dataset.
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID ?? 'ehwjnjr2',
  dataset: process.env.SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'published',
});

interface SanitySpot {
  name: string;
  slug: string;
  area: string;
  cuisine?: string;
  photo: string;
}

const spots = await client.fetch<SanitySpot[]>(emailSpotsQuery, { limit });

if (spots.length === 0) {
  console.error('❌ Sanity liefert keine Spots — Auswahl unverändert gelassen.');
  process.exit(1);
}

const { faces, isBrandFace, files } = await loadBrandFont();
if (!isBrandFace) {
  console.warn(
    '\n⚠️  FF Providence Sans Pro fehlt — die Namen setzen in Schoolbell.\n' +
      '   Erst `npm run sync:brand-font`, dann hier erneut.\n'
  );
} else {
  console.log(`Markenschrift: ${files.join(', ')}`);
}

await mkdir(OUT_DIR, { recursive: true });

const rendered: { slug: string; name: string; meta: string; version: string }[] = [];

for (const spot of spots) {
  // Der Slug wird zum Dateinamen — auch wenn er aus Sanity kommt, nicht
  // ungeprüft in einen Pfad schreiben.
  if (!isValidSlug(spot.slug)) {
    console.warn(`  übersprungen (ungültiger Slug): ${spot.slug}`);
    continue;
  }

  const png = new ImageResponse(React.createElement(SpotCardImage, { spot }), {
    width: SPOT_CARD_WIDTH,
    height: SPOT_CARD_HEIGHT,
    fonts: faces,
  });

  // ImageResponse liefert nur PNG (~1 MB bei einem Foto). Die Komposition ist
  // flach, also als JPEG neu kodieren: rund ein Zehntel.
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  await writeFile(join(OUT_DIR, `${spot.slug}.jpg`), jpeg);

  const meta = [spot.area, spot.cuisine].filter(Boolean).join(' · ');
  // Inhalts-Hash fuer die URL — siehe build-email-phones.mts.
  const version = createHash('sha1').update(jpeg).digest('hex').slice(0, 8);
  rendered.push({ slug: spot.slug, name: spot.name, meta, version });
  console.log(`  ${spot.slug}.jpg  ${Math.round(jpeg.length / 1024)} kB  —  ${spot.name}`);
}

if (rendered.length === 0) {
  console.error('❌ Keine Karte gerendert — Manifest unverändert gelassen.');
  process.exit(1);
}

// Karten aus einer früheren Auswahl entfernen, sonst wächst public/ still mit
// Bildern, auf die keine Mail mehr zeigt.
const keep = new Set(rendered.map((r) => `${r.slug}.jpg`));
for (const file of await readdir(OUT_DIR)) {
  if (file.endsWith('.jpg') && !keep.has(file)) {
    await unlink(join(OUT_DIR, file));
    console.log(`  entfernt (nicht mehr kuratiert): ${file}`);
  }
}

await writeFile(
  MANIFEST,
  [
    '// GENERIERT von `npm run build:email-spots` — nicht von Hand editieren.',
    '// Die Bilder liegen unter public/pics/email/spots/<slug>.jpg.',
    '',
    'export interface EmailSpot {',
    '  /** Sanity-Slug — Dateiname der Karte und Ziel des /map?r=-Links. */',
    '  slug: string;',
    '  /** Nur für den Alt-Text; im Bild steht der Name bereits gesetzt. */',
    '  name: string;',
    '  /** „Bezirk · Küche" für den Alt-Text. */',
    '  meta: string;',
    '  /** Inhalts-Hash; haengt als ?v= an der Bild-URL, sonst cacht Gmail ewig. */',
    '  version: string;',
    '}',
    '',
    `/** Anzeigebreite in CSS-Pixeln; die JPEGs sind ${SPOT_CARD_WIDTH}×${SPOT_CARD_HEIGHT} (2x). */`,
    `export const SPOT_DISPLAY_WIDTH = ${DISPLAY_WIDTH};`,
    `export const SPOT_DISPLAY_HEIGHT = ${Math.round((DISPLAY_WIDTH * SPOT_CARD_HEIGHT) / SPOT_CARD_WIDTH)};`,
    '',
    `export const EMAIL_SPOTS: readonly EmailSpot[] = ${JSON.stringify(rendered, null, 2)};`,
    '',
  ].join('\n')
);

console.log(`\nManifest: emails/spots.generated.ts (${rendered.length} Spots)`);
