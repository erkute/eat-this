// Renders every brand-font surface of the auth emails into transparent PNGs.
//
// Why images: Gmail strips @font-face, so live text can never carry FF
// Providence Sans Pro — the face the whole home design rests on. Baking the
// headlines keeps the brand voice in the inbox; everything else in the mails
// stays live text (see emails/theme.ts).
//
// Run:  npm run build:email-art
//
// Output: nextjs/public/pics/email/<id>.png plus emails/art.generated.ts,
// which carries the trimmed 1x dimensions so the templates never hardcode a
// width that drifts when the copy changes.
//
// The face comes from lib/email/brandFont.ts — drop the Providence desktop
// font into assets/fonts/ and re-run; until then it renders in Schoolbell and
// says so loudly.

import React from 'react';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { loadBrandFont, BRAND_FONT_NAME } from '../lib/email/brandFont.ts';
import { COLOR } from '../emails/theme.ts';

/** Everything is rendered at 2x and downscaled — retina inboxes are the norm. */
const SCALE = 2;

interface ArtSpec {
  id: string;
  lines: string[];
  color: string;
  /** Starting font size in 1x CSS pixels — a seed, not the final value. */
  size: number;
  lineHeight?: number;
  letterSpacing?: number;
  align?: 'left' | 'center';
  /**
   * Eingebackene Hintergrundfarbe statt Transparenz.
   *
   * Nur fuer Grafiken, die sonst im Dark Mode verschwinden: Clients wie die
   * Gmail-App invertieren den Untergrund der Mail, das Bild aber nicht. Ink auf
   * einem invertiert-dunklen Papier bzw. Weiss auf einem invertiert-hellen
   * Footer ist dann unsichtbar. Mit eigener Flaeche bringt die Grafik ihren
   * Kontrast mit. Rote Kunst braucht das nicht — Rot ueberlebt beide Faelle.
   */
  bg?: string;
  /**
   * Exact rendered width at 1x. The renderer measures the first pass and
   * re-renders at a corrected font size to hit it, so swapping the display
   * face (Schoolbell stand-in → FF Providence Sans Pro) changes the letter
   * shapes but never the layout of the mail around them.
   */
  width: number;
  /**
   * Übernimmt die Schriftgröße einer anderen Grafik, statt auf `width` zu
   * strecken. Für Sprachfassungen: „WELCOME BACK" auf die Breite von
   * „WILLKOMMEN ZURÜCK" gezogen, stünde eine Nummer größer in der Mail als
   * das Original. `width` ist dann nur der Startwert für den Canvas.
   */
  sameSizeAs?: string;
  /** Schriftschnitt; Default 700 (Headlines). Fliesstext steht in 400. */
  weight?: 400 | 700;
  /**
   * Fliesstext statt Zeile: feste Schriftgroesse (`size`), Umbruch bei dieser
   * Breite in CSS-Pixeln. `width` wird dann nicht angefahren, sondern ist nur
   * die Obergrenze — die Grafik ist so breit, wie der Text laeuft.
   */
  wrap?: number;
  /**
   * Feste Zeilenhoehe in CSS-Pixeln statt eng beschnitten — fuer Grafiken, die
   * in verschiedenen Fassungen gleich hoch sein muessen (Knopf-Wort).
   */
  lineBox?: number;
}

// Headlines mirror home: uppercase, tight leading, slight negative tracking
// (--et-tracking-title). Seit 22.09.2026 steht die Mail mittig (Betreiber),
// also sind auch die Grafiken mittig gesetzt.
//
// Seit 22.09.2026 steht ALLES Gestaltete der Mail in der Markenschrift, auch
// Fliesstext und Footer — die Seite setzt beides in Providence, und die Mail
// wirkte daneben wie ein Fremdkoerper (Betreiber: "da wird nicht ueberall
// meine Font benutzt"). Live-Text bleiben nur der Knopf, der Ersatz-Link
// darunter und der Satz, warum die Mail kommt: ohne Bilder muss sich die Mail
// noch bedienen lassen, und Spamfilter misstrauen Mails ohne echten Text.
const KICKER = { color: COLOR.accent, bg: COLOR.surface, size: 14, letterSpacing: 1.2 } as const;

