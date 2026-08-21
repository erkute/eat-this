// Renders every brand-font surface of the auth emails into transparent PNGs.
//
// Why images: Gmail strips @font-face, so live text can never carry FF
// Providence Sans Pro — the face the whole home design rests on. Baking the
// headlines keeps the brand voice in the inbox; everything else in the mails
// stays live text (see emails/theme.ts).
//
// Run:  npm run build:email-art
//
// Output: nextjs/public/pics/email/<id>.png plus emails/art.generated.json,
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
   * Exact rendered width at 1x. The renderer measures the first pass and
   * re-renders at a corrected font size to hit it, so swapping the display
   * face (Schoolbell stand-in → FF Providence Sans Pro) changes the letter
   * shapes but never the layout of the mail around them.
   */
  width: number;
}

// Headlines mirror home: red, uppercase, tight leading, slight negative
// tracking (--et-tracking-title). Section titles are the same voice one step
// smaller, exactly like `.hv-title` next to its yellow marker square.
const ART: ArtSpec[] = [
  {
    id: 'headline-signup',
    lines: ['WE TELL YOU', 'WHAT TO EAT'],
    color: COLOR.red,
    size: 54,
    lineHeight: 0.92,
    letterSpacing: -1,
    align: 'left',
    width: 470,
  },
  {
    id: 'headline-login',
    lines: ['WILLKOMMEN', 'ZURÜCK'],
    color: COLOR.red,
    size: 54,
    lineHeight: 0.92,
    letterSpacing: -1,
    align: 'left',
    width: 470,
  },
  {
    id: 'title-starter-pack',
    lines: ['STARTER PACK'],
    color: COLOR.red,
    size: 30,
    letterSpacing: -0.5,
    align: 'center',
    width: 210,
  },
  {
    id: 'slogan-inverse',
    lines: ['WE TELL YOU WHAT TO EAT'],
    color: COLOR.inverse,
    size: 12,
    letterSpacing: 2,
    align: 'center',
    width: 172,
  },
  // Kicker — auf home ist die Zeile ueber der Hero-Headline `--et-font-label`,
  // also ebenfalls Providence. Als Live-Text konnte sie das nie sein; hier
  // traegt sie dieselbe Schrift wie alles andere Markige in der Mail.
  // Die Zielbreiten stehen im Verhaeltnis der Zeichenzahl (21 vs. 29), damit
  // beide Kicker optisch gleich gross wirken.
  {
    id: 'kicker-signup',
    lines: ['WAS DU ESSEN SOLLTEST'],
    color: COLOR.ink,
    size: 14,
    letterSpacing: 1.2,
    align: 'left',
    width: 200,
  },
  {
    id: 'kicker-login',
    lines: ['SCHÖN, DASS DU WIEDER DA BIST'],
    color: COLOR.ink,
    size: 14,
    letterSpacing: 1.2,
    align: 'left',
    width: 276,
  },
  {
    id: 'title-spots',
    lines: ['SCHON MAL REINSCHAUEN'],
    color: COLOR.red,
    size: 26,
    letterSpacing: -0.5,
    align: 'left',
    width: 290,
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
  const canvasW = Math.round(spec.width * SCALE * 3);
  const canvasH = Math.round(size * spec.lines.length * (spec.lineHeight ?? 1.1) * 1.8) + 80;

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
          fontWeight: 700,
          color: spec.color,
          fontSize: size,
          lineHeight: spec.lineHeight ?? 1.1,
          letterSpacing: (spec.letterSpacing ?? 0) * SCALE,
        },
      },
      ...spec.lines.map((line, i) =>
        React.createElement('div', { key: i, style: { display: 'flex' } }, line)
      )
    ),
    { width: canvasW, height: canvasH, fonts: faces }
  );

  // trim() drops the transparent surplus so the template positions the art on
  // its real ink extents instead of on padding it can't see.
  return sharp(Buffer.from(await png.arrayBuffer())).trim({ threshold: 0 }).toBuffer();
}

async function renderOne(spec: ArtSpec, faces: Awaited<ReturnType<typeof loadBrandFont>>['faces']) {
  // Pass 1 measures how wide this face actually sets the copy…
  const probe = await sharp(await rasterise(spec, spec.size, faces)).metadata();
  const probeWidth = (probe.width ?? 1) / SCALE;
  // …pass 2 re-renders at the size that lands on spec.width, so the bitmap is
  // sharp rather than upscaled. The final resize only corrects rounding.
  const corrected = (spec.size * spec.width) / probeWidth;
  const art = await rasterise(spec, corrected, faces);

  const final = await sharp(art)
    .resize({ width: spec.width * SCALE })
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
const manifest: Record<string, { width: number; height: number; alt: string; version: string }> = {};
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
