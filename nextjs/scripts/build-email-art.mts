// Renders every brand-font surface of the auth emails into transparent PNGs.
//
// Why images: Gmail strips @font-face, so live text can never carry Neue Haas Grotesk Text Pro — the face the whole home design rests on. Baking the
// headlines keeps the brand voice in the inbox; everything else in the mails
// stays live text (see emails/theme.ts).
//
// Run:  npm run build:email-art
//
// Output: nextjs/public/pics/email/<id>.png plus emails/art.generated.ts,
// which carries the trimmed 1x dimensions so the templates never hardcode a
// width that drifts when the copy changes.
//
// The face comes from lib/email/brandFont.ts — drop the Neue Haas Grotesk Text Pro desktop
// font into assets/fonts/ and re-run; until then it renders in Schoolbell and
// says so loudly.

import React from 'react';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { writeFile, mkdir, unlink } from 'node:fs/promises';
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
   * face (Schoolbell stand-in → Neue Haas Grotesk Text Pro) changes the letter
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
// Fliesstext und Footer — die Seite setzt beides in Neue Haas Grotesk, und die Mail
// wirkte daneben wie ein Fremdkoerper (Betreiber: "da wird nicht ueberall
// meine Font benutzt"). Live-Text bleiben nur der Knopf, der Ersatz-Link
// darunter und der Satz, warum die Mail kommt: ohne Bilder muss sich die Mail
// noch bedienen lassen, und Spamfilter misstrauen Mails ohne echten Text.
const KICKER = { color: COLOR.text, bg: COLOR.surface, size: 14, letterSpacing: 1.2 } as const;

/** Fliesstext: feste Groesse, Umbruch bei `wrap`. 340 px statt der vollen
 *  Spaltenbreite, weil ein Bild auf dem Telefon mitschrumpft — so bleibt die
 *  Schrift dort bei ihrer Groesse, statt auf 11 px zu fallen. */
const PARAGRAPH = { weight: 400, size: 17, lineHeight: 1.45, wrap: 340, width: 340 } as const;

/** Knopf-Wort wie `.action` in der Tour: Neue Haas fett, Ink auf Gelb. */
const CTA_LABEL = {
  color: COLOR.onAccent,
  bg: COLOR.accent,
  size: 17,
  align: 'center',
  wrap: 300,
  width: 300,
  lineBox: 22,
} as const;

