// Single source of truth for the Sanity-CDN transform params baked into GROQ
// image projections. GROQ can't import JS, so queries interpolate the snippet
// these helpers return — change a width/quality here instead of grepping eight
// projections across three files.
//
// next/image schickt Sanity-URLs über lib/imageLoader.ts direkt an die
// Sanity-CDN (Breite pro srcset-Stufe, Zuschnitt mitskaliert). Raw Sanity
// <img> call sites use `sanityImageLoader`/`sanitySrcSet`; these presets
// define the initial URL a projection ships.

interface Preset {
  w: number;
  q: number;
  h?: number;
  fit?: 'crop';
}

const IMAGE_PRESETS = {
  // Restaurant + article hero (detail pages) und die Galerie-Vollansicht.
  // 1600 statt 1200, weil die Bildspalte der Detailseite 900px breit ist —
  // auf einem 2x-Schirm also 1800 Geraetepixel. 1200 hiess dort ein Viertel
  // Aufloesung zu wenig, und 1600 ist ohnehin die Obergrenze, mit der die
  // Import-Skripte Fotos ziehen: mehr liegt bei den Bestandsfotos nicht.
  // Kostet mobil nichts — was ausgeliefert wird, entscheidet next/image
  // anhand von `sizes`, nicht die Breite der Quelle.
  detailHero: { w: 1600, q: 85 },
  // Der Hero des Map-Sheets. Bleibt bei 1200, obwohl das Sheet dieselbe
  // Restaurant-Abfrage fuettert wie die Detailseite: dort haengt das Bild in
  // einem `background-image` ohne srcset, wird also in voller Breite geladen —
  // auch auf dem Handy, wo das Sheet keine 500px breit ist. `detailHero` darf
  // deshalb nicht fuer beide gelten.
  sheetHero: { w: 1200, q: 85 },
  // Bezirk hero (wider crop)
  // Standard restaurant / article card photo
  card: { w: 800, q: 80 },
  // Map list/marker thumbnail
  mapCard: { w: 600, q: 80 },
  // Inline editorial photo in the article column (max 720px wide, 2x retina)
  articleImage: { w: 1440, q: 80 },
  // Inline must-eat dish card inside an article
  articleDish: { w: 400, q: 80 },
  // The restaurant photo on an inline must-eat card
  articleDishRestaurant: { w: 500, q: 75 },
  // Square buddy retrieval thumbnail
  buddyThumb: { w: 120, h: 120, fit: 'crop', q: 80 },
  // Restaurant detail-sheet gallery strip (fixed 4:3 crop for a uniform look)
  galleryThumb: { w: 400, h: 300, fit: 'crop', q: 80 },
  // The copy of a photo that goes into JSON-LD — see schemaImageUrl below.
  schemaImage: { w: 1200, q: 80 },
} as const satisfies Record<string, Preset>;

type ImagePresetName = keyof typeof IMAGE_PRESETS;

/** The `?w=…&auto=format&q=…` query string for a preset (param order matches
 *  the hand-written projections this replaced — keep it stable). */
export function presetQuery(preset: ImagePresetName): string {
  const p: Preset = IMAGE_PRESETS[preset];
  let qs = `?w=${p.w}`;
  if (p.h != null) qs += `&h=${p.h}`;
  if (p.fit != null) qs += `&fit=${p.fit}`;
  qs += `&auto=format&q=${p.q}`;
  return qs;
}

/** Carry the editor's crop and focal point in every projected image URL. */
export function groqImageUrl(path: string, preset: ImagePresetName): string {
  const crop = `${path}.crop`;
  const dim = `${path}.asset->metadata.dimensions`;
  const left = `round(coalesce(${crop}.left, 0) * ${dim}.width)`;
  const top = `round(coalesce(${crop}.top, 0) * ${dim}.height)`;
  const width = `(${dim}.width - ${left} - round(coalesce(${crop}.right, 0) * ${dim}.width))`;
  const height = `(${dim}.height - ${top} - round(coalesce(${crop}.bottom, 0) * ${dim}.height))`;
  const hasCrop = ['left', 'top', 'right', 'bottom'].map(side => `${crop}.${side} > 0`).join(' || ');
  return `(${path}.asset->url + "${presetQuery(preset)}" +
    select((${hasCrop}) && defined(${dim}.width) && defined(${dim}.height) =>
      "&rect=" + string(${left}) + "," + string(${top}) + "," + string(${width}) + "," + string(${height}), "") +
    select(defined(${path}.hotspot.x) && defined(${path}.hotspot.y) =>
      "${'h' in IMAGE_PRESETS[preset] ? '&crop=focalpoint' : ''}&fp-x=" + string(${path}.hotspot.x) + "&fp-y=" + string(${path}.hotspot.y), ""))`;
}

