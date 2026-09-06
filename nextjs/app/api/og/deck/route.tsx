// Die Share-Karte eines geteilten Decks — 1200×630, Ink-Grund, Spielerkarte
// links, Name und Stand rechts, eine Reihe Kartenrücken darunter.
//
// Ein Deck-Link ist der einzige Kanal, über den ohne Werbebudget jemand zu Eat
// This kommt, und er wird per WhatsApp/iMessage/Signal weitergereicht — also
// als Vorschaukarte, nicht als Text. Bis zum 06.09.2026 hatte /deck/<uid>
// überhaupt keine Open-Graph-Daten: kein Bild, keine Beschreibung, nur ein
// Titel. Der Link sah aus wie ein Fehler.
//
// WAS DIE KARTE ZEIGT, ist genau das, was die Seite dahinter auch jedem
// Anonymen zeigt: Vorname, Figur, Stand. Kein Gericht, kein Spot, kein Bild
// aus dem bezahlten Teil. Die uid steht ohnehin in der URL, die der Absender
// gerade selbst herumschickt — die Karte verrät also nichts, was der Empfänger
// nicht mit einem Klick sähe.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { getPublicDeck } from '@/lib/profile/publicDeck.server';
import { UID_SHAPE } from '@/lib/referral/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WIDTH = 1200;
const HEIGHT = 630;

const INK = '#15120e';
const PAPER = '#ffffff';
const ACCENT = '#ffc600';

// Satori kennt keine Systemschriften; beide Schnitte liegen als Repo-Assets
// (über outputFileTracingIncludes in den Standalone-Build gezogen). Providence
// ist hier bewusst NICHT dabei: die Lizenz deckt den Server nicht, und die
// Datei darf nach .gitignore gar nicht erst hier liegen — dieselbe Regel wie
// bei den E-Mail-Bildern.
let fontsPromise: Promise<{ saira: Buffer; schoolbell: Buffer }> | null = null;
function loadFonts() {
  fontsPromise ??= (async () => {
    const dir = join(process.cwd(), 'assets', 'fonts');
    const [saira, schoolbell] = await Promise.all([
      readFile(join(dir, 'SairaCondensed-ExtraBold.ttf')),
      readFile(join(dir, 'Schoolbell-Regular.ttf')),
    ]);
    return { saira, schoolbell };
  })();
  return fontsPromise;
}

let logoPromise: Promise<string> | null = null;
function loadLogo() {
  logoPromise ??= readFile(
    join(process.cwd(), 'public', 'pics', 'email', 'eat-this-logo.png')
  ).then((buf) => `data:image/png;base64,${buf.toString('base64')}`);
  return logoPromise;
}

/* resvg (der Rasterizer hinter Satori) kann kein WebP — und alles Gezeichnete
   in `public/pics` IST WebP (Commit-Regel). Also einmal je Prozess über sharp
   nach PNG und als Data-URI im Modul behalten; das kostet den ersten Aufruf
   ein paar Millisekunden und danach nichts mehr. Ein blankes Feld statt der
   Figur wäre die Alternative, und die fällt beim Teilen sofort auf. */
