// Die Share-Karte eines geteilten Decks: 1200×630, aufgebaut wie die Seite
// dahinter. Links die Ink-Tafel mit dem Kartenfaecher, rechts Papier mit Logo
// und der Erklaerung der Must Eats. Name und Stand stehen im Text der Vorschau
// (Titel und Beschreibung aus page.tsx), nicht im Bild.
//
// Ein Deck-Link ist der einzige Kanal, ueber den ohne Werbebudget jemand zu Eat
// This kommt, und er wird per WhatsApp/iMessage/Signal weitergereicht, also
// als Vorschaukarte, nicht als Text.
//
// SCHRIFT: Die Markenschrift darf nicht auf den Server. Jeder Text dieser
// Karte ist darum ein Bild, lokal in der Markenschrift gerendert
// (`npm run build:deck-og-art`, Bausteine unter public/pics/og-deck, Masse in
// lib/og/deck-art.json). Die Route setzt nur zusammen und laedt keine Schrift.
//
// WAS DIE KARTE ZEIGT, ist genau das, was die Seite dahinter auch jedem
// Anonymen zeigt: Vorderseiten nur aus dem oeffentlichen Satz.
// Kein Gericht aus dem bezahlten Teil, kein Spot.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { getPublicDeck, type PublicDeckCard } from '@/lib/profile/publicDeck.server';
import { getPublishedMustEatContentKey } from '@/lib/map/server-initial-map-data';
import { renderPrivateMustEatImage } from '@/lib/must-eat/private-image';
import { UID_SHAPE } from '@/lib/referral/constants';
import art from '@/lib/og/deck-art.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WIDTH = 1200;
const HEIGHT = 630;
const HALF = WIDTH / 2;
const PAD = 60;
const LOGO_W = 176;

const FAN_ORDER = { shown: 0, held: 1, missing: 2 } as const;
const FAN_SIZE = 5;
const CARD_W = 168;
const CARD_H = Math.round((CARD_W * 2115) / 1539);

const toData = (png: Buffer) => `data:image/png;base64,${png.toString('base64')}`;

/* resvg (der Rasterizer hinter Satori) kann kein WebP. Alles einmal je Prozess
   nach PNG und als Data-URI im Modul behalten. */
const fileCache = new Map<string, Promise<string>>();
function loadPublic(...segments: string[]): Promise<string> {
  const key = segments.join('/');
  let entry = fileCache.get(key);
  if (!entry) {
    entry = readFile(join(process.cwd(), 'public', ...segments))
      .then((buf) => sharp(buf).png().toBuffer())
      .then(toData);
    fileCache.set(key, entry);
  }
  return entry;
}

/** Eine offene Karte aus dem oeffentlichen Satz, ueber denselben Renderer wie
 *  /api/must-eat-image. Faellt sie aus, steht die Rueckseite an ihrer Stelle. */
async function cardFront(card: PublicDeckCard): Promise<string> {
  if (card.kind !== 'shown') return loadPublic('pics', 'card-back.webp');
  const id = decodeURIComponent(card.image.split('/').pop() ?? '');
  try {
    const key = await getPublishedMustEatContentKey(id);
    const image = await renderPrivateMustEatImage(
      key,
      { width: 360, quality: 80, webp: false },
      async () => {}
    );
    return toData(await sharp(image.body).png().toBuffer());
  } catch {
    return loadPublic('pics', 'card-back.webp');
  }
}

/** Die erste (offene) Karte in die Mitte, die naechsten abwechselnd links und
 *  rechts daneben, wie auf der Seite. */
function fanOffset(i: number): number {
  const step = Math.ceil(i / 2);
  return i % 2 === 1 ? -step : step;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const uid = params.get('uid') ?? '';
  const locale = params.get('locale') === 'en' ? 'en' : 'de';
  if (!UID_SHAPE.test(uid)) return new Response('invalid uid', { status: 400 });

  const deck = await getPublicDeck(uid);
  if (!deck) return new Response('not found', { status: 404 });

  const picked = [...deck.cards]
    .sort((a, b) => FAN_ORDER[a.kind] - FAN_ORDER[b.kind])
    .slice(0, FAN_SIZE);

  const copy = art[`copy-${locale}`];
  const [ground, text, fronts, back, logo] = await Promise.all([
    loadPublic('pics', 'og-deck', art.ground.file),
    loadPublic('pics', 'og-deck', copy.file),
    Promise.all(picked.map(cardFront)),
    loadPublic('pics', 'card-back.webp'),
    loadPublic('pics', 'email', 'eat-this-logo.png'),
  ]);

  const png = new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ground}
        width={WIDTH}
        height={HEIGHT}
        style={{ position: 'absolute', left: 0, top: 0 }}
        alt=""
      />

      {/* Der Faecher, mittig auf der Tafel. Gesammelte, aber nicht oeffentliche
          Karten zeigen den Ruecken, fehlende einen gedaempften Ruecken. Satori
          malt in Reihenfolge: die aeusseren zuerst, die mittlere obenauf. */}
      {picked
        .map((card, i) => ({ card, i, at: fanOffset(i) }))
        .sort((a, b) => Math.abs(b.at) - Math.abs(a.at))
        .map(({ card, i, at }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={card.kind === 'shown' ? fronts[i] : back}
            width={CARD_W}
            height={CARD_H}
            style={{
              position: 'absolute',
              left: HALF / 2 - CARD_W / 2 + at * CARD_W * 0.5,
              top: HEIGHT / 2 - CARD_H / 2 - 12 + Math.abs(at) * CARD_W * 0.08,
              transform: `rotate(${at * 9}deg)`,
              borderRadius: 7,
              boxShadow: '0 12px 24px rgba(0,0,0,0.5)',
              opacity: card.kind === 'missing' ? 0.4 : card.kind === 'held' ? 0.85 : 1,
            }}
            alt=""
          />
        ))}

      {/* Das Logo oben auf dem Papier, an derselben Kante wie der Text. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        width={LOGO_W}
        height={Math.round((LOGO_W * 65) / 260)}
        style={{ position: 'absolute', left: HALF + PAD, top: 52 }}
        alt=""
      />

      {/* Die Erklaerung, auf Hoehe der Tafelmitte. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={text}
        width={copy.width}
        height={copy.height}
        style={{ position: 'absolute', left: HALF + PAD, top: HEIGHT / 2 - copy.height / 2 + 24 }}
        alt=""
      />
    </div>,
    { width: WIDTH, height: HEIGHT }
  );

  // ImageResponse liefert nur PNG. Fotos und Papier machen JPEG hier rund
  // zehnmal kleiner, und Crawler holen das Bild jedes Mal neu.
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 84 })
    .toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: {
      'Content-Type': 'image/jpeg',
      /* Kurzer Cache, anders als bei der Restaurant-Karte: der Faecher
         aendert sich, sobald der Besitzer eine Karte umdreht. Eine Stunde alt
         darf er sein, ein Tag nicht.

         Dass `s-maxage` ueberhaupt ankommt, haengt daran, dass `api/og` seit
         dem 07.09.2026 aus dem Middleware-Matcher heraus ist; App Hosting
         streicht die Direktive sonst und haengt `private` an. Wer den Pfad
         dort wieder aufnimmt, macht aus dieser Zeile eine Luege. */
      'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
