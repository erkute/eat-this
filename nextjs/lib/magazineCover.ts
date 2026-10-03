/**
 * Die Titelseiten des Hefts (Auswahl 03.10.2026 aus 24 Entwürfen nach
 * Mode-Magazinen). Hier steht, welcher Look ein Heft bekommt und wo darauf
 * was liegt — rein rechnerisch, damit MagazineCover nur noch setzt und die
 * Regeln ohne DOM testbar sind.
 *
 * Alle Längen sind Prozent der Heftbreite (`cqw` in MagazineCover). Das Heft
 * ist 3:4, also 100 breit und 133,3 hoch.
 */

/** Looks, die jedes Foto tragen — auch Räume, Fassaden, Landschaften. */
export const PHOTO_LOOKS = [
  'love',
  'system',
  'holiday',
  'beauty',
  'silver',
  'redlogo',
  'purple',
  'face',
  'plate',
  'field',
] as const;

/** Looks, die ein freigestelltes Gericht brauchen. */
export const CUTOUT_LOOKS = ['still', 'paper', 'band', 'front', 'perfect'] as const;

export type PhotoLook = (typeof PHOTO_LOOKS)[number];
export type CutoutLook = (typeof CUTOUT_LOOKS)[number];
export type CoverLook = PhotoLook | CutoutLook;

/** Rahmen des freigestellten Motivs, als Anteile des ganzen Fotos. */
export interface CoverBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Farben, die Sanity aus dem Aufmacher-Bild zieht (asset.metadata.palette). */
export interface CoverPalette {
  /** Hauptfarbe und die Schrift, die Sanity darauf setzen würde. */
  dominant?: { background?: string | null; foreground?: string | null } | null;
  dark?: string | null;
  light?: string | null;
}

/** Was Sanity zum Heft liefert (`cover` am Artikel, siehe lib/queries.ts). */
export interface CoverData {
  /** Von Hand gewählt; `auto` oder leer heisst: nach der Regel unten. */
  look?: 'auto' | CoverLook | null;
  /** Die Bilderkennung hat ein Gericht gefunden. */
  dish?: boolean | null;
  /** Der Freisteller in voller Fotogrösse (PNG mit Alpha). */
  cutout?: string | null;
  cutoutWidth?: number | null;
  cutoutHeight?: number | null;
  box?: CoverBox | null;
  palette?: CoverPalette | null;
}

export const COVER_HEIGHT = 400 / 3;

/** Ein Heft mit Freisteller — die Freisteller-Looks brauchen alle vier Angaben. */
export type CutoutCover = CoverData & {
  cutout: string;
  cutoutWidth: number;
  cutoutHeight: number;
  box: CoverBox;
};

export function hasCutout(cover: CoverData | null | undefined): cover is CutoutCover {
  const box = cover?.box;
  return Boolean(
    cover?.cutout && cover.cutoutWidth && cover.cutoutHeight && box && box.w > 0 && box.h > 0
  );
}

const isCutoutLook = (look: string): look is CutoutLook =>
  (CUTOUT_LOOKS as readonly string[]).includes(look);
const isPhotoLook = (look: string): look is PhotoLook =>
  (PHOTO_LOOKS as readonly string[]).includes(look);

/**
 * Welcher Look ein Heft bekommt.
 *
 * Von Hand gewählt gilt — ein Freisteller-Look aber nur, wenn ein Freisteller
 * da ist. Sonst reihum nach der Ausgabennummer, damit zwei benachbarte Hefte
 * nie gleich aussehen: jedes Gericht bekommt einen der fünf Freisteller-Looks,
 * alles andere einen der zehn Foto-Looks. Nicht nur jedes zweite Gericht —
 * bei den 27 Heften vom 03.10.2026 wären sonst nur vier der fünf
 * Freisteller-Looks vorgekommen.
 */
export function coverLook(issue: number | null | undefined, cover?: CoverData | null): CoverLook {
  const n = Math.abs(issue ?? 0);
  const cut = hasCutout(cover);
  const chosen = cover?.look;
  if (chosen && chosen !== 'auto') {
    if (isPhotoLook(chosen)) return chosen;
    if (isCutoutLook(chosen) && cut) return chosen;
  }
  if (cut && cover?.dish) return CUTOUT_LOOKS[n % CUTOUT_LOOKS.length];
  return PHOTO_LOOKS[n % PHOTO_LOOKS.length];
}

