// Die Bausteine der Vorschaukarte eines geteilten Decks (/api/og/deck), lokal
// in der Markenschrift gerendert. Die Schrift darf nicht auf den Server; die
// Route setzt zur Laufzeit nur diese Bilder zusammen.
//
// Ausgabe: public/pics/og-deck/* und lib/og/deck-art.json (Masse in px der
// 1200×630-Karte; die Textbilder sind doppelt so gross).
//
//   npm run build:deck-og-art
import React from 'react';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { loadBrandFont, BRAND_FONT_NAME } from '../lib/email/brandFont.ts';
import { translations } from '../lib/i18n/translations.ts';

const OUT = 'public/pics/og-deck';
const MANIFEST = 'lib/og/deck-art.json';
const SCALE = 2;
const INK = '#15120e';
/** Breite der Textspalte auf dem Papier, wie in der Route. */
const TEXT_WIDTH = 480;

const { faces, isBrandFace, files } = await loadBrandFont();
if (!isBrandFace) {
  throw new Error('Markenschrift fehlt in assets/fonts (npm run sync:brand-font).');
}
console.log(`Markenschrift: ${files.join(', ')}`);

await mkdir(OUT, { recursive: true });
await mkdir('lib/og', { recursive: true });
for (const f of await readdir(OUT)) await unlink(`${OUT}/${f}`);

const h = React.createElement;
const manifest: Record<string, { file: string; width: number; height: number }> = {};

/* Die Erklaerung von der Deck-Seite, dieselben Texte: „Must Eats" gross,
   darunter der Satz. Auf die Tinte beschnitten, damit die linke Kante der
   Route gilt. */
for (const locale of ['de', 'en'] as const) {
  const { collectLabel, collectBody } = translations[locale].deck;
  const width = TEXT_WIDTH * SCALE;
  const height = 400 * SCALE;
  const png = Buffer.from(
    await new ImageResponse(
      h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            width,
            height,
            fontFamily: BRAND_FONT_NAME,
            color: INK,
          },
        },
        h(
          'div',
          {
            style: {
              fontSize: 96 * SCALE,
              fontWeight: 700,
              letterSpacing: -0.04 * 96 * SCALE,
              lineHeight: 1,
            },
          },
          collectLabel
        ),
        h(
          'div',
          {
            style: {
              marginTop: 26 * SCALE,
              fontSize: 30 * SCALE,
              fontWeight: 400,
              lineHeight: 1.35,
              // Kein einzelnes Wort allein in der letzten Zeile.
              textWrap: 'balance',
            },
          },
          collectBody
        )
      ),
      { width, height, fonts: faces }
    ).arrayBuffer()
  );
  const { data, info } = await sharp(png)
    .trim({ threshold: 1 })
    .png({ palette: true, quality: 90 })
    .toBuffer({ resolveWithObject: true });
  const file = `copy-${locale}.png`;
  await writeFile(`${OUT}/${file}`, data);
  manifest[`copy-${locale}`] = { file, width: info.width / SCALE, height: info.height / SCALE };
}

/* Der Grund der Karte: links die Ink-Tafel, rechts Papier, beide mit dem
   Korn und den Gebrauchsspuren der Seite. */
const W = 1200 * SCALE;
const H = 630 * SCALE;
const HALF = W / 2;
async function sheet(color: string, wear: string): Promise<Buffer> {
  const grain = await sharp('public/pics/vintage/paper-grain.webp')
    .resize(192 * SCALE, 192 * SCALE)
    .png()
    .toBuffer();
  const worn = await sharp(wear).resize(HALF, H, { fit: 'fill' }).png().toBuffer();
  return sharp({ create: { width: HALF, height: H, channels: 4, background: color } })
    .composite([
      { input: grain, tile: true, blend: 'over' },
      { input: worn, blend: 'over' },
    ])
    .png()
    .toBuffer();
}
const ground = await sharp({ create: { width: W, height: H, channels: 4, background: '#fff' } })
  .composite([
    { input: await sheet(INK, 'public/pics/vintage/section-wear-dark.webp'), left: 0, top: 0 },
    { input: await sheet('#ffffff', 'public/pics/vintage/section-wear.webp'), left: HALF, top: 0 },
  ])
  .webp({ quality: 80 })
  .toBuffer();
await writeFile(`${OUT}/ground.webp`, ground);
manifest.ground = { file: 'ground.webp', width: 1200, height: 630 };

await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`${Object.keys(manifest).length} Bausteine nach ${OUT}`);
