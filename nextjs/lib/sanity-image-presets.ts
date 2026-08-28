// Single source of truth for the Sanity-CDN transform params baked into GROQ
// image projections. GROQ can't import JS, so queries interpolate the snippet
// these helpers return — change a width/quality here instead of grepping eight
// projections across three files.
//
// next/image uses Next's default optimizer. Raw Sanity <img> call sites use
// `sanityImageLoader`/`sanitySrcSet`; these presets define the initial URL a
// projection ships.

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
  bezirkHero: { w: 1600, q: 85 },
  // Standard restaurant / article card photo
  card: { w: 800, q: 80 },
  // Der Aufmacher der News-Übersicht. Unter 700px läuft die erste Story über
  // beide Spalten (92vw), auf einem 3x-Handy sind das gut 1035 Gerätepixel —
  // der geteilte `card`-Preset mit 800 reicht dafür nicht, und ihn global
  // anzuheben verteuerte jede Liste der Seite.
  newsLead: { w: 1400, q: 80 },
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

/** A GROQ image-URL snippet: `<path>.asset->url + "<preset query>"`.
 *  `path` is the dereference expression up to the image field, e.g.
 *  `image`, `restaurantRef->image`, `mustEatRef->restaurantRef->image`. */
export function groqImageUrl(path: string, preset: ImagePresetName): string {
  return `${path}.asset->url + "${presetQuery(preset)}"`;
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

export function publishableRestaurantImageCondition(
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
  return `${url.split('?')[0]}${presetQuery('schemaImage')}`;
}

/** Responsive `srcSet` for a raw `<img>` holding a Sanity CDN URL (projections
 *  bake a single preset width — fine for the fallback `src`, but without a
 *  srcset every viewport downloads that one size). Strips the baked query and
 *  re-derives one candidate per width, mirroring lib/sanityImageLoader.ts.
 *  Returns undefined for null/non-Sanity URLs so callers can pass it straight
 *  to the attribute. Pair it with an accurate `sizes` — a too-large `sizes`
 *  makes 2x screens pick a BIGGER candidate than the old fixed src. */
export function sanitySrcSet(
  url: string | null | undefined,
  widths: number[],
  q = 80
): string | undefined {
  if (!url || !url.includes('cdn.sanity.io')) return undefined;
  const base = url.split('?')[0];
  return widths.map((w) => `${base}?w=${w}&auto=format&q=${q} ${w}w`).join(', ');
}
