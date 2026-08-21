// Komponiert die beiden Hero-Mockups der Startseite zu EINEM flachen Bild für
// die Anmelde-Mail.
//
// Warum vorkomponiert: auf home liegen die Telefone per `position:absolute`
// übereinander und sind per `transform: rotate()` gekippt (HubSection.module.css
// .phoneFront/.phoneBack). Gmail entfernt beides. Ein flaches Bild ist die
// einzige Komposition, die kein Client zerlegen kann — dasselbe Argument wie
// bei den Spot-Cards.
//
// Warum JPEG statt PNG: die Quellen sind freigestellt (Alpha), aber in der Mail
// stehen sie auf dem weißen Papier. Auf Weiß flachgerechnet spart das rund zwei
// Drittel — und Gmails Bild-Proxy kann WebP-Alpha ohnehin nicht.
//
// Run:  npm run build:email-phones
// Output: public/pics/email/phones.jpg + emails/phones.generated.ts

import sharp, { type OverlayOptions } from 'sharp';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Anzeigebreite in der Mail; gerendert wird 2x für Retina-Postfächer. */
const DISPLAY_WIDTH = 420;
const SCALE = 2;

/** `.heroPhones` auf home: aspect-ratio 0.74 für das überlappte Paar. */
const ASPECT = 0.74;

/**
 * Rand um das Paar. Auf home darf eine gedrehte Ecke über den Container
 * hinausragen — nichts clippt dort. Eine Leinwand clippt sehr wohl, deshalb
 * sitzen die Telefone hier etwas kleiner und eingerückt statt bündig.
 */
const INSET = 0.03;

const CANVAS_W = DISPLAY_WIDTH * SCALE;
const CANVAS_H = Math.round(CANVAS_W / ASPECT);

/** Papierweiß — die Telefone stehen in der Mail direkt darauf. */
const PAPER = { r: 255, g: 255, b: 255, alpha: 1 };

interface Phone {
  file: string;
  /** Höhe als Anteil der Leinwand — die Prozentwerte aus dem Stylesheet. */
  heightPct: number;
  /** Drehung in Grad, wie im `transform: rotate()` der Website. */
  rotate: number;
  anchor: 'bottom-left' | 'top-right';
  shadow: { blur: number; opacity: number; dy: number };
}

// Reihenfolge = Stapelreihenfolge: phoneBack zuerst, phoneFront darüber.
const PHONES: Phone[] = [
  {
    file: 'phone-restaurant',
    heightPct: 0.82,
    rotate: 6,
    anchor: 'top-right',
    shadow: { blur: 26, opacity: 0.14, dy: 16 },
  },
  {
    file: 'phone-map',
    heightPct: 0.86,
    rotate: -5,
    anchor: 'bottom-left',
    shadow: { blur: 32, opacity: 0.2, dy: 20 },
  },
];

const SRC_DIR = join(process.cwd(), 'public', 'pics', 'home-phones');
const OUT_DIR = join(process.cwd(), 'public', 'pics', 'email');

/** Gedrehtes Telefon plus weicher Schlagschatten, beides mit Alpha. */
async function renderPhone(p: Phone) {
  const targetH = Math.round(CANVAS_H * p.heightPct);
  const rotated = await sharp(join(SRC_DIR, `${p.file}.webp`))
    .resize({ height: targetH })
    .rotate(p.rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer({ resolveWithObject: true });

  // Schatten: dieselbe Silhouette, schwarz, weichgezeichnet. sharp kann kein
  // drop-shadow, aber die Alphamaske des gedrehten Bildes reicht dafür.
  const { width, height } = rotated.info;
  const alpha = await sharp(rotated.data).extractChannel('alpha').toBuffer();
  const shadow = await sharp({
    create: { width, height, channels: 3, background: { r: 21, g: 18, b: 14 } },
  })
    .joinChannel(alpha)
    .blur(p.shadow.blur * SCALE * 0.5)
    .png()
    .toBuffer();

  return { body: rotated.data, shadow, width, height };
}

function place(anchor: Phone['anchor'], w: number, h: number) {
  const mx = Math.round(CANVAS_W * INSET);
  const my = Math.round(CANVAS_H * INSET);
  return anchor === 'bottom-left'
    ? { left: mx, top: CANVAS_H - h - my }
    : { left: CANVAS_W - w - mx, top: my };
}

const layers: OverlayOptions[] = [];
for (const p of PHONES) {
  const { body, shadow, width, height } = await renderPhone(p);
  const { left, top } = place(p.anchor, width, height);
  // Schatten sitzt um dy tiefer und wird nach unten hin abgeschnitten, falls er
  // über die Leinwand hinausragt — `composite` verlangt Offsets im Bild.
  const shadowTop = Math.min(top + p.shadow.dy * SCALE, CANVAS_H - 1);
  layers.push({ input: shadow, left, top: shadowTop, opacity: p.shadow.opacity });
  layers.push({ input: body, left, top });
}

const out = join(OUT_DIR, 'phones.jpg');
const info = await sharp({
  create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: PAPER },
})
  .composite(layers)
  .flatten({ background: PAPER })
  .jpeg({ quality: 82, chromaSubsampling: '4:4:4' })
  .toFile(out);

const manifest = [
  '// GENERIERT von `npm run build:email-phones` — nicht von Hand editieren.',
  '',
  'export const PHONES_ART = {',
  "  id: 'phones',",
  `  width: ${DISPLAY_WIDTH},`,
  `  height: ${Math.round(CANVAS_H / SCALE)},`,
  "  alt: 'Die Eat-This-App: die Map mit Must-Eat-Pins und ein Restaurant im Detail',",
  '} as const;',
  '',
].join('\n');
await writeFile(join(process.cwd(), 'emails', 'phones.generated.ts'), manifest, 'utf8');

console.log(`  phones.jpg  ${info.width}×${info.height}  ${Math.round(info.size / 1024)} kB`);
console.log(`  Anzeige: ${DISPLAY_WIDTH}×${Math.round(CANVAS_H / SCALE)}`);
console.log('\nManifest: emails/phones.generated.ts');