/** Fliesstext: feste Groesse, Umbruch bei `wrap`. 340 px statt der vollen
 *  Spaltenbreite, weil ein Bild auf dem Telefon mitschrumpft — so bleibt die
 *  Schrift dort bei ihrer Groesse, statt auf 11 px zu fallen. */
const PARAGRAPH = { weight: 400, size: 17, lineHeight: 1.45, wrap: 340, width: 340 } as const;

/** Knopf-Wort wie `.action` in der Tour: Providence fett, Ink auf Gelb. */
const CTA_LABEL = {
  color: COLOR.onAccent,
  bg: COLOR.accent,
  size: 17,
  align: 'center',
  wrap: 300,
  width: 300,
  lineBox: 22,
} as const;

/** Footer-Zeilen wie im SiteFooter: Versalien, fett, leicht gesperrt. */
const FOOTER_LINK = {
  color: COLOR.text,
  bg: COLOR.surface,
  size: 13,
  letterSpacing: 0.5,
  // Mittig: dann hat jede Grafik links und rechts dieselbe Luft, und die
  // Punkte zwischen den Links sitzen in der Mitte.
  align: 'center',
  wrap: 600,
  width: 600,
} as const;

const ART: ArtSpec[] = [
  {
    id: 'headline-signup',
    lines: ['WE TELL YOU', 'WHAT TO EAT.'],
    color: COLOR.text,
    size: 54,
    lineHeight: 0.92,
    letterSpacing: -1,
    align: 'center',
    width: 470,
  },
  {
    id: 'headline-login',
    lines: ['WILLKOMMEN', 'ZURÜCK'],
    color: COLOR.text,
    size: 54,
    lineHeight: 0.92,
    letterSpacing: -1,
    align: 'center',
    width: 470,
  },
  {
    id: 'kicker-signup',
    lines: ['DEIN ZUGANG ZU EAT THIS'],
    ...KICKER,
    align: 'center',
    width: 220,
  },
  {
    id: 'kicker-login',
    lines: ['SCHÖN, DASS DU WIEDER DA BIST'],
    ...KICKER,
    align: 'center',
    width: 276,
  },
  {
    id: 'lead-signup',
    lines: [
      'Wir empfehlen dir gute Spots in Berlin und unsere Must Eat Gerichte, für die sich der Besuch lohnt.',
    ],
    ...PARAGRAPH,
    color: COLOR.muted,
    bg: COLOR.surface,
    align: 'center',
  },
  {
    id: 'lead-login',
    lines: ['Ein Klick und deine Map ist offen — mit allem, was du schon freigeschaltet hast.'],
    ...PARAGRAPH,
    color: COLOR.muted,
    bg: COLOR.surface,
    align: 'center',
  },
  {
    id: 'kicker-starter',
    lines: ['DEIN STARTER PACK'],
    ...KICKER,
    bg: COLOR.raised,
    align: 'center',
    width: 170,
    sameSizeAs: 'kicker-signup',
  },
  {
    id: 'title-starter',
    lines: ['20 MUST EATS.', 'FÜR DEINEN START.'],
    color: COLOR.text,
    bg: COLOR.raised,
    size: 30,
    lineHeight: 1,
    letterSpacing: -0.5,
    align: 'center',
    width: 330,
  },
  {
    id: 'body-starter',
    lines: [
      'Starte mit 20 Must Eat Empfehlungen in Berlin. Jede Karte verrät dir, was du an einem Spot bestellen solltest. Manche sind schon offen, andere deckst du erst vor Ort auf.',
    ],
    ...PARAGRAPH,
    color: COLOR.text,
    bg: COLOR.raised,
    align: 'center',
  },

  {
    id: 'slogan-inverse',
    lines: ['WE TELL YOU WHAT TO EAT'],
    color: COLOR.text,
    bg: COLOR.surface,
    size: 12,
    letterSpacing: 2,
    align: 'center',
    width: 172,
  },
  // Die Beschriftung des Knopfs. Der Knopf selbst bleibt ein echter Link mit
  // gelber Flaeche; nur das Wort ist Bild, damit es in der Markenschrift steht
  // wie jeder Knopf der Seite (Betreiber, 22.09.2026). Bei blockierten Bildern
  // steht der Alt-Text auf dem Gelb — der Knopf ist nie leer.
  { id: 'cta-anmelden', lines: ['Anmelden'], ...CTA_LABEL },
  { id: 'cta-sign-up', lines: ['Sign up'], ...CTA_LABEL },
  { id: 'cta-sign-in', lines: ['Sign in'], ...CTA_LABEL },
  // FOOTER — dieselben Zeilen wie SiteFooter, in derselben Schrift.
  { id: 'footer-follow', lines: ['FOLGEN'], ...FOOTER_LINK, color: COLOR.accent },
  {
    id: 'footer-instagram',
    lines: ['INSTAGRAM'],
    ...FOOTER_LINK,
    weight: 400,
    size: 30,
    letterSpacing: 0,
  },
  { id: 'footer-about', lines: ['ÜBER UNS'], ...FOOTER_LINK },
  { id: 'footer-contact', lines: ['KONTAKT'], ...FOOTER_LINK },
  { id: 'footer-impressum', lines: ['IMPRESSUM'], ...FOOTER_LINK },
  { id: 'footer-datenschutz', lines: ['DATENSCHUTZ'], ...FOOTER_LINK },
  { id: 'footer-agb', lines: ['AGB'], ...FOOTER_LINK },
  {
    id: 'footer-copyright',
    lines: ['© 2026 EAT THIS. ALLE RECHTE VORBEHALTEN.'],
    ...FOOTER_LINK,
    size: 11,
    letterSpacing: 0.66,
  },

  // EN-Fassungen. Gleiche Schriftgröße wie die DE-Grafik, die Breite ergibt
  // sich aus dem Text. Was in beiden Sprachen gleich lautet (Headline der
  // Anmeldung, Slogan, Impressum), gibt es nur einmal.
  {
    id: 'headline-login-en',
    lines: ['WELCOME', 'BACK'],
    color: COLOR.text,
    size: 54,
    lineHeight: 0.92,
    letterSpacing: -1,
    align: 'center',
    width: 470,
    sameSizeAs: 'headline-login',
  },
  {
    id: 'kicker-signup-en',
    lines: ['YOUR ACCESS TO EAT THIS'],
    ...KICKER,
    align: 'center',
    width: 220,
    sameSizeAs: 'kicker-signup',
  },
  {
    id: 'kicker-login-en',
    lines: ['GOOD TO SEE YOU AGAIN'],
    ...KICKER,
    align: 'center',
    width: 276,
    sameSizeAs: 'kicker-login',
  },
  {
    id: 'lead-signup-en',
    lines: [
      'We recommend great spots in Berlin and our Must Eat dishes that make the visit worth it.',
    ],
    ...PARAGRAPH,
    color: COLOR.muted,
    bg: COLOR.surface,
    align: 'center',
  },
  {
    id: 'lead-login-en',
    lines: ['One click and your map is open, with everything you’ve already unlocked.'],
    ...PARAGRAPH,
    color: COLOR.muted,
    bg: COLOR.surface,
    align: 'center',
  },
  {
    id: 'kicker-starter-en',
    lines: ['YOUR STARTER PACK'],
    ...KICKER,
    bg: COLOR.raised,
    align: 'center',
    width: 170,
    sameSizeAs: 'kicker-signup',
  },
  {
    id: 'title-starter-en',
    lines: ['20 MUST EATS.', 'TO GET YOU STARTED.'],
    color: COLOR.text,
    bg: COLOR.raised,
    size: 30,
    lineHeight: 1,
    letterSpacing: -0.5,
    align: 'center',
    width: 250,
    sameSizeAs: 'title-starter',
  },
  {
    id: 'body-starter-en',
    lines: [
      'Start with 20 Must Eat picks in Berlin. Every card tells you what to order at a spot. Some are already open, others you reveal on site.',
    ],
    ...PARAGRAPH,
    color: COLOR.text,
    bg: COLOR.raised,
    align: 'center',
  },

  { id: 'footer-follow-en', lines: ['FOLLOW'], ...FOOTER_LINK, color: COLOR.accent },
  { id: 'footer-about-en', lines: ['ABOUT'], ...FOOTER_LINK },
  { id: 'footer-contact-en', lines: ['CONTACT'], ...FOOTER_LINK },
  { id: 'footer-datenschutz-en', lines: ['PRIVACY'], ...FOOTER_LINK },
  { id: 'footer-agb-en', lines: ['TERMS'], ...FOOTER_LINK },
  {
    id: 'footer-copyright-en',
    lines: ['© 2026 EAT THIS. ALL RIGHTS RESERVED.'],
    ...FOOTER_LINK,
    size: 11,
    letterSpacing: 0.66,
  },
];