export type CoverTone = 'yellow' | 'red' | 'ink';

/** Zwei Töne im Wechsel. Ein Look kommt höchstens alle zehn Nummern wieder,
 *  deshalb wechselt der Ton erst mit dem nächsten Zehner. */
export function altTone(
  issue: number | null | undefined,
  tones: [CoverTone, CoverTone]
): CoverTone {
  return tones[Math.floor(Math.abs(issue ?? 0) / PHOTO_LOOKS.length) % 2];
}

/** Der Teller reihum in Gelb, Rot und Ink. */
export function plateTone(issue: number | null | undefined): CoverTone {
  return (['yellow', 'red', 'ink'] as const)[
    Math.floor(Math.abs(issue ?? 0) / PHOTO_LOOKS.length) % 3
  ];
}

/**
 * Nach LOVE: das Logo Ton in Ton mit dem Foto. Ist das Foto hell, ein
 * dunkler Ton daraus, ist es dunkel, ein heller — Sanity sagt das über die
 * Schriftfarbe, die es auf die Hauptfarbe setzen würde.
 */
export function toneOnTone(palette: CoverPalette | null | undefined): string {
  const darkPhoto = palette?.dominant?.foreground?.toLowerCase() === '#fff';
  const pick = darkPhoto ? palette?.light : palette?.dark;
  return pick || palette?.dominant?.background || (darkPhoto ? '#e8e2d6' : '#3a332b');
}

/** Teil vor dem Doppelpunkt oder Gedankenstrich und der Rest — „Burger in
 *  Berlin" / „6 Buden für verschiedene Lebenslagen". */
export function splitHeadline(title: string): [string, string] {
  const m = title.match(/^(.+?)(?::\s+|\s+[–—-]\s+)(.+)$/);
  return m ? [m[1], m[2]] : [title, ''];
}

/** Schlagzeilen-Grösse in cqw nach Länge, zwischen `min` und `max`. */
export function fitSize(text: string, k: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, k / Math.max(text.length, 1))) * 10) / 10;
}

/** Ein Rechteck auf dem Heft, in Prozent der Heftbreite. */
export interface CoverRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Das freigestellte Motiv so gross, wie es in `maxW` × `maxH` passt, mit
 *  der Mitte bei `cx`/`cy`. */
export function fitCutout(
  cover: CutoutCover,
  maxW: number,
  maxH: number,
  cx: number,
  cy: number
): CoverRect {
  const ratio = (cover.box.h * cover.cutoutHeight) / (cover.box.w * cover.cutoutWidth);
  const width = Math.min(maxW, maxH / ratio);
  const height = width * ratio;
  return { left: cx - width / 2, top: cy - height / 2, width, height };
}

/** Ein Freisteller liegt nie gerade: abwechselnd links und rechts gedreht. */
export function tilt(issue: number | null | undefined): number {
  return Math.abs(issue ?? 0) % 4 < 2 ? -6 : 5;
}

/** Das Logo bei „Vor dem Logo“: 94 breit, 7 vom oberen Rand. */
export const FRONT_LOGO = { top: 7, width: 94, height: (94 * 480) / 1436 };

/**
 * Vor dem Logo: das Motiv ragt vor die untere Hälfte des Logos. Foto und
 * Freisteller liegen deckungsgleich übereinander (`photo`), das Foto deckt
 * dabei das ganze Heft. Geht das nicht — das Motiv stösst oben ans Bild, oder
 * das Foto müsste dafür zu stark vergrössert werden —, steht das Motiv
 * ausgeschnitten auf Ink (`flat`).
 */