const ART: ArtSpec[] = [
  {
    id: 'headline-signup',
    lines: ['WE TELL YOU', 'WHAT TO EAT.'],
    color: COLOR.text,
    bg: COLOR.surface,
    size: 54,
    lineHeight: 0.92,
    letterSpacing: -1,
    align: 'center',
    width: 300,
  },
  {
    id: 'headline-login',
    lines: ['Willkommen', 'zurück.'],
    color: COLOR.text,
    bg: COLOR.surface,
    size: 54,
    lineHeight: 0.92,
    letterSpacing: -1,
    align: 'center',
    width: 470,
  },
  {
    id: 'kicker-signup',
    lines: ['DEIN ANMELDELINK'],
    ...KICKER,
    align: 'center',
    width: 170,
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
      'Entdecke Berlins beste Restaurants, Cafés und Bars, probiere ihre Must\u00a0Eats und sammle sie in deinem Deck.',
      'Alles auf einer Map.',
    ],
    ...PARAGRAPH,
    color: COLOR.muted,
    bg: COLOR.surface,
    align: 'center',
  },
  {
    id: 'lead-login',
    lines: ['Hier geht’s zurück zu deiner Map und deiner Sammlung.'],
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
    lines: ['20 Must Eats.'],
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
      'Alle 20 Karten liegen sofort offen in deinem Deck.',
    ],
    ...PARAGRAPH,
    color: COLOR.text,
    bg: COLOR.raised,
    align: 'center',
  },

  // Die Beschriftung des Knopfs. Der Knopf selbst bleibt ein echter Link mit
  // gelber Flaeche; nur das Wort ist Bild, damit es in der Markenschrift steht
  // wie jeder Knopf der Seite (Betreiber, 22.09.2026). Bei blockierten Bildern
  // steht der Alt-Text auf dem Gelb — der Knopf ist nie leer.
  { id: 'cta-anmelden', lines: ['Anmelden'], ...CTA_LABEL },
  { id: 'cta-sign-up', lines: ['Sign up'], ...CTA_LABEL },
  { id: 'cta-sign-in', lines: ['Sign in'], ...CTA_LABEL },
  // EN-Fassungen. Gleiche Schriftgröße wie die DE-Grafik, die Breite ergibt
  // sich aus dem Text. Was in beiden Sprachen gleich lautet (Headline der
  // Anmeldung, Slogan, Impressum), gibt es nur einmal.
  {
    id: 'headline-login-en',
    lines: ['Welcome', 'back.'],
    color: COLOR.text,
    bg: COLOR.surface,
    size: 54,
    lineHeight: 0.92,
    letterSpacing: -1,
    align: 'center',
    width: 470,
    sameSizeAs: 'headline-login',
  },
  {
    id: 'kicker-signup-en',
    lines: ['YOUR SIGN-IN LINK'],
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
      'Discover Berlin’s best restaurants, cafés and bars, try their Must\u00a0Eats and collect them in your deck.',
      'All on one map.',
    ],
    ...PARAGRAPH,
    color: COLOR.muted,
    bg: COLOR.surface,
    align: 'center',
  },
  {
    id: 'lead-login-en',
    lines: ['Back to your map and your collection.'],
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
    lines: ['20 Must Eats.'],
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
      'All 20 cards go straight into your deck face up.',
    ],
    ...PARAGRAPH,
    color: COLOR.text,
    bg: COLOR.raised,
    align: 'center',
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
    '\n⚠️  Neue Haas Grotesk Text Pro nicht gefunden — gerendert wird mit Schoolbell.\n' +
      '   Lege die Desktop-Datei als assets/fonts/NeueHaasGroteskTextPro…​.otf|ttf ab (Adobe CC → Schriften\n' +
      '   synchronisieren → aus ~/Library/Application Support/Adobe/… kopieren) und starte\n' +
      '   `npm run build:email-art` erneut. WOFF2 kann Satori nicht lesen.\n'
  );
} else {
  console.log(`Markenschrift: ${files.join(', ')}`);
}

await mkdir(OUT_DIR, { recursive: true });
// Kein WebP in der Mail; Gmail/Outlook benötigen lokale PNG-Fassungen.
await sharp(join(process.cwd(), 'public/pics/home/starter-pack-front.webp'))
  .resize({ width: 300 }).png().toFile(join(OUT_DIR, 'starter-pack.png'));

const manifest: Record<string, { width: number; height: number; alt: string; version: string }> =
  {};
for (const spec of ART) {
  const renderSpec = spec.id.startsWith('lead-')
    ? {...spec, size: 16, wrap: 300, width: 300, bg: undefined}
    : spec.id.includes('-starter') ? {...spec, bg: undefined} : spec;
  manifest[spec.id] = await renderOne(renderSpec, faces);
  const { width, height } = manifest[spec.id];
  console.log(`  ${spec.id}.png  ${width}×${height}`);
}

// Die weiße Folie stammt aus der vom Betreiber gelieferten Vorlage.
// Die Folie liegt durchgehend hinter Intro, CTA und Starter-Pack.
// Die Intro-Schrift bleibt transparent, damit kein separater Folienausschnitt
// den gemeinsamen Hintergrund unterbricht.
const foil = await sharp(join(process.cwd(), 'public/pics/paper/mail-foil.webp'))
  .resize({width: 1200}).png().toBuffer();
// Große Wortmarke, darunter später die Karte: Reihenfolge der mobilen Startseite.
const mark = await sharp(join(process.cwd(), 'public/pics/home/wordmark.webp'))
  .resize({width: 940}).png().toBuffer();