const OUT_DIR = join(process.cwd(), 'public', 'pics', 'email');
const MANIFEST = join(process.cwd(), 'emails', 'art.generated.ts');

async function rasterise(
  spec: ArtSpec,
  fontSize1x: number,
  faces: Awaited<ReturnType<typeof loadBrandFont>>['faces']
) {
  const size = fontSize1x * SCALE;
  // Generous canvas — the transparent surplus is trimmed off afterwards, so an
  // oversized canvas costs nothing but guarantees nothing is clipped.
  const canvasW = spec.wrap ? spec.wrap * SCALE + 80 : Math.round(spec.width * SCALE * 3);
  // Fliesstext bricht um: genug Hoehe fuer zehn Zeilen, der Rest wird getrimmt.
  const rows = spec.wrap ? 10 : spec.lines.length;
  const canvasH = Math.round(size * rows * (spec.lineHeight ?? 1.1) * 1.8) + 80;

  const png = new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          width: canvasW,
          height: canvasH,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: spec.align === 'center' ? 'center' : 'flex-start',
          padding: 40,
          fontFamily: BRAND_FONT_NAME,
          fontWeight: spec.weight ?? 700,
          color: spec.color,
          fontSize: size,
          lineHeight: spec.lineHeight ?? 1.1,
          letterSpacing: (spec.letterSpacing ?? 0) * SCALE,
        },
      },
      ...spec.lines.map((line, i) =>
        React.createElement(
          'div',
          {
            key: i,
            style: spec.wrap
              ? {
                  display: 'flex',
                  width: spec.wrap * SCALE,
                  justifyContent: spec.align === 'center' ? 'center' : 'flex-start',
                  textAlign: spec.align ?? 'left',
                }
              : { display: 'flex' },
          },
          line
        )
      )
    ),
    { width: canvasW, height: canvasH, fonts: faces }
  );

  // trim() drops the transparent surplus so the template positions the art on
  // its real ink extents instead of on padding it can't see.
  const raw = Buffer.from(await png.arrayBuffer());
  if (spec.lineBox) {
    // Nur seitlich eng: senkrecht bleibt eine feste Zeilenbox um die
    // Canvas-Mitte stehen (der Text sitzt dort, justifyContent: center). So
    // haben „Anmelden" und „Sign up" dieselbe Hoehe und dieselbe Grundlinie,
    // obwohl nur eins eine Unterlaenge hat.
    const { info } = await sharp(raw).trim({ threshold: 0 }).toBuffer({ resolveWithObject: true });
    const box = Math.round(spec.lineBox * SCALE);
    return sharp(raw)
      .extract({
        left: -(info.trimOffsetLeft ?? 0),
        width: info.width,
        top: Math.round(canvasH / 2 - box / 2),
        height: box,
      })
      .toBuffer();
  }
  return sharp(raw).trim({ threshold: 0 }).toBuffer();
}