export function frontGeometry(cover: CutoutCover): { mode: 'photo' | 'flat'; rect: CoverRect } {
  const aspect = cover.cutoutHeight / cover.cutoutWidth;
  const { x, y, w, h } = cover.box;
  const top = FRONT_LOGO.top + FRONT_LOGO.height * 0.56;
  const target = COVER_HEIGHT * 0.8 - top;
  // Alles in Fotobreiten: das Foto ist 1 breit und `aspect` hoch.
  const y0 = y * aspect;
  const ow = w;
  const oh = h * aspect;
  const fit = Math.min(target / oh, 96 / ow);

  let scale = fit;
  let flat = y <= 0.005;
  if (!flat) {
    scale = Math.max(fit, top / y0, (COVER_HEIGHT - top) / (aspect - y0), 100);
    if (scale * oh > 1.45 * target && scale * ow > 1.45 * 96) flat = true;
  }
  if (flat) {
    return {
      mode: 'flat',
      rect: { left: (100 - ow * fit) / 2, top, width: ow * fit, height: oh * fit },
    };
  }
  const cx = x + w / 2;
  const left = Math.min(0, Math.max(100 - scale, 50 - scale * cx));
  return {
    mode: 'photo',
    rect: { left, top: top - scale * y0, width: scale, height: scale * aspect },
  };
}

/** Bildausschnitt fürs Sanity-CDN (`rect=x,y,w,h` in Pixeln des Freistellers). */
export function cutoutRect(cover: CutoutCover): string {
  const { x, y, w, h } = cover.box;
  const W = cover.cutoutWidth;
  const H = cover.cutoutHeight;
  const left = Math.max(0, Math.floor(x * W));
  const top = Math.max(0, Math.floor(y * H));
  const width = Math.min(W - left, Math.ceil(w * W));
  const height = Math.min(H - top, Math.ceil(h * H));
  return `${left},${top},${width},${height}`;
}

/** Wohin „Nach Beauty Papers“ zoomt: auf das Motiv, sonst in die Mitte. */
export function focusPoint(cover: CoverData | null | undefined): { x: number; y: number } {
  if (hasCutout(cover)) {
    const pct = (v: number) => Math.round(v * 1000) / 10;
    return { x: pct(cover.box.x + cover.box.w / 2), y: pct(cover.box.y + cover.box.h / 2) };
  }
  return { x: 50, y: 50 };
}

/** `sizes` einer Ebene, die `factor`-mal so breit ist wie das Heft. */
export function scaleSizes(sizes: string, factor: number): string {
  const f = Math.round(factor * 1000) / 1000;
  return sizes
    .split(',')
    .map((part) => part.trim().replace(/(\S+)$/, (len) => `calc(${len} * ${f})`))
    .join(', ');
}

/* ── Für das Freistell-Skript ─────────────────────────────────────────── */

/** Was cutout.swift über ein Foto meldet. */
export interface CutoutReport {
  found: boolean;
  instances?: number;
  width?: number;
  height?: number;
  box?: CoverBox;
  edges?: number;
  coverage?: number;
  labels?: Record<string, number>;
  /** Anteil des Rahmens einer erkannten Person, der im Freisteller liegt. */
  person?: number;
}

/** Ein Freisteller taugt fürs Heft, wenn höchstens drei Motive drauf sind —
 *  ein Brotregal zerfällt in sieben und gibt kein Bild. */
export function usableCutout(report: CutoutReport): boolean {
  return Boolean(
    report.found && report.box && (report.instances ?? 0) >= 1 && (report.instances ?? 0) <= 3
  );
}

/**
 * Ein Gericht: die Bilderkennung sagt „food“ (ab 0,3), das Motiv berührt
 * höchstens zwei Bildränder, und es steckt keine Person darin. An der Regel
 * gemessen am 02.10.2026 auf allen 27 Titelfotos: zehn Gerichte, kein Tisch,
 * keine Fassade, kein Regal. Blumen und Wein ohne „food“ fallen durch — die
 * stellt man in Studio von Hand um.
 *
 * Personen schneidet das Heft nie aus, nur Essen (Ansage 03.10.2026). Beim
 * Döner-Heft hielt ein Mann den Döner, und der Freisteller nahm ihn halb mit:
 * 44 % seines Rahmens lagen darin, bei den neun übrigen Gerichten 0 % — auch
 * bei Charlottenburg, wo Gäste im Hintergrund sitzen. Mit Person bleibt das
 * ganze Foto, also ein Foto-Look.
 */
export function isDish(report: CutoutReport): boolean {
  return (
    usableCutout(report) &&
    (report.labels?.food ?? 0) >= 0.3 &&
    (report.edges ?? 4) <= 2 &&
    (report.person ?? 0) < 0.1
  );
}
