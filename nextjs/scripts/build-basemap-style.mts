/* Baut `public/basemap/style.json` aus der eingefrorenen CARTO-Vorlage
   `scripts/basemap/dark-matter.upstream.json`.
 *
 * Warum überhaupt ein eigener Style: Dark Matter zeichnet sein Straßennetz in
 * `rgba(65,71,88)` — gemessen b* −10,9 bei L* 30. Das ist die größte
 * zusammenhängende Fläche der Karte, und sie steht in einem Blauviolett, das
 * zu nichts in der Marke gehört (Ink #15120e ist warm, Gelb #FFC600 ist warm).
 * Auf einer hellen Grundkarte fiel das nicht auf, auf Ink schon.
 *
 * Was das Skript NICHT tut: an der Helligkeit drehen. Jeder Wert behält sein
 * L* auf die Nachkommastelle. Die Kontrasthierarchie des Styles — welche
 * Straßenklasse heller ist als welche — ist durchdacht und bleibt unangetastet;
 * geändert wird ausschließlich die Buntheit (Chroma und Farbwinkel). Deshalb
 * kann das Skript stumpf über ALLE Farbwerte laufen: neutrale Grautöne haben
 * kein Chroma und kommen unverändert wieder heraus.
 *
 * Der Zielwinkel ist der des Seiten-Inks, damit die Karte in derselben Familie
 * liegt wie das Blatt. Die Buntheit wird dabei deutlich gedämpft
 * (ROAD_CHROMA): mit voller Buntheit im warmen Winkel würden die Straßen
 * bräunlich-golden und träten in Konkurrenz zu den gelben Pins, die den
 * Inhalt tragen.
 *
 * Wasser hat einen eigenen Regler. Blau ist dort kein Fremdkörper, sondern die
 * Lesehilfe: auf einer Karte ohne Beschriftung erkennt man Spree und
 * Landwehrkanal an der Farbe. WATER_CHROMA dämpft sie nur, statt sie zu drehen.
 *
 * Der zweite Zweck des Skripts ist die Unabhängigkeit von CARTO. Die Vorlage
 * holt Kacheln, Schriften und Sprite von `cartocdn.com`; CARTO verlangt seit
 * Ende August 2026 bei den Rasterkarten API-Schlüssel und schreibt, sie
 * könnten die Pflicht ausweiten. Wir liefen dort ohne Schlüssel auf einem
 * Endpunkt, der uns jederzeit weggezogen werden konnte. Deshalb zeigen jetzt:
 *   Kacheln  → OpenFreeMap (kein Schlüssel, kommerziell erlaubt, dieselbe
 *              OpenMapTiles-Struktur — alle 14 source-layer der Vorlage sind
 *              dort vorhanden, gemessen). Und weil OpenFreeMap denselben
 *              Datensatz auch zum Selbsthosten herausgibt, ist das kein
 *              Umzug in die nächste Abhängigkeit, sondern der Schritt davor.
 *   Schriften → OpenFreeMap. Dort gibt es nur Noto Sans, also übersetzt
 *              FONT_STACKS die vier Montserrat-Stapel der Vorlage.
 *   Sprite   → ersatzlos raus, siehe DROP_ICONS.
 * Damit ist kein cartocdn.com-Aufruf mehr im Spiel; übrig bleibt der Style
 * selbst, und der liegt im Repo.
 *
 * Aufruf: npm run build:basemap  (die erzeugten Dateien mitcommitten)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const UPSTREAM = join(here, 'basemap', 'dark-matter.upstream.json');
const OUT = join(here, '..', 'public', 'basemap', 'style.json');

/* Der Seiten-Ink. Sein Farbwinkel wird zum Winkel aller entfärbten Flächen. */
const INK = '#15120e';

/* Anteil der ursprünglichen Buntheit, der im warmen Winkel stehen bleibt.
   1.0 wäre ein sattes Braun, 0 ein reines Neutralgrau. 0.34 liegt knapp über
   der Wahrnehmungsschwelle: die Straßen lesen sich wärmer als der Grund, ohne
   als eigene Farbe aufzutreten. */
const ROAD_CHROMA = 0.34;

/* Wasser wird nur gedämpft, nicht gedreht — siehe Kopfkommentar. */
const WATER_CHROMA = 0.62;

/* Layer, die als Wasser gelten. Alles andere läuft über ROAD_CHROMA. */
const WATER_LAYERS = /^(water|waterway|watername_)/;

/* Unterhalb dieser Buntheit ist ein Wert praktisch neutral und wird nicht
   angefasst — sonst schöbe das Skript Rundungsrauschen in reine Grautöne. */
