// Resolves the brand display face for everything Satori rasterises (email
// headline art, composed spot cards).
//
// The site's display font is FF Providence Sans Pro, served at runtime from the
// Adobe Fonts kit `kgb1lmh`. That kit covers the *website* only — the licence
// does not extend to email, and Gmail strips @font-face anyway. So the brand
// face never travels as a webfont: it is baked into images here, from a desktop
// font file the owner syncs into `assets/fonts/`.
//
// Until that file exists the pipeline stays green and falls back to Schoolbell,
// the previous email face. Drop `Providence*.otf|ttf` into `assets/fonts/` and
// re-run `npm run build:email-art` to switch every surface at once.
//
// Satori reads OTF/TTF/WOFF — NOT WOFF2. A .woff2 in this folder is ignored.

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const FONT_DIR = join(process.cwd(), 'assets', 'fonts');

/** Satori font name used by every brand-font surface. */
export const BRAND_FONT_NAME = 'EatThisDisplay';

export interface BrandFontFace {
  data: Buffer;
  weight: 400 | 700;
}

export interface BrandFont {
  /** Ready to spread into ImageResponse's `fonts` option. */
  faces: { name: string; data: Buffer; weight: 400 | 700; style: 'normal' }[];
  /** False while running on the Schoolbell stand-in. */
  isBrandFace: boolean;
  /** File names actually loaded — surfaced in the build log. */
  files: string[];
}

const SATORI_READABLE = /\.(otf|ttf|woff)$/i;
const PROVIDENCE = /providence/i;
const BOLD = /(bold|700|black|heavy)/i;

let cached: Promise<BrandFont> | null = null;

/**
 * Loads the brand display face, or the Schoolbell stand-in when it is missing.
 * Cached at module scope: one disk read per server instance.
 */
export function loadBrandFont(): Promise<BrandFont> {
  cached ??= resolve();
  return cached;
}

async function resolve(): Promise<BrandFont> {
  const entries = await readdir(FONT_DIR).catch(() => [] as string[]);
  const providence = entries.filter((f) => PROVIDENCE.test(f) && SATORI_READABLE.test(f)).sort();

  if (providence.length > 0) {
    // A single file serves both weights when only one was supplied — Satori
    // needs an exact weight match or it falls back to the first face.
    const boldFile = providence.find((f) => BOLD.test(f)) ?? providence[0];
    const regularFile = providence.find((f) => !BOLD.test(f)) ?? providence[0];
    const [bold, regular] = await Promise.all([
      readFile(join(FONT_DIR, boldFile)),
      readFile(join(FONT_DIR, regularFile)),
    ]);
    return {
      faces: [
        { name: BRAND_FONT_NAME, data: regular, weight: 400, style: 'normal' },
        { name: BRAND_FONT_NAME, data: bold, weight: 700, style: 'normal' },
      ],
      isBrandFace: true,
      files: [...new Set([regularFile, boldFile])],
    };
  }

  const fallback = await readFile(join(FONT_DIR, 'Schoolbell-Regular.ttf'));
  return {
    faces: [
      { name: BRAND_FONT_NAME, data: fallback, weight: 400, style: 'normal' },
      { name: BRAND_FONT_NAME, data: fallback, weight: 700, style: 'normal' },
    ],
    isBrandFace: false,
    files: ['Schoolbell-Regular.ttf'],
  };
}
