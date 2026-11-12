// Das Vorschaubild eines geteilten Decks (og:image von /deck/<uid>), lokal
// fertig gerendert, je Sprache eine Datei.
//
// Warum vorab und nicht pro Abruf: Das Bild haengt an keinem einzelnen Deck
// (Name und Stand stehen im Titel und in der Beschreibung der Vorschau). Pro
// Abruf gerechnet dauerte der erste Aufruf live 20 s, weil die Kartenfotos erst
// aus dem Speicher kamen; Messenger warten nur wenige Sekunden. Als Datei
// kommt es sofort vom CDN.
//
// Warum lokal: Die Markenschrift darf nicht auf den Server.
//
// Aufbau wie die Deck-Seite: links die Ink-Tafel mit einem Faecher aus fuenf
// offenen Karten (der oeffentliche Satz, in Kartenreihenfolge), rechts Papier
// mit Logo, „Must Eats" und dem Erklaersatz (deck.collectLabel/collectBody).
//
// Ausgabe: public/pics/og/deck-{de,en}.png und lib/og/deck-og.json (Pfad und
// Version fuer den Cache der Messenger).
//
//   npm run build:deck-og-art
//
// Neu laufen lassen nach Aenderungen an den beiden Texten oder am
// oeffentlichen Kartensatz.
import React from 'react';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createClient } from '@sanity/client';
import { loadBrandFont, BRAND_FONT_NAME } from '../lib/email/brandFont.ts';
import { translations } from '../lib/i18n/translations.ts';
import { mapMustEatsQuery } from '../lib/map/queries.ts';
import { composeRevealedMustEats } from '../lib/map/revealed-must-eats.ts';
import type { MapMustEat } from '../lib/types.ts';

const OUT = 'public/pics/og';
const MANIFEST = 'lib/og/deck-og.json';
const SITE = 'https://www.eatthisdot.com';
const SCALE = 2;
const W = 1200;
const H = 630;
const HALF = W / 2;
const PAD = 60;
const TEXT_WIDTH = HALF - PAD * 2;
const INK = '#15120e';
const FAN_SIZE = 5;
const CARD_W = 168;
const CARD_H = Math.round((CARD_W * 2115) / 1539);
const LOGO_W = 176;

const { faces, isBrandFace, files } = await loadBrandFont();
if (!isBrandFace) {
  throw new Error('Markenschrift fehlt in assets/fonts (npm run sync:brand-font).');
}
console.log(`Markenschrift: ${files.join(', ')}`);
await mkdir(OUT, { recursive: true });
await mkdir('lib/og', { recursive: true });

const h = React.createElement;
const dataUri = (png: Buffer) => `data:image/png;base64,${png.toString('base64')}`;
const asPng = async (input: Buffer | string) => dataUri(await sharp(input).png().toBuffer());

/* Die offenen Karten: derselbe Satz, den die Seite jedem Anonymen zeigt, in
   Kartenreihenfolge. Die Bilder kommen ueber die oeffentliche Bild-Route der
   Live-Seite, also nur, was ohnehin jeder sieht. */
const catalog = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
});
const all = await catalog.fetch<MapMustEat[]>(mapMustEatsQuery);
const open = composeRevealedMustEats(all);
const fan = all.filter((m) => open.has(m._id)).slice(0, FAN_SIZE);
if (fan.length === 0) throw new Error('Keine offenen Must Eats gefunden.');
const fronts = await Promise.all(
  fan.map(async (m) => {
    const res = await fetch(`${SITE}/api/must-eat-image/${encodeURIComponent(m._id)}?w=360`);
    if (!res.ok) throw new Error(`Kartenbild ${m._id}: HTTP ${res.status}`);
    return asPng(Buffer.from(await res.arrayBuffer()));
  })
);
console.log(`Faecher: Karten ${fan.map((m) => m.order).join(', ')}`);

/* Der Grund: links die Ink-Tafel, rechts Papier, beide mit dem Korn und den
   Gebrauchsspuren der Seite. */