const NEUTRAL_C = 1.2;

/* Kachelquelle. Die TileJSON-Adresse statt fester Kachel-URLs, weil
   OpenFreeMap den Datenstand im Pfad führt (…/planet/20260830_080001_pt/…) —
   über die TileJSON folgen wir dem Stand, ohne dass jemand eine Zahl pflegt.
   Von dort kommt auch die Attribution, die MapLibre unten links zeigt. */
const TILES_URL = 'https://tiles.openfreemap.org/planet';

const GLYPHS_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

/* Die Vorlage setzt fünf Schriften pro Stapel (Montserrat, Open Sans, zwei
   CJK-Fallbacks). Jeder Stapel ist eine eigene Anfrage von ~48 KB, und
   OpenFreeMap führt ohnehin nur Noto Sans. Übersetzt wird deshalb auf drei
   einzelne Schnitte — dieselbe Zahl Anfragen wie vorher, aber ohne Fallbacks,
   die für Berliner Beschriftung nie zum Zug kommen.
   Die Hierarchie bleibt: was in der Vorlage Medium war (BERLIN, Parks), wird
   Bold; was Regular war (Straßennamen, Ortsteile), bleibt Regular; Gewässer
   behalten ihre Kursive — das ist Kartenkonvention, nicht Zierde. */
const FONT_STACKS: Record<string, string> = {
  'Montserrat Medium': 'Noto Sans Bold',
  'Montserrat Regular': 'Noto Sans Regular',
  'Montserrat Medium Italic': 'Noto Sans Italic',
  'Montserrat Regular Italic': 'Noto Sans Italic',
};

/* Die Vorlage kennt genau ein Icon: einen Punkt hinter Städtenamen, in fünf
   Layern zwischen Zoom 4 und 8. Auf einer Berliner Karte ist das der Zoom, auf
   dem halb Europa im Bild steht — der Punkt neben „Hamburg" ist dort Zierde.
   Er fliegt deshalb ganz raus, statt ein eigenes Sprite dafür zu hosten.
   Der eigentliche Auslöser war MapLibre: sein `parseUrl` verlangt für `sprite`
   eine Adresse MIT Protokoll, eine wurzelrelative wie `/basemap/sprite` wirft
   intern und wird still verschluckt — die Karte lädt, das Sprite nie. Eine
   absolute Adresse kennen wir zur Bauzeit nicht (lokal, Staging und Produktion
   sind drei), also müsste sie zur Laufzeit gesetzt werden. Für fünf Punkte auf
   Kontinent-Zoom ist das zu viel Apparat.
   Achtung, falls hier je ein Icon zurückkommt: dann gilt genau dieses Problem
   wieder, und ein Test „lädt die Karte?" beantwortet es NICHT. */
const DROP_ICONS = true;

// ---------------------------------------------------------------- Farbmathe
// sRGB ↔ CIE Lab (D65, 2°). Bewusst ohne Abhängigkeit: das Skript soll auch
// in einem Jahr noch laufen, wenn niemand mehr weiß, warum es existiert.

type Rgb = { r: number; g: number; b: number; a: number };

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, Math.round(c * 255)));
};

const WHITE = { x: 0.95047, y: 1, z: 1.08883 };

function rgbToLab({ r, g, b }: Rgb): [number, number, number] {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / WHITE.x;
  const y = (lr * 0.2126 + lg * 0.7152 + lb * 0.0722) / WHITE.y;
  const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / WHITE.z;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function labToRgb([L, a, bb]: [number, number, number], alpha: number): Rgb {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - bb / 200;
  const inv = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  const x = inv(fx) * WHITE.x;
  const y = inv(fy) * WHITE.y;
  const z = inv(fz) * WHITE.z;
  const lr = x * 3.2406 + y * -1.5372 + z * -0.4986;
  const lg = x * -0.9689 + y * 1.8758 + z * 0.0415;
  const lb = x * 0.0557 + y * -0.204 + z * 1.057;
  return { r: fromLinear(lr), g: fromLinear(lg), b: fromLinear(lb), a: alpha };
}

/* Style-Spec-Farben, wie sie in Dark Matter tatsächlich vorkommen: #rgb,
   #rrggbb, rgb(), rgba(). Alles andere (benannte Farben, hsl) gibt null
   zurück und bleibt unangetastet. */
function parseColor(value: string): Rgb | null {
  const hex6 = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex6) {
    const h = hex6[1];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }
  const hex3 = /^#([0-9a-f]{3})$/i.exec(value);
  if (hex3) {
    const h = hex3[1];
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
      a: 1,
    };
  }
  const fn = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (fn) {
    const parts = fn[1].split(',').map((p) => Number(p.trim()));
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
  }
  return null;
}