const masthead = await sharp(foil).extract({left: 0, top: 0, width: 1200, height: 340})
  .composite([{input: mark, left: 130, top: 56}]).png({palette: true}).toBuffer();
await writeFile(join(OUT_DIR, 'masthead.png'), masthead);
manifest.masthead = {width: 600, height: 170, alt: 'Eat This', version: createHash('sha1').update(masthead).digest('hex').slice(0, 8)};
const heroCard = await sharp(join(process.cwd(), 'public/pics/home/hero-must-eat.webp'))
  .resize({width: 360}).png().toBuffer();
const heroMeta = await sharp(heroCard).metadata();
await writeFile(join(OUT_DIR, 'hero-must-eat.png'), heroCard);
manifest['hero-must-eat'] = {width: 180, height: Math.round(heroMeta.height! / 2), alt: 'Hamachi Head — Must Eat Card', version: createHash('sha1').update(heroCard).digest('hex').slice(0, 8)};
const foilMeta = await sharp(foil).metadata();
const introFoil = await sharp(foil).extract({left: 0, top: 340, width: 1200, height: foilMeta.height! - 340}).png().toBuffer();
await writeFile(join(OUT_DIR, 'mail-foil.png'), introFoil);
const introParts = [
  ['intro-signup', 'kicker-signup', 'headline-signup'],
  ['intro-signup-en', 'kicker-signup-en', 'headline-signup'],
  ['intro-login', 'kicker-login', 'headline-login'],
  ['intro-login-en', 'kicker-login-en', 'headline-login-en'],
] as const;
for (const [id, ...parts] of introParts) {
  let y = 24;
  const layers: sharp.OverlayOptions[] = [];
  const copy: string[] = [];
  for (const [index, part] of parts.entries()) {
    const spec = ART.find(item => item.id === part)!;
    const size = index === 0 ? 18 : renderedSize.get(part)!;
    const image = await rasterise(spec, size, faces);
    const meta = await sharp(image).metadata();
    layers.push({input: image, left: Math.round((1200 - meta.width!) / 2), top: Math.round(y * 2)});
    y += meta.height! / 2 + [18, 22][index]!;
    copy.push(spec.lines.join(' '));
  }
  const height = Math.ceil(y);
  const image = await sharp({create: {width: 1200, height: height * 2, channels: 4, background: '#00000000'}})
    .composite(layers).png({palette: true}).toBuffer();
  await writeFile(join(OUT_DIR, `${id}.png`), image);
  manifest[id] = {width: 600, height, alt: copy.join(' '), version: createHash('sha1').update(image).digest('hex').slice(0, 8)};
}
// Die Einzelzeilen sind nur Render-Zutaten, ausgeliefert wird der Folienblock.
for (const part of new Set(introParts.flatMap(([, ...parts]) => parts))) {
  delete manifest[part];
  await unlink(join(OUT_DIR, `${part}.png`));
}

// Der App-Footer wird als zusammenhängendes Papierblatt gerendert und dann
// in verlinkbare Tabellenzellen geschnitten. So bleiben Papier, Schrift und
// Instagram-Symbol in Gmail/Outlook unverändert; jeder Link bleibt ein Link.
const footerPaper = await sharp(join(process.cwd(), 'public/pics/paper/folded-white.webp'))
  .resize({ width: 1200 }).png().toBuffer();
const footerLogo = await sharp(join(process.cwd(), 'public/pics/home/wordmark.webp'))
  .resize({ width: 840 }).png().toBuffer();
// Dasselbe Instagram-Symbol wie in SiteFooter.tsx, lokal rasterisiert.
const instagram = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#15120e" stroke-width="1.9"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" fill="#15120e" stroke="none"/></svg>`))
  .resize(88, 88).png().toBuffer();
