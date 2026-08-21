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
import { createHash } from 'node:crypto';
import { join } from 'node:path';

/** Anzeigebreite in der Mail; gerendert wird 2x für Retina-Postfächer. */
const DISPLAY_WIDTH = 420;
const SCALE = 2;

/** `.heroPhones` auf home: aspect-ratio 0.74 für das überlappte Paar. */
const ASPECT = 0.74;

/**
 * Der Rand ist KEINE Geschmacksfrage, sondern der Platz, den die Schatten zum
 * Auslaufen brauchen. Zu klein gewählt, schneidet die Leinwandkante sie ab —
 * links, unten und rechts, je nachdem wo ein Telefon sitzt.
 *
 * Eine Gauss-Weichzeichnung ist nach 3 Sigma praktisch bei null, dazu kommt
 * der Versatz nach unten. Beides wird aus den Schattenwerten unten berechnet,
 * damit ein geänderter Blur den Rand automatisch mitzieht.
 */
function shadowRoom() {
  const sigmas = PHONES.map((p) => p.shadow.blur * SCALE * 0.5);
  const side = Math.ceil(Math.max(...sigmas) * 3);
  const drop = Math.max(...PHONES.map((p) => p.shadow.dy)) * SCALE;
  return { side, bottom: side + drop };
}

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

/** Gedrehtes Telefon, freigestellt. */
async function renderPhone(p: Phone) {
  const targetH = Math.round(INNER_H * p.heightPct);
  const { data, info } = await sharp(join(SRC_DIR, `${p.file}.webp`))
    .resize({ height: targetH })
    .rotate(p.rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { body: data, width: info.width, height: info.height };
}

/**
 * Schlagschatten in voller Leinwandgroesse.
 *
 * Zwei Fallstricke, beide schon einmal als hartkantiges graues Rechteck
 * sichtbar gewesen:
 *
 *  * `composite({ opacity })` legt die Deckkraft ueber die GANZE Kachel, auch
 *    ueber deren transparente Flaeche. Die Deckkraft gehoert deshalb in den
 *    Alphakanal (`linear`), nicht ans Compositing.
 *  * Weichzeichnen kann nicht ueber den Bildrand hinaus. Wird der Schatten in
 *    der Kachelgroesse des Telefons gebaut, bricht er an deren Kante hart ab.
 *    Auf der Leinwand gebaut, hat er ueberall Platz zum Auslaufen.
 */
async function renderShadow(body: Buffer, left: number, top: number, p: Phone) {
  const sigma = p.shadow.blur * SCALE * 0.5;
  const mask = await sharp({
    create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: body, left, top: top + p.shadow.dy * SCALE }])
    .png()
    .toBuffer()
    .then((full) =>
      sharp(full).extractChannel('alpha').blur(sigma).linear(p.shadow.opacity, 0).toBuffer()
    );

  return sharp({
    create: { width: CANVAS_W, height: CANVAS_H, channels: 3, background: { r: 21, g: 18, b: 14 } },
  })
    .joinChannel(mask)
    .png()
    .toBuffer();
}

const ROOM = shadowRoom();
/** Fläche, in der die Telefone selbst liegen dürfen — Leinwand minus Schattenplatz. */
const INNER_W = CANVAS_W - ROOM.side * 2;
const INNER_H = CANVAS_H - ROOM.side - ROOM.bottom;

function place(anchor: Phone['anchor'], w: number, h: number) {
  return anchor === 'bottom-left'
    ? { left: ROOM.side, top: ROOM.side + INNER_H - h }
    : { left: CANVAS_W - ROOM.side - w, top: ROOM.side };
}

const layers: OverlayOptions[] = [];
for (const p of PHONES) {
  const { body, width, height } = await renderPhone(p);
  const { left, top } = place(p.anchor, width, height);
  layers.push({ input: await renderShadow(body, left, top, p), left: 0, top: 0 });
  layers.push({ input: body, left, top });
}

const jpeg = await sharp({
  create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: PAPER },
})
  .composite(layers)
  .flatten({ background: PAPER })
  .jpeg({ quality: 82, chromaSubsampling: '4:4:4' })
  .toBuffer();

const out = join(OUT_DIR, 'phones.jpg');
await writeFile(out, jpeg);

// Inhalts-Hash in die URL: der Dateiname bleibt gleich, und Gmails Bild-Proxy
// liefert eine einmal geholte URL sonst dauerhaft aus seinem Cache aus — eine
// neu gerenderte Datei erreicht den Empfaenger dann nie.
const version = createHash('sha1').update(jpeg).digest('hex').slice(0, 8);

const manifest = [
  '// GENERIERT von `npm run build:email-phones` — nicht von Hand editieren.',
  '',
  'export const PHONES_ART = {',
  "  id: 'phones',",
  `  width: ${DISPLAY_WIDTH},`,
  `  height: ${Math.round(CANVAS_H / SCALE)},`,
  "  alt: 'Die Eat-This-App: die Map mit Must-Eat-Pins und ein Restaurant im Detail',",
  `  version: '${version}',`,
  '} as const;',
  '',
].join('\n');
await writeFile(join(process.cwd(), 'emails', 'phones.generated.ts'), manifest, 'utf8');

console.log(`  phones.jpg  ${CANVAS_W}×${CANVAS_H}  ${Math.round(jpeg.length / 1024)} kB  v=${version}`);
console.log(`  Anzeige: ${DISPLAY_WIDTH}×${Math.round(CANVAS_H / SCALE)}`);
console.log('\nManifest: emails/phones.generated.ts');