/** Endgültige Schriftgröße je Grafik — Quelle für `sameSizeAs`. */
const renderedSize = new Map<string, number>();

async function renderOne(spec: ArtSpec, faces: Awaited<ReturnType<typeof loadBrandFont>>['faces']) {
  let art: Buffer;
  let sized: sharp.Sharp;
  if (spec.wrap) {
    renderedSize.set(spec.id, spec.size);
    art = await rasterise(spec, spec.size, faces);
    sized = sharp(art);
  } else if (spec.sameSizeAs) {
    const size = renderedSize.get(spec.sameSizeAs);
    if (size === undefined) throw new Error(`${spec.id}: ${spec.sameSizeAs} muss vorher stehen`);
    renderedSize.set(spec.id, size);
    art = await rasterise(spec, size, faces);
    sized = sharp(art);
  } else {
    // Pass 1 measures how wide this face actually sets the copy…
    const probe = await sharp(await rasterise(spec, spec.size, faces)).metadata();
    const probeWidth = (probe.width ?? 1) / SCALE;
    // …pass 2 re-renders at the size that lands on spec.width, so the bitmap is
    // sharp rather than upscaled. The final resize only corrects rounding.
    const corrected = (spec.size * spec.width) / probeWidth;
    renderedSize.set(spec.id, corrected);
    art = await rasterise(spec, corrected, faces);
    sized = sharp(art).resize({ width: spec.width * SCALE });
  }
  // Etwas Luft um die Schrift, sonst klebt die eingebackene Flaeche an den
  // Buchstaben. In hellem Modus ist sie ohnehin unsichtbar, weil sie die Farbe
  // des Untergrunds hat.
  const padded = spec.bg
    ? sized.extend({
        top: 6 * SCALE,
        bottom: 6 * SCALE,
        // Linksbuendige Grafiken bekommen links keine Flaeche: sonst stuende
        // der Kicker 10 px rechts der Headline, und ein negativer Rand zum
        // Ausgleich ueberlebt Gmail nicht.
        left: (spec.align === 'center' ? 10 : 0) * SCALE,
        right: 10 * SCALE,
        background: spec.bg,
      })
    : sized;

  const final = await (spec.bg ? padded.flatten({ background: spec.bg }) : padded)
    // Flat two-colour art with an alpha edge: a palette PNG is visually
    // identical here and roughly a fifth of the bytes.
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toBuffer();
  const finalMeta = await sharp(final).metadata();

  await writeFile(join(OUT_DIR, `${spec.id}.png`), final);

  return {
    width: Math.round((finalMeta.width ?? 0) / SCALE),
    height: Math.round((finalMeta.height ?? 0) / SCALE),
    alt: spec.lines.join(' '),
    // Inhalts-Hash fuer die URL. Ohne ihn liefert Gmails Bild-Proxy eine einmal
    // geholte URL dauerhaft aus seinem Cache — beim Wechsel von Schoolbell auf
    // die echte Markenschrift haette jede aeltere Mail den Platzhalter behalten.
    version: createHash('sha1').update(final).digest('hex').slice(0, 8),
  };
}