const data = (buffer: Buffer) => `data:image/png;base64,${buffer.toString('base64')}`;
for (const en of [false, true]) {
  const labels = en ? ['About', 'Contact', 'Impressum', 'Privacy', 'Terms'] : ['Über uns', 'Kontakt', 'Impressum', 'Datenschutz', 'AGB'];
  const copyright = en ? '© 2026 Eat This. All rights reserved.' : '© 2026 Eat This. Alle Rechte vorbehalten.';
  const text = (value: string, left: number, top: number, width: number, height: number, size: number) => React.createElement('div', {style: {
    display: 'flex', position: 'absolute', left: left * 2, top: top * 2,
    width: width * 2, height: height * 2, alignItems: 'center', justifyContent: 'center',
    fontFamily: BRAND_FONT_NAME, fontSize: size * 2, fontWeight: 400, color: COLOR.text,
  }}, value);
  // 64 px Luft vor der Wortmarke wie im Desktop-Footer der Website.
  const footerTopExtra = 44;
  const poster = new ImageResponse(React.createElement('div', {style: {display: 'flex', position: 'relative', width: 1200, height: (316 + footerTopExtra) * 2, overflow: 'hidden', backgroundColor: '#fff'}},
    React.createElement('img', {src: data(footerPaper), width: 1200, height: 1800, style: {position: 'absolute', left: 0, top: 0}}),
    React.createElement('img', {src: data(footerLogo), width: 600, height: 146, style: {position: 'absolute', left: 300, top: (20 + footerTopExtra) * 2}}),
    text('we tell you what to eat', 0, 101 + footerTopExtra, 600, 24, 16),
    React.createElement('img', {src: data(instagram), width: 64, height: 64, style: {position: 'absolute', left: 568, top: (148 + footerTopExtra) * 2}}),
    text(labels[0]!, 0, 190 + footerTopExtra, 300, 34, 18), text(labels[1]!, 300, 190 + footerTopExtra, 300, 34, 18),
    text(labels[2]!, 0, 224 + footerTopExtra, 200, 34, 18), text(labels[3]!, 200, 224 + footerTopExtra, 200, 34, 18), text(labels[4]!, 400, 224 + footerTopExtra, 200, 34, 18),
    text(copyright, 0, 270 + footerTopExtra, 600, 28, 14),
  ), {width: 1200, height: (316 + footerTopExtra) * 2, fonts: faces});
  const png = Buffer.from(await poster.arrayBuffer());
  const suffix = en ? '-en' : '';
  const cells: [string, number, number, number, number, string][] = [
    ['footer-brand', 0, 0, 600, 138 + footerTopExtra, 'Eat This — we tell you what to eat'],
    ['footer-instagram', 0, 138 + footerTopExtra, 600, 52, 'Instagram'],
    [`footer-about${suffix}`, 0, 190 + footerTopExtra, 300, 34, labels[0]!],
    [`footer-contact${suffix}`, 300, 190 + footerTopExtra, 300, 34, labels[1]!],
    ['footer-impressum', 0, 224 + footerTopExtra, 200, 34, labels[2]!],
    [`footer-datenschutz${suffix}`, 200, 224 + footerTopExtra, 200, 34, labels[3]!],
    [`footer-agb${suffix}`, 400, 224 + footerTopExtra, 200, 34, labels[4]!],
    [`footer-copyright${suffix}`, 0, 258 + footerTopExtra, 600, 58, copyright],
  ];
  for (const [id, left, top, width, height, alt] of cells) {
    const image = await sharp(png).extract({left: left * 2, top: top * 2, width: width * 2, height: height * 2}).png({palette: true}).toBuffer();
    await writeFile(join(OUT_DIR, `${id}.png`), image);
    manifest[id] = {width, height, alt, version: createHash('sha1').update(image).digest('hex').slice(0, 8)};
  }
}

await writeFile(
  MANIFEST,
  [
    '// GENERIERT von `npm run build:email-art` — nicht von Hand editieren.',
    '// Die Maße stammen aus den fertig zugeschnittenen PNGs, damit die Templates',
    '// nie eine Breite hardcoden, die bei neuem Text auseinanderläuft.',
    '',
    `/** False, solange die echte Markenschrift fehlt und Schoolbell einspringt. @public */`,
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