/* Zurück immer in der Schreibweise, die das Original an dieser Stelle hatte —
   sonst rauscht der Diff gegen die Vorlage voller Formatwechsel. */
function formatColor(rgb: Rgb, original: string): string {
  if (original.startsWith('rgb')) {
    return rgb.a === 1
      ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`
      : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`;
  }
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(rgb.r)}${hex(rgb.g)}${hex(rgb.b)}`;
}

const inkLab = rgbToLab(parseColor(INK)!);
const INK_HUE = Math.atan2(inkLab[2], inkLab[1]);

/** Hält L*, dreht den Farbwinkel auf den des Inks und dämpft die Buntheit. */
function warm(value: string, chromaFactor: number, turnHue: boolean): string {
  const rgb = parseColor(value);
  if (!rgb) return value;
  const [L, a, b] = rgbToLab(rgb);
  const c = Math.hypot(a, b);
  if (c < NEUTRAL_C) return value;
  const hue = turnHue ? INK_HUE : Math.atan2(b, a);
  const nc = c * chromaFactor;
  const out = labToRgb([L, Math.cos(hue) * nc, Math.sin(hue) * nc], rgb.a);
  return formatColor(out, value);
}

// ------------------------------------------------------------------- Umbau

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const changes: { layer: string; from: string; to: string }[] = [];

function mapColors(node: Json, layerId: string, isWater: boolean): Json {
  if (typeof node === 'string') {
    const next = warm(node, isWater ? WATER_CHROMA : ROAD_CHROMA, !isWater);
    if (next !== node) changes.push({ layer: layerId, from: node, to: next });
    return next;
  }
  if (Array.isArray(node)) return node.map((v) => mapColors(v, layerId, isWater));
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([k, v]) => [k, mapColors(v, layerId, isWater)])
    );
  }
  return node;
}

const style = JSON.parse(readFileSync(UPSTREAM, 'utf8'));

style.name = 'Eat This Ink';
style.metadata = {
  ...(style.metadata ?? {}),
  'eat-this:derived-from': 'CARTO Dark Matter (basemaps.cartocdn.com/gl/dark-matter-gl-style)',
  'eat-this:generator': 'npm run build:basemap',
};

for (const layer of style.layers) {
  const isWater = WATER_LAYERS.test(layer.id);
  /* Nur `paint` trägt Farben. `layout` enthält Textfelder und Icon-Namen —
     dort würde die Suche nach Farbstrings nichts finden und im Zweifel einen
     Icon-Namen zerlegen. */
  if (layer.paint) layer.paint = mapColors(layer.paint, layer.id, isWater);

  if (DROP_ICONS && layer.layout?.['icon-image']) delete layer.layout['icon-image'];

  const stack = layer.layout?.['text-font'];
  if (Array.isArray(stack) && typeof stack[0] === 'string') {
    const mapped = FONT_STACKS[stack[0]];
    if (!mapped) throw new Error(`Unbekannter Schriftstapel: ${stack[0]} (${layer.id})`);
    layer.layout['text-font'] = [mapped];
  }
}

/* Alle drei Fremdadressen der Vorlage umhängen. Der Quellname `carto` bleibt
   stehen: jede der 93 Layer-Definitionen verweist darauf, und ein Umbenennen
   brächte nichts ausser einem grösseren Diff. */
const sourceIds = Object.keys(style.sources);
if (sourceIds.length !== 1) throw new Error(`Erwartet genau eine Quelle, gefunden: ${sourceIds}`);
style.sources[sourceIds[0]].url = TILES_URL;
style.glyphs = GLYPHS_URL;
delete style.sprite;

writeFileSync(OUT, `${JSON.stringify(style, null, 2)}\n`);

const uniq = new Map<string, string>();
for (const c of changes) uniq.set(c.from, c.to);
console.log(`${OUT.split('/nextjs/')[1]}: ${changes.length} Farbwerte umgefärbt`);
console.log(`Kacheln ${TILES_URL}\nSchriften ${GLYPHS_URL}\nSprite: keins (Icons entfernt)`);
console.log(`Ink-Winkel ${((INK_HUE * 180) / Math.PI).toFixed(1)}°, Straßen ×${ROAD_CHROMA}, Wasser ×${WATER_CHROMA}\n`);
for (const [from, to] of uniq) console.log(`  ${from.padEnd(24)} → ${to}`);