const webpCache = new Map<string, Promise<string>>();
function loadWebpAsPng(...segments: string[]): Promise<string> {
  const key = segments.join('/');
  let entry = webpCache.get(key);
  if (!entry) {
    entry = readFile(join(process.cwd(), 'public', ...segments))
      .then((buf) => sharp(buf).png().toBuffer())
      .then((png) => `data:image/png;base64,${png.toString('base64')}`);
    webpCache.set(key, entry);
  }
  return entry;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const uid = params.get('uid') ?? '';
  const locale = params.get('locale') === 'en' ? 'en' : 'de';
  if (!UID_SHAPE.test(uid)) return new Response('invalid uid', { status: 400 });

  const deck = await getPublicDeck(uid);
  if (!deck) return new Response('not found', { status: 404 });

  const [{ saira, schoolbell }, logo, figure, cardBack] = await Promise.all([
    loadFonts(),
    loadLogo(),
    loadWebpAsPng('pics', 'avatar', `${deck.avatar}.webp`),
    loadWebpAsPng('pics', 'card-back.webp'),
  ]);

  const en = locale === 'en';
  const kicker = en ? 'A DECK ON EAT THIS' : 'EIN DECK BEI EAT THIS';
  const heading = deck.name
    ? en
      ? `${deck.name}'s deck`
      : `${deck.name}s Deck`
    : en
      ? 'The deck'
      : 'Das Deck';
  const stand = en
    ? `${deck.revealed} of ${deck.total} cards flipped`
    : `${deck.revealed} von ${deck.total} Karten umgedreht`;
  // Saira Condensed ist schmal, aber ein langer Vorname braucht trotzdem eine
  // Stufe weniger — sonst läuft die Zeile aus dem Bild.
  const headingSize = heading.length > 22 ? 84 : heading.length > 15 ? 100 : 118;

  const png = new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: INK,
        fontFamily: 'Saira Condensed',
      }}
    >
      {/* Die Kartenreihe am unteren Rand: angeschnitten, damit sie als Stapel
          liest und nicht als sieben brave Kacheln. Rücken, keine Gerichte —
          die gehören dem Besitzer. */}
      <div style={{ position: 'absolute', left: 0, bottom: -74, display: 'flex' }}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={cardBack}
            width={148}
            height={203}
            style={{ marginLeft: i === 0 ? 44 : 8, opacity: 0.24 }}
            alt=""
          />
        ))}
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        width={200}
        height={80}
        style={{ position: 'absolute', top: 46, left: 54 }}
        alt=""
      />

      {/* Die Spielerkarte, wie auf der Seite: Papier, innen das Ink-gerahmte
          Feld mit der Figur, darunter der Name. */}
      <div
        style={{
          position: 'absolute',
          left: 54,
          top: 168,
          display: 'flex',
          flexDirection: 'column',
          width: 268,
          height: 368,
          padding: 12,
          backgroundColor: PAPER,
          borderRadius: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexGrow: 1,
            alignItems: 'flex-end',
            justifyContent: 'center',
            backgroundColor: '#f6efe4',
            border: '3px solid rgba(21,18,14,0.55)',
            borderRadius: 7,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={figure} width={196} height={226} style={{ marginBottom: 6 }} alt="" />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 12,
            color: INK,
            fontSize: 38,
            lineHeight: 1,
            textTransform: 'uppercase',
          }}
        >
          {deck.name ?? (en ? 'This deck' : 'Dieses Deck')}
        </div>
      </div>

      {/* Rechts: Kicker, Überschrift, Stand. */}
      <div
        style={{
          position: 'absolute',
          left: 372,
          right: 60,
          top: 178,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            color: ACCENT,
            fontFamily: 'Schoolbell',
            fontSize: 30,
            letterSpacing: 4,
            marginBottom: 18,
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            display: 'flex',
            color: PAPER,
            fontSize: headingSize,
            lineHeight: 1,
            textTransform: 'uppercase',
          }}
        >
          {heading}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 26,
            color: 'rgba(255,255,255,0.82)',
            fontFamily: 'Schoolbell',
            fontSize: 40,
          }}
        >
          {stand}
        </div>
      </div>
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: 'Saira Condensed', data: saira, weight: 800, style: 'normal' },
        { name: 'Schoolbell', data: schoolbell, weight: 400, style: 'normal' },
      ],
    }
  );

  // ImageResponse liefert nur PNG. Die Komposition ist flach, aber die
  // Kartenrücken sind Fotos — JPEG ist hier rund zehnmal kleiner, und
  // Crawler holen das Bild jedes Mal neu (siehe Cache-Hinweis unten).
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 84 })
    .toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: {
      'Content-Type': 'image/jpeg',
      /* Kurzer Cache, anders als bei der Restaurant-Karte: der Stand auf
         dieser Karte ändert sich, sobald der Besitzer eine Karte umdreht.
         Eine Stunde alt darf sie sein, ein Tag nicht.

         Wobei: App Hosting streicht `public`/`s-maxage` auf jedem Pfad, den
         die Middleware matcht, und hängt `private` an (gemessen auf prod,
         25.08.2026). Für Crawler ist ohnehin jeder Abruf neu. */
      'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
