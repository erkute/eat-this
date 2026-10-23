/* Builds both Eat This map palettes from the pinned CARTO layer structure.
 * Sources, geometry, zoom hierarchy and transit overlays stay unchanged.
 * Seit 22.10.2026 die „Druckfassung" (Betreiber-Wahl gegen die bisherige
 * Karte): Papier und Ink wie die Seite — keine Strassenkonturen, Strassen als
 * Ink-Striche in wenigen Stärken, Wasser und Grün nur leise, Gebäude flach,
 * Beschriftung in Ink auf Papier-Hof. Das Papierkorn darüber legt
 * MapLayout.module.css. Regenerate with npm run build:basemap and commit
 * public/basemap/style.json and style-dark.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const UPSTREAM = join(here, 'basemap', 'dark-matter.upstream.json');
const dark = process.argv.includes('--dark');
const OUT = join(here, '..', 'public', 'basemap', dark ? 'style-dark.json' : 'style.json');

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

/** Paper canvas, ink labels, restrained road and water colours. */
function warm(value: string, chromaFactor: number, turnHue: boolean): string {
  const rgb = parseColor(value);
  if (!rgb) return value;
  const [L, a, b] = rgbToLab(rgb);
  const c = Math.hypot(a, b);
  const lightness = dark ? L : 100 - L * 0.9;
  const hue = turnHue ? INK_HUE : Math.atan2(b, a);
  const nc = c < NEUTRAL_C ? 0 : c * chromaFactor;
  const out = labToRgb([lightness, Math.cos(hue) * nc, Math.sin(hue) * nc], rgb.a);
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

style.name = dark ? 'Eat This Dark' : 'Eat This Light';
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

/* Gebäude flach: die Vorlage zeichnet sie als zwei Flächen (Grundriss und
   ein um 2 px versetztes „Dach"); beide fliegen raus, an ihre Stelle tritt
   unten ein leiser Ink-Ton ab Zoom 14 — Grundrisse wie auf einem gedruckten
   Stadtplan statt grauer Klötze (bis 22.10.2026 standen sie in 3D). */
const BUILDING_LAYERS = ['building', 'building-top'];
const buildingAt = style.layers.findIndex(
  (layer: { id: string }) => layer.id === BUILDING_LAYERS[0]
);
if (buildingAt < 0) throw new Error('Gebäude-Layer der Vorlage nicht gefunden');
const buildingTop = style.layers.find((layer: { id: string }) => layer.id === 'building-top');
style.layers = style.layers.filter((layer: { id: string }) => !BUILDING_LAYERS.includes(layer.id));

// ------------------------------------------------------------- Druckfassung
{
  const paper = dark ? '#15120e' : '#ffffff';
  const inkRgb = dark ? '255, 255, 255' : '21, 18, 14';
  const ink = (alpha: number) => `rgba(${inkRgb}, ${alpha})`;
  const water = dark ? '#262d33' : '#e1e6ea';

  style.layers.splice(buildingAt, 0, {
    id: 'building-flat',
    type: 'fill',
    source: buildingTop.source,
    'source-layer': 'building',
    minzoom: 14,
    paint: { 'fill-color': ink(dark ? 0.09 : 0.07), 'fill-antialias': true },
  });

  /* Deckkraft eines Strassenstrichs nach Rang. */
  const roadAlpha = (id: string) =>
    /_mot_|_trunk_/.test(id)
      ? 0.6
      : /_pri_/.test(id)
        ? 0.5
        : /_sec_/.test(id)
          ? 0.38
          : /_minor_/.test(id)
            ? 0.24
            : 0.16;

  const hidden = 'rgba(0, 0, 0, 0)';
  for (const layer of style.layers) {
    const id: string = layer.id;
    const p = layer.paint ?? {};
    if (layer.type === 'background') p['background-color'] = paper;
    else if (/^boundary/.test(id)) p['line-color'] = hidden;
    else if (id === 'water') p['fill-color'] = water;
    else if (id === 'waterway') p['line-color'] = water;
    else if (id === 'water_shadow') p['fill-color'] = hidden;
    else if (/^(landcover|park_)/.test(id)) p['fill-color'] = ink(dark ? 0.06 : 0.045);
    else if (id === 'landuse_residential') p['fill-color'] = hidden;
    else if (id === 'landuse') p['fill-color'] = ink(0.03);
    else if (/^aeroway/.test(id)) p['line-color'] = ink(0.12);
    else if (/_case(_|$)/.test(id)) p['line-color'] = hidden;
    else if (/rail_dash$/.test(id)) p['line-color'] = hidden;
    else if (/(^|_)rail$/.test(id)) p['line-color'] = ink(/^tunnel/.test(id) ? 0.18 : 0.42);
    else if (/_path$/.test(id)) p['line-color'] = ink(0.14);
    else if (/_fill/.test(id)) {
      p['line-color'] = ink(roadAlpha(id) * (/^tunnel/.test(id) ? 0.55 : 1));
    } else if (layer.type === 'symbol') {
      if (p['text-color'] !== undefined && p['text-color'] !== 'transparent') {
        p['text-color'] = /^(roadname|waterway_label|watername|poi)/.test(id)
          ? ink(0.62)
          : ink(0.85);
        p['text-halo-color'] = paper;
      }
      if (p['icon-color'] !== undefined) p['icon-color'] = ink(0.6);
    }
    layer.paint = p;
  }

  /* Schriftgrössen wie bei Google Maps (Ansage 22.10.2026; die Schrift
     bleibt unsere): Strassen 10–12,5px ohne Sperrung, Ortsteile 10–12px,
     Stadtnamen höchstens 16px statt bis 22, Parks und Gewässer 10–11px.
     Zoom → Pixel, linear dazwischen. */
  const stops = (...pairs: [number, number][]) => ({ stops: pairs });
  const SIZES: Record<string, object> = {
    roadname_minor: stops([15, 10], [17, 11]),
    roadname_sec: stops([14, 10], [16, 11], [18, 12]),
    roadname_pri: stops([13, 10.5], [15, 11.5], [17, 12.5]),
    roadname_major: stops([13, 10.5], [15, 11.5], [17, 12.5]),
    place_hamlet: stops([13, 10], [16, 11]),
    place_suburbs: stops([12, 10], [14, 11], [16, 12]),
    place_villages: stops([10, 10], [13, 11], [16, 12]),
    place_town: stops([8, 11], [13, 13], [14, 14]),
    place_city_r6: stops([8, 12], [10, 14], [13, 15], [14, 16]),
    place_city_r5: stops([8, 13], [10, 15], [13, 16], [14, 16]),
    poi_park: stops([15, 10], [18, 11]),
    poi_stadium: stops([15, 10], [18, 11]),
    waterway_label: stops([9, 9], [13, 10], [16, 11]),
    watername_lake: stops([13, 10], [16, 11]),
    watername_lake_line: stops([13, 10], [16, 11]),
  };
  for (const layer of style.layers) {
    const size = SIZES[layer.id];
    if (!size) continue;
    layer.layout['text-size'] = size;
    if (/^roadname_(pri|major)$/.test(layer.id)) layer.layout['text-letter-spacing'] = 0;
    if (layer.id === 'roadname_minor') layer.minzoom = 15;
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
console.log(
  `Ink-Winkel ${((INK_HUE * 180) / Math.PI).toFixed(1)}°, Straßen ×${ROAD_CHROMA}, Wasser ×${WATER_CHROMA}\n`
);
for (const [from, to] of uniq) console.log(`  ${from.padEnd(24)} → ${to}`);