async function sheet(color: string, wear: string): Promise<Buffer> {
  const grain = await sharp('public/pics/vintage/paper-grain.webp')
    .resize(192 * SCALE, 192 * SCALE)
    .png()
    .toBuffer();
  const worn = await sharp(wear)
    .resize(HALF * SCALE, H * SCALE, { fit: 'fill' })
    .png()
    .toBuffer();
  return sharp({
    create: { width: HALF * SCALE, height: H * SCALE, channels: 4, background: color },
  })
    .composite([
      { input: grain, tile: true, blend: 'over' },
      { input: worn, blend: 'over' },
    ])
    .png()
    .toBuffer();
}
const ground = dataUri(
  await sharp({ create: { width: W * SCALE, height: H * SCALE, channels: 4, background: '#fff' } })
    .composite([
      { input: await sheet(INK, 'public/pics/vintage/section-wear-dark.webp'), left: 0, top: 0 },
      {
        input: await sheet('#ffffff', 'public/pics/vintage/section-wear.webp'),
        left: HALF * SCALE,
        top: 0,
      },
    ])
    .png()
    .toBuffer()
);
const logo = await asPng('public/pics/email/eat-this-logo.png');

/** Die erste Karte in die Mitte, die naechsten abwechselnd links und rechts. */
const fanOffset = (i: number) => (i % 2 === 1 ? -Math.ceil(i / 2) : Math.ceil(i / 2));

const manifest: Record<string, { path: string; version: string }> = {};
for (const locale of ['de', 'en'] as const) {
  const { collectLabel, collectBody } = translations[locale].deck;
  const s = (n: number) => n * SCALE;
  const png = Buffer.from(
    await new ImageResponse(
      h(
        'div',
        { style: { display: 'flex', position: 'relative', width: s(W), height: s(H) } },
        h('img', {
          src: ground,
          width: s(W),
          height: s(H),
          style: { position: 'absolute', left: 0, top: 0 },
        }),
        // Satori malt in Reihenfolge: die aeusseren Karten zuerst.
        ...fan
          .map((_, i) => ({ i, at: fanOffset(i) }))
          .sort((a, b) => Math.abs(b.at) - Math.abs(a.at))
          .map(({ i, at }) =>
            h('img', {
              key: i,
              src: fronts[i],
              width: s(CARD_W),
              height: s(CARD_H),
              style: {
                position: 'absolute',
                left: s(HALF / 2 - CARD_W / 2 + at * CARD_W * 0.5),
                top: s(H / 2 - CARD_H / 2 - 12 + Math.abs(at) * CARD_W * 0.08),
                transform: `rotate(${at * 9}deg)`,
                borderRadius: s(7),
                boxShadow: `0 ${s(12)}px ${s(24)}px rgba(0,0,0,0.5)`,
              },
            })
          ),
        h('img', {
          src: logo,
          width: s(LOGO_W),
          height: s(Math.round((LOGO_W * 65) / 260)),
          style: { position: 'absolute', left: s(HALF + PAD), top: s(52) },
        }),
        h(
          'div',
          {
            style: {
              position: 'absolute',
              left: s(HALF + PAD),
              top: 0,
              width: s(TEXT_WIDTH),
              height: s(H + 48),
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              fontFamily: BRAND_FONT_NAME,
              color: INK,
            },
          },
          h(
            'div',
            {
              style: {
                fontSize: s(96),
                fontWeight: 700,
                letterSpacing: s(-0.04 * 96),
                lineHeight: 1,
              },
            },
            collectLabel
          ),
          h(
            'div',
            {
              style: {
                marginTop: s(26),
                fontSize: s(30),
                fontWeight: 400,
                lineHeight: 1.35,
                // Kein einzelnes Wort allein in der letzten Zeile.
                textWrap: 'balance',
              },
            },
            collectBody
          )
        )
      ),
      { width: s(W), height: s(H), fonts: faces }
    ).arrayBuffer()
  );
  const out = await sharp(png)
    .resize(W, H)
    .png({ palette: true, quality: 92, dither: 0.6, effort: 10 })
    .toBuffer();
  const file = `deck-${locale}.png`;
  await writeFile(`${OUT}/${file}`, out);
  manifest[locale] = {
    path: `/pics/og/${file}`,
    version: createHash('sha1').update(out).digest('hex').slice(0, 8),
  };
  console.log(`${OUT}/${file}: ${Math.round(out.length / 1024)} kB`);
}

await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