/**
 * Eigene Fotos. Sie tragen keine `creditUrl`, weil es nichts zu verlinken gibt
 * — die Bedingung unten verlangt Credit und URL aber nur *gemeinsam*, und ohne
 * diese Liste fiele ein selbst fotografierter Spot durchs Raster.
 *
 * `sardinen-bar` stand bis 25.08.2026 nicht drin: `image.credit` sagt dort
 * „Foto: Eat This", `creditUrl` und `instagramHandle` sind leer — die Karte
 * rutschte auf /kategorie/dinner und /bezirk/mitte ohne Bild aus der Zeile.
 * Einziger solcher Fall von 338 offenen Restaurants.
 *
 * `bar-basta` ist inzwischen redundant (es hat `instagramHandle: basta.berlin`
 * und käme schon über den Instagram-Zweig durch), bleibt aber drin: das Foto
 * ist unabhängig vom Handle unseres, und das Handle kann im Studio verschwinden.
 */
export const FIRST_PARTY_RESTAURANT_PHOTO_SLUGS = ['bar-basta', 'sardinen-bar'] as const;

function groqStringList(values: readonly string[]): string {
  return `[${values.map((value) => JSON.stringify(value)).join(', ')}]`;
}

function publishableRestaurantImageCondition(
  path = 'image',
  slugPath = 'slug.current',
  instagramPath = 'instagramHandle'
): string {
  return `(defined(${path}.credit) && defined(${path}.creditUrl)) || ${slugPath} in ${groqStringList(FIRST_PARTY_RESTAURANT_PHOTO_SLUGS)} || defined(${instagramPath})`;
}

export function publishableRestaurantImageUrl(
  path: string,
  preset: ImagePresetName,
  slugPath = 'slug.current',
  instagramPath = 'instagramHandle'
): string {
  return `select(${publishableRestaurantImageCondition(path, slugPath, instagramPath)} => ${groqImageUrl(path, preset)})`;
}

export function restaurantPhotoCredit(
  path = 'image',
  slugPath = 'slug.current',
  instagramPath = 'instagramHandle'
): string {
  return `select(defined(${path}.credit) => ${path}.credit, ${slugPath} in ${groqStringList(FIRST_PARTY_RESTAURANT_PHOTO_SLUGS)} => "Foto: Eat This", defined(${instagramPath}) => "Foto: @" + ${instagramPath})`;
}

export function restaurantPhotoCreditUrl(
  path = 'image',
  slugPath = 'slug.current',
  instagramPath = 'instagramHandle'
): string {
  return `select(defined(${path}.creditUrl) => ${path}.creditUrl, ${slugPath} in ${groqStringList(FIRST_PARTY_RESTAURANT_PHOTO_SLUGS)} => "https://eat-this.de", defined(${instagramPath}) => "https://www.instagram.com/" + ${instagramPath})`;
}

/** Re-points a Sanity CDN URL at the `schemaImage` preset for structured data.
 *
 *  Google only serves a large preview (`max-image-preview:large`) for images
 *  from 1200 px wide, and the list projections bake `card` — 800 px. That is
 *  the right size for the card the visitor downloads and too small for the
 *  thumbnail, so the JSON-LD hands Google its own wider URL instead of making
 *  every card on the page heavier. Sanity does upscale to the requested width
 *  (measured 23.08.2026: a 1072 px source came back 1200×994), so every entry
 *  clears the threshold — for the few sources under 1200 px at the cost of a
 *  mild stretch, which a thumbnail survives.
 *
 *  Returns undefined for null/non-Sanity URLs so callers can pass an optional
 *  field straight through. */
export function schemaImageUrl(url: string | null | undefined): string | undefined {
  if (!url || !url.includes('cdn.sanity.io')) return undefined;
  const result = new URL(resizeSanityImage(url, 1200, 80));
  result.searchParams.set('w', '1200');
  result.searchParams.delete('h');
  return result.toString();
}

/** Responsive candidates retain all editorial transforms. */
export function sanitySrcSet(url: string | null | undefined, widths: number[], q = 80): string | undefined {
  if (!url?.startsWith('https://cdn.sanity.io/')) return undefined;
  const urls = [...new Set(widths.map(width => resizeSanityImage(url, width, q)))];
  return urls.map(src => `${src} ${new URL(src).searchParams.get('w')}w`).join(', ');
}

