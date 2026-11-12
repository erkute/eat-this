// Die Share-Karte eines geteilten Decks: 1200×630, Ink-Grund, Name und Stand
// ueber die volle Breite, eine Reihe Kartenrücken darunter. Keine Figur, wie
// auf der Seite dahinter.
//
// Ein Deck-Link ist der einzige Kanal, über den ohne Werbebudget jemand zu Eat
// This kommt, und er wird per WhatsApp/iMessage/Signal weitergereicht — also
// als Vorschaukarte, nicht als Text. Bis zum 06.09.2026 hatte /deck/<uid>
// überhaupt keine Open-Graph-Daten: kein Bild, keine Beschreibung, nur ein
// Titel. Der Link sah aus wie ein Fehler.
//
// WAS DIE KARTE ZEIGT, ist genau das, was die Seite dahinter auch jedem
// Anonymen zeigt: Vorname und Stand. Kein Gericht, kein Spot, kein Bild
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
const ACCENT = '#a82b2e';

// Satori kennt keine Systemschriften; beide Schnitte liegen als Repo-Assets
// (über outputFileTracingIncludes in den Standalone-Build gezogen). Die
// Markenschrift ist hier bewusst NICHT dabei: die Lizenz deckt den Server nicht, und die
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

/* Das Logo liegt nur in Ink vor (fuer die Mails auf Papier). Auf dem
   Ink-Grund dieser Karte wird es umgekehrt, die Transparenz bleibt. */
let logoPromise: Promise<string> | null = null;
function loadLogo() {
  logoPromise ??= readFile(join(process.cwd(), 'public', 'pics', 'email', 'eat-this-logo.png'))
    .then((buf) => sharp(buf).negate({ alpha: false }).png().toBuffer())
    .then((png) => `data:image/png;base64,${png.toString('base64')}`);
  return logoPromise;
}

/* resvg (der Rasterizer hinter Satori) kann kein WebP — und alles Gezeichnete
   in `public/pics` IST WebP (Commit-Regel). Also einmal je Prozess über sharp
   nach PNG und als Data-URI im Modul behalten; das kostet den ersten Aufruf
   ein paar Millisekunden und danach nichts mehr. */
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

  const [{ saira, schoolbell }, logo, cardBack] = await Promise.all([
    loadFonts(),
    loadLogo(),
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
    ? `${deck.revealed} of ${deck.total} Must Eats flipped`
    : `${deck.revealed} von ${deck.total} Must Eats aufgedeckt`;
  // Saira Condensed ist schmal, aber ein langer Vorname braucht trotzdem eine
  // Stufe weniger, sonst laeuft die Zeile aus dem Bild.
  const headingSize = heading.length > 26 ? 104 : heading.length > 18 ? 124 : 148;

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
          liest und nicht als brave Kacheln. Ruecken, keine Gerichte: die
          gehoeren dem Besitzer. */}
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
        height={50}
        style={{ position: 'absolute', top: 46, left: 60 }}
        alt=""
      />

      {/* Kicker, Ueberschrift, Stand: ueber die volle Breite, ohne Figur. */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          right: 60,
          top: 150,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            color: ACCENT,
            fontFamily: 'Schoolbell',
            fontSize: 32,
            letterSpacing: 4,
            marginBottom: 14,
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
            marginTop: 24,
            color: 'rgba(255,255,255,0.82)',
            fontFamily: 'Schoolbell',
            fontSize: 44,
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

         Dass `s-maxage` überhaupt ankommt, hängt daran, dass `api/og` seit
         dem 07.09.2026 aus dem Middleware-Matcher heraus ist — App Hosting
         streicht die Direktive sonst und hängt `private` an. Wer den Pfad
         dort wieder aufnimmt, macht aus dieser Zeile eine Lüge. */
      'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