const { faces, isBrandFace, files } = await loadBrandFont();
if (!isBrandFace) {
  console.warn(
    '\n⚠️  FF Providence Sans Pro nicht gefunden — gerendert wird mit Schoolbell.\n' +
      '   Lege die Desktop-Datei als assets/fonts/Providence…​.otf|ttf ab (Adobe CC → Schriften\n' +
      '   synchronisieren → aus ~/Library/Application Support/Adobe/… kopieren) und starte\n' +
      '   `npm run build:email-art` erneut. WOFF2 kann Satori nicht lesen.\n'
  );
} else {
  console.log(`Markenschrift: ${files.join(', ')}`);
}

await mkdir(OUT_DIR, { recursive: true });
const manifest: Record<string, { width: number; height: number; alt: string; version: string }> =
  {};
for (const spec of ART) {
  manifest[spec.id] = await renderOne(spec, faces);
  const { width, height } = manifest[spec.id];
  console.log(`  ${spec.id}.png  ${width}×${height}`);
}

await writeFile(
  MANIFEST,
  [
    '// GENERIERT von `npm run build:email-art` — nicht von Hand editieren.',
    '// Die Maße stammen aus den fertig zugeschnittenen PNGs, damit die Templates',
    '// nie eine Breite hardcoden, die bei neuem Text auseinanderläuft.',
    '',
    `/** False, solange die echte Markenschrift fehlt und Schoolbell einspringt. */`,
    `export const BRAND_FACE_AVAILABLE = ${isBrandFace};`,
    '',
    'export interface ArtAsset {',
    '  /** Datei unter /pics/email/, ohne Endung. */',
    '  id: string;',
    '  /** Anzeigebreite in CSS-Pixeln (das PNG selbst ist 2x). */',
    '  width: number;',
    '  height: number;',
    '  /** Volle Wortlaut-Fassung für Clients mit blockierten Bildern. */',
    '  alt: string;',
    '  /** Inhalts-Hash; haengt als ?v= an der URL, sonst cacht Gmail ewig. */',
    '  version: string;',
    '}',
    '',
    `export const ART = ${JSON.stringify(
      Object.fromEntries(Object.entries(manifest).map(([id, v]) => [camel(id), { id, ...v }])),
      null,
      2
    )} as const satisfies Record<string, ArtAsset>;`,
    '',
  ].join('\n')
);
console.log(`\nManifest: emails/art.generated.ts`);

function camel(id: string): string {
  return id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