/** Crop a fixed-ratio slot around the editorial focal point, inside its crop. */
export function sanityCroppedSources(url: string, widths: number[], ratio: number) {
  const size = sanityImageSize(url);
  if (!url.startsWith('https://cdn.sanity.io/images/') || !size) return undefined;
  const [base, query] = url.split('?');
  const params = new URLSearchParams(query);
  const rect = params.get('rect')?.split(',').map(Number);
  const original = base.match(/-(\d+)x(\d+)\.[a-z]+$/i);
  if (original && (params.has('fp-x') || params.has('fp-y'))) {
    const width = Math.min(size.width, Math.round(size.height * ratio));
    const height = Math.min(size.height, Math.round(size.width / ratio));
    const left = rect?.[0] ?? 0, top = rect?.[1] ?? 0;
    const x = Number(params.get('fp-x') ?? .5) * Number(original[1]);
    const y = Number(params.get('fp-y') ?? .5) * Number(original[2]);
    params.set('rect', [
      Math.round(Math.max(left, Math.min(x - width / 2, left + size.width - width))),
      Math.round(Math.max(top, Math.min(y - height / 2, top + size.height - height))),
      width, height,
    ].join(','));
    params.delete('fp-x'); params.delete('fp-y');
  }
  const maximum = Math.max(1, Math.floor(Math.min(size.width, size.height * ratio)));
  params.set('w', String(maximum));
  params.set('h', String(Math.max(1, Math.round(maximum / ratio))));
  params.set('fit', 'crop');
  params.set('crop', 'center');
  const source = `${base}?${params.toString()}`;
  const candidates = [...new Set(widths.map(w => resizeSanityImage(source, Math.max(1, Math.round(w)), 80)))];
  return { src: candidates[1] ?? candidates[0], srcSet: candidates.map(src => `${src} ${new URL(src).searchParams.get('w')}w`).join(', ') };
}

/** Resize without dropping rect, focal point, quality-independent transforms or aspect ratio. */
export function resizeSanityImage(src: string, width: number, quality = 80): string {
  const [base, query] = src.split('?');
  const preset = new URLSearchParams(query);
  const h = Number(preset.get('h')), w = Number(preset.get('w'));
  const ratio = h && preset.get('fit') ? (w || width) / h : null;
  const native = sanityImageSize(src);
  const outputWidth = Math.max(1, Math.round(native ? Math.min(width, native.width, ratio ? Math.floor(native.height * ratio) : Infinity) : width));
  const params = new URLSearchParams({ w: String(outputWidth) });
  if (ratio) params.set('h', String(Math.max(1, Math.round(outputWidth / ratio))));
  if (preset.has('fit')) params.set('fit', preset.get('fit')!);
  if (preset.has('crop')) params.set('crop', preset.get('crop')!);
  else if (ratio && preset.has('fp-x')) params.set('crop', 'focalpoint');
  params.set('auto', 'format'); params.set('q', String(quality));
  for (const [key, value] of preset) {
    if (!['w', 'h', 'fit', 'crop', 'auto', 'q'].includes(key)) params.set(key, value);
  }
  return `${base}?${params.toString()}`;
}

/** CSS cover surfaces use the same focal point, relative to the editor's crop. */
export function sanityImagePosition(url: string | null | undefined): string | undefined {
  if (!url?.startsWith('https://cdn.sanity.io/')) return undefined;
  const params = new URL(url).searchParams;
  if (!params.has('fp-x') && !params.has('fp-y')) return undefined;
  const match = url.split('?')[0].match(/-(\d+)x(\d+)\.[a-z]+$/i);
  const size = sanityImageSize(url);
  if (!match || !size) return undefined;
  const rect = params.get('rect')?.split(',').map(Number);
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  return `${clamp((Number(params.get('fp-x') ?? .5) * Number(match[1]) - (rect?.[0] ?? 0)) / size.width * 100)}% ${clamp((Number(params.get('fp-y') ?? .5) * Number(match[2]) - (rect?.[1] ?? 0)) / size.height * 100)}%`;
}

/** A landscape photo cropped into a portrait slot needs more source pixels
 * than the slot's width. Include the pixels hidden by object-fit: cover. */
export function coverImageScale(url: string | null | undefined, slotRatio: number): number {
  const size = sanityImageSize(url);
  return size ? Math.max(1, size.width / size.height / slotRatio) : 1;
}

/**
 * Breite und Höhe eines Sanity-Bilds aus seinem Dateinamen
 * (`…/<hash>-1600x2400.jpg`) — für Fotos, die ungeschnitten in ihrem eigenen
 * Format stehen und vor dem Laden schon ihren Platz brauchen.
 */
export function sanityImageSize(
  url: string | null | undefined
): { width: number; height: number } | null {
  const rect = url?.split('?')[1] && new URLSearchParams(url.split('?')[1]).get('rect')?.split(',').map(Number);
  if (rect && rect.length === 4 && rect.every(Number.isFinite) && rect[2] > 0 && rect[3] > 0) return { width: rect[2], height: rect[3] };
  const match = url?.split('?')[0].match(/-(\d+)x(\d+)\.[a-z]+$/i);
  return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
}
