/**
 * Creates a draft restaurant in Sanity from a Google Maps URL via Google
 * Places; the editorial fields are filled in Studio.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/import-from-url.ts <google-maps-url> [--dry-run] [--no-gallery]
 *
 * Required env (nextjs/.env.local): SANITY_API_WRITE_TOKEN (Editor),
 * GOOGLE_API_KEY (Places API v1).
 */
import { config as loadEnv } from 'dotenv';
import { createClient } from '@sanity/client';
import type { SanityClient } from '@sanity/client';
import { randomUUID } from 'node:crypto';
import { isOwnerPhoto, PLACES_PHOTO_MAX_WIDTH_PX } from './lib/photo-curation';

loadEnv({ path: '.env.local' });

const SANITY_PROJECT_ID = 'ehwjnjr2';
const SANITY_DATASET = 'production';
const SANITY_API_VERSION = '2024-01-01';

// Read without throwing: Next evaluates this module at build time, where
// runtime secrets are missing. runImport() validates.
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const defaultSanity = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

async function resolveUrl(input: string): Promise<string> {
  const res = await fetch(input, { redirect: 'follow' });
  return res.url;
}

interface ParsedUrl {
  name: string;
  lat: number;
  lng: number;
}

function parseMapsUrl(url: string): ParsedUrl | null {
  const placeMatch = url.match(/\/place\/([^/?]+)/);
  if (!placeMatch) return null;
  // Prefer the place coords in `data=...!3d{lat}!4d{lng}`; the `@lat,lng,zoom`
  // view centre can be a country overview.
  const placeCoords = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const viewCoords = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const coords = placeCoords ?? viewCoords;
  if (!coords) return null;
  return {
    name: decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')),
    lat: parseFloat(coords[1]),
    lng: parseFloat(coords[2]),
  };
}

// Slug: mirrors studio/schemaTypes/restaurant.js.

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/['’]/g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Unique across drafts and published; tries `<base>-<ortsteil>` before a
 * numeric suffix.
 */
async function uniqueSlug(
  base: string,
  ortsteil: string | null,
  sanity: SanityClient
): Promise<string> {
  const exists = async (s: string) =>
    (await sanity.fetch<number>(`count(*[_type=="restaurant" && slug.current == $s])`, { s })) > 0;
  if (!(await exists(base))) return base;
  if (ortsteil) {
    const withOrt = `${base}-${slugify(ortsteil)}`;
    if (!(await exists(withOrt))) return withOrt;
  }
  const ortPart = ortsteil ? `-${slugify(ortsteil)}` : '';
  for (let n = 2; n < 100; n++) {
    const candidate = `${base}${ortPart}-${n}`;
    if (!(await exists(candidate))) return candidate;
  }
  throw new ImportError(`Could not find unique slug for "${base}" after 100 attempts.`);
}

const TYPE_MAP: Record<string, string> = {
  ramen_restaurant: 'Japanese / Ramen',
  japanese_restaurant: 'Japanese',
  sushi_restaurant: 'Japanese / Sushi',
  chinese_restaurant: 'Chinese',
  korean_restaurant: 'Korean',
  thai_restaurant: 'Thai',
  vietnamese_restaurant: 'Vietnamese',
  turkish_restaurant: 'Turkish',
  kebab_restaurant: 'Turkish / Kebab',
  italian_restaurant: 'Italian',
  pizza_restaurant: 'Italian / Pizza',
  french_restaurant: 'French',
  american_restaurant: 'American',
  hamburger_restaurant: 'Burgers',
  sandwich_shop: 'Sandwiches',
  mexican_restaurant: 'Mexican',
  greek_restaurant: 'Greek',
  indian_restaurant: 'Indian',
  middle_eastern_restaurant: 'Middle Eastern',
  lebanese_restaurant: 'Lebanese',
  mediterranean_restaurant: 'Mediterranean',
  spanish_restaurant: 'Spanish',
  austrian_restaurant: 'Austrian',
  german_restaurant: 'German',
  european_restaurant: 'European',
  fine_dining_restaurant: 'Fine Dining',
  seafood_restaurant: 'Seafood',
  steak_house: 'Steakhouse',
  vegetarian_restaurant: 'Vegetarian',
  vegan_restaurant: 'Vegan',
  cafe: 'Café',
  coffee_shop: 'Coffee',
  bakery: 'Bakery',
  ice_cream_shop: 'Ice Cream',
  dessert_shop: 'Desserts',
  dessert_restaurant: 'Desserts',
  wine_bar: 'Wine Bar',
  bar: 'Bar',
};

function pickCuisine(types: string[] = []): string | null {
  for (const t of types) if (TYPE_MAP[t]) return TYPE_MAP[t];
  return null;
}

// Places weekdayDescriptions (German) to daySlot[], with same-hours days
// grouped. The only place with this conversion.
const DAY_ORDER = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const DAY_SHORT: Record<string, string> = {
  Montag: 'Mon',
  Dienstag: 'Tue',
  Mittwoch: 'Wed',
  Donnerstag: 'Thu',
  Freitag: 'Fri',
  Samstag: 'Sat',
  Sonntag: 'Sun',
};

export interface DaySlot {
  _key: string;
  _type: 'daySlot';
  days: string;
  hours: string;
}

function parseWeekdayDescriptions(descs: string[] = []): DaySlot[] {
  const parsed = descs.map((d) => {
    const [day, ...rest] = d.split(':');
    const hours = rest.join(':').trim();
    const isClosed = /geschlossen|closed/i.test(hours);
    const clean = isClosed
      ? 'closed'
      : hours.replace(/ | /g, '').replace(/–/g, '-').replace(/Uhr/gi, '').trim();
    return { day: day.trim(), hours: clean };
  });
  const ordered = DAY_ORDER.map((d) => parsed.find((p) => p.day === d)).filter(
    (p): p is { day: string; hours: string } => Boolean(p)
  );
  const groups: { days: string[]; hours: string }[] = [];
  for (const slot of ordered) {
    const last = groups[groups.length - 1];
    if (last && last.hours === slot.hours) last.days.push(slot.day);
    else groups.push({ days: [slot.day], hours: slot.hours });
  }
  return groups.map((g, i) => ({
    _key: `hours-${i}`,
    _type: 'daySlot' as const,
    days:
      g.days.length === 1
        ? DAY_SHORT[g.days[0]]
        : `${DAY_SHORT[g.days[0]]}-${DAY_SHORT[g.days[g.days.length - 1]]}`,
    hours: g.hours,
  }));
}

interface Place {
  id: string;
  displayName?: { text: string };
  types?: string[];
  formattedAddress?: string;
  addressComponents?: { longText: string; shortText?: string; types: string[] }[];
  websiteUri?: string;
  internationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  priceLevel?:
    | 'PRICE_LEVEL_FREE'
    | 'PRICE_LEVEL_INEXPENSIVE'
    | 'PRICE_LEVEL_MODERATE'
    | 'PRICE_LEVEL_EXPENSIVE'
    | 'PRICE_LEVEL_VERY_EXPENSIVE';
  priceRange?: {
    startPrice?: { units?: string; currencyCode?: string };
    endPrice?: { units?: string; currencyCode?: string };
  };
  location?: { latitude: number; longitude: number };
  googleMapsUri?: string;
  photos?: {
    name: string;
    widthPx?: number;
    heightPx?: number;
    authorAttributions?: { displayName?: string; uri?: string; photoUri?: string }[];
  }[];
}

async function searchPlace(parsed: ParsedUrl): Promise<Place | null> {
  // Never request `places.reviews`: Google reviews are third-party voices and
  // no source for our texts. `editorialSummary` stays out too: it often comes
  // back English, and generate-de-descriptions.ts writes those fields.
  const FIELDS = [
    'places.id',
    'places.displayName',
    'places.types',
    'places.formattedAddress',
    'places.addressComponents',
    'places.websiteUri',
    'places.internationalPhoneNumber',
    'places.regularOpeningHours',
    'places.priceLevel',
    'places.priceRange',
    'places.location',
    'places.googleMapsUri',
    'places.photos',
  ].join(',');
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY!,
      'X-Goog-FieldMask': FIELDS,
    },
    body: JSON.stringify({
      textQuery: parsed.name,
      languageCode: 'de',
      // A hard rectangle around the pin: a soft locationBias lets a famous
      // namesake (the city of Bari) outrank the venue. ±0.02° is ≈ ±2 km.
      locationRestriction: {
        rectangle: {
          low: { latitude: parsed.lat - 0.02, longitude: parsed.lng - 0.02 },
          high: { latitude: parsed.lat + 0.02, longitude: parsed.lng + 0.02 },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Places ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { places?: Place[] };
  return data.places?.[0] ?? null;
}

/**
 * PLZ → Ortsteil: Google's `sublocality_level_1` returns the Bezirk, not the
 * Ortsteil. An unknown PLZ leaves bezirkRef empty for Studio.
 */
const PLZ_TO_ORTSTEIL: Record<string, string> = {
  '10115': 'Mitte',
  '10117': 'Mitte',
  '10119': 'Mitte',
  '10178': 'Mitte',
  '10179': 'Mitte',
  '10551': 'Moabit',
  '10553': 'Moabit',
  '10555': 'Moabit',
  '10557': 'Moabit',
  '10559': 'Moabit',
  '13347': 'Wedding',
  '13349': 'Wedding',
  '13351': 'Wedding',
  '13353': 'Wedding',
  '13355': 'Wedding',
  '13357': 'Wedding',
  '13359': 'Wedding',
  '10405': 'Prenzlauer Berg',
  '10407': 'Prenzlauer Berg',
  '10409': 'Prenzlauer Berg',
  '10435': 'Prenzlauer Berg',
  '10437': 'Prenzlauer Berg',
  '10439': 'Prenzlauer Berg',
  '13156': 'Pankow',
  '13158': 'Pankow',
  '13159': 'Pankow',
  '13187': 'Pankow',
  '13189': 'Pankow',
  '13086': 'Weißensee',
  '13088': 'Weißensee',
  '13089': 'Weißensee',
  '10243': 'Friedrichshain',
  '10245': 'Friedrichshain',
  '10247': 'Friedrichshain',
  '10249': 'Friedrichshain',
  '10961': 'Kreuzberg',
  '10963': 'Kreuzberg',
  '10965': 'Kreuzberg',
  '10967': 'Kreuzberg',
  '10969': 'Kreuzberg',
  '10997': 'Kreuzberg',
  '10999': 'Kreuzberg',
  '10585': 'Charlottenburg',
  '10587': 'Charlottenburg',
  '10589': 'Charlottenburg',
  '10623': 'Charlottenburg',
  '10625': 'Charlottenburg',
  '10627': 'Charlottenburg',
  '10629': 'Charlottenburg',
  '10707': 'Charlottenburg',
  '10711': 'Charlottenburg',
  '10719': 'Charlottenburg',
  '10713': 'Wilmersdorf',
  '10715': 'Wilmersdorf',
  '10717': 'Wilmersdorf',
  '10777': 'Schöneberg',
  '10779': 'Schöneberg',
  '10781': 'Schöneberg',
  '10783': 'Schöneberg',
  '10785': 'Schöneberg',
  '10787': 'Schöneberg',
  '10789': 'Schöneberg',
  '10823': 'Schöneberg',
  '10825': 'Schöneberg',
  '10827': 'Schöneberg',
  '10829': 'Schöneberg',
  '12157': 'Friedenau',
  '12099': 'Tempelhof',
  '12101': 'Tempelhof',
  '12103': 'Tempelhof',
  '12105': 'Tempelhof',
  '12107': 'Tempelhof',
  '12109': 'Tempelhof',
  '12277': 'Tempelhof',
  '12279': 'Tempelhof',
  '12305': 'Tempelhof',
  '12307': 'Tempelhof',
  '12043': 'Neukölln',
  '12045': 'Neukölln',
  '12047': 'Neukölln',
  '12049': 'Neukölln',
  '12051': 'Neukölln',
  '12053': 'Neukölln',
  '12055': 'Neukölln',
  '12057': 'Neukölln',
  '12059': 'Neukölln',
  '12159': 'Steglitz',
  '12161': 'Steglitz',
  '12163': 'Steglitz',
  '12165': 'Steglitz',
  '12167': 'Steglitz',
  '12169': 'Steglitz',
  '14195': 'Dahlem',
  '12435': 'Treptow',
  '12437': 'Treptow',
  '12439': 'Treptow',
  '12524': 'Treptow',
  '12526': 'Treptow',
  '12527': 'Treptow',
  '12459': 'Köpenick',
  '12487': 'Köpenick',
  '12489': 'Köpenick',
  '12555': 'Köpenick',
  '12557': 'Köpenick',
  '12559': 'Köpenick',
  '12587': 'Köpenick',
  '12589': 'Köpenick',
  '10315': 'Lichtenberg',
  '10317': 'Lichtenberg',
  '10318': 'Lichtenberg',
  '10319': 'Lichtenberg',
  '10365': 'Lichtenberg',
  '10367': 'Lichtenberg',
  '10369': 'Lichtenberg',
  '13051': 'Lichtenberg',
  '13053': 'Lichtenberg',
  '13055': 'Lichtenberg',
  '13057': 'Lichtenberg',
  '13059': 'Lichtenberg',
};

function findOrtsteil(components: Place['addressComponents'] = []): string | null {
  const plz = components.find((c) => c.types?.includes('postal_code'))?.longText;
  return plz ? (PLZ_TO_ORTSTEIL[plz] ?? null) : null;
}

async function findBezirkRef(name: string, sanity: SanityClient): Promise<string | null> {
  const doc = await sanity.fetch<{ _id: string } | null>(
    `*[_type=="bezirk" && name == $name][0]{_id}`,
    { name }
  );
  return doc?._id ?? null;
}

/**
 * Handles split shifts and closings after midnight.
 */
export function openAtMinute(slots: DaySlot[], minutes: number): boolean {
  return slots.some((slot) =>
    (slot.hours ?? '').split(',').some((span) => {
      const m = span.trim().match(/^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/);
      if (!m) return false;
      const from = Number(m[1]) * 60 + Number(m[2]);
      let to = Number(m[3]) * 60 + Number(m[4]);
      if (to <= from) to += 24 * 60;
      return minutes >= from && minutes <= to;
    })
  );
}

const LUNCH_MINUTE = 12 * 60 + 30;
const DINNER_MINUTE = 19 * 60 + 30;

/**
 * Places types → our nine categories. A bare `restaurant` type is common, so it
 * counts. Lunch and Dinner follow the opening hours (open at 12:30 / 19:30),
 * not the type; without hours both are assigned.
 */
function inferCategories(types: string[] = [], hours: DaySlot[] = []): string[] {
  const out = new Set<string>();
  // Fine Dining excludes Lunch and Dinner.
  if (types.includes('fine_dining_restaurant')) {
    out.add('Fine Dining');
    return [...out];
  }

  const open = hours.filter((h) => h.hours && h.hours !== 'closed');
  const addMealTimes = () => {
    if (!open.length) {
      out.add('Lunch');
      out.add('Dinner');
      return;
    }
    if (openAtMinute(open, LUNCH_MINUTE)) out.add('Lunch');
    if (openAtMinute(open, DINNER_MINUTE)) out.add('Dinner');
  };

  for (const t of types) {
    if (/^pizza_/.test(t)) {
      out.add('Pizza');
      addMealTimes();
    } else if (t === 'cafe' || t === 'coffee_shop') {
      out.add('Breakfast');
      out.add('Coffee');
    } else if (t === 'bakery') {
      out.add('Breakfast');
      out.add('Sweets');
    } else if (t === 'ice_cream_shop' || t === 'dessert_shop' || t === 'dessert_restaurant') {
      out.add('Sweets');
    } else if (t === 'bar' || t === 'wine_bar') {
      out.add('Drinks');
      addMealTimes();
    } else if (t === 'meal_takeaway' || t === 'snack_bar' || t === 'fast_food_restaurant') {
      out.add('Fast Food');
      addMealTimes();
    } else if (t === 'restaurant' || t === 'bistro' || /_restaurant$/.test(t)) {
      addMealTimes();
    }
  }
  return [...out];
}

/**
 * Case-insensitive, and via `nameEn` tolerant of German document names.
 */
async function lookupCategoryRefs(
  names: string[],
  sanity: SanityClient
): Promise<{ _key: string; _type: 'reference'; _ref: string }[]> {
  if (!names.length) return [];
  const docs = await sanity.fetch<{ _id: string; name: string; nameEn: string | null }[]>(
    `*[_type == "category" && (name in $names || nameEn in $names)]{_id, name, nameEn}`,
    { names }
  );
  const refs: { _key: string; _type: 'reference'; _ref: string }[] = [];
  for (const name of names) {
    const match = docs.find((d) => d.name === name || d.nameEn === name);
    if (!match) {
      console.warn(`  ⚠ no category doc for "${name}" — dropping from import`);
      continue;
    }
    if (refs.some((r) => r._ref === match._id)) continue;
    refs.push({
      _key: randomUUID().replace(/-/g, '').slice(0, 12),
      _type: 'reference',
      _ref: match._id,
    });
  }
  return refs;
}

interface PhotoAsset {
  _id: string;
  credit: string | null;
  creditUrl: string | null;
  sourcePhotoName: string;
}

function photoAttribution(
  photo: NonNullable<Place['photos']>[number],
  place: Pick<Place, 'googleMapsUri'>
) {
  const author = photo.authorAttributions?.[0];
  const displayName = author?.displayName;
  const isPlaceholder = !displayName || /copyrighted by their owners/i.test(displayName);
  return {
    credit: isPlaceholder ? 'Foto: Google Maps' : `Foto: ${displayName}`,
    creditUrl: isPlaceholder ? (place.googleMapsUri ?? null) : (author?.uri ?? null),
  };
}

/**
 * Owner-uploaded photos only; Google's terms require the attribution, kept as
 * credit/creditUrl.
 */
async function importPhoto(
  place: Place,
  restaurantSlug: string,
  restaurantName: string,
  sanity: SanityClient
): Promise<PhotoAsset | null> {
  const ownerPhotos = (place.photos ?? []).filter(
    (p) => p?.name && isOwnerPhoto(p.authorAttributions?.[0]?.displayName, restaurantName)
  );
  if (!ownerPhotos.length) {
    if (place.photos?.length)
      console.warn('  photo:    no owner-uploaded Places photos — skipping image');
    return null;
  }

  const photo = ownerPhotos[0];
  try {
    const url = `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=${PLACES_PHOTO_MAX_WIDTH_PX}&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      console.warn(`  photo fetch ${res.status} — skipping image`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const asset = await sanity.assets.upload('image', buffer, {
      filename: `${restaurantSlug}.${ext}`,
      contentType,
    });
    const { credit, creditUrl } = photoAttribution(photo, place);
    return { _id: asset._id, credit, creditUrl, sourcePhotoName: photo.name };
  } catch (err) {
    console.warn(`  photo upload failed: ${(err as Error).message} — skipping image`);
    return null;
  }
}

export interface GalleryAsset {
  _id: string;
  alt: string;
  credit: string | null;
  creditUrl: string | null;
}

const MAX_GALLERY = 3;

/**
 * Up to three owner photos, never the hero again.
 */
export async function importGalleryPhotos(
  place: Pick<Place, 'photos' | 'googleMapsUri'>,
  restaurantSlug: string,
  restaurantName: string,
  excludePhotoName?: string,
  sanity: SanityClient = defaultSanity
): Promise<GalleryAsset[]> {
  const candidates = (place.photos ?? [])
    .filter((p) => p?.name && p.name !== excludePhotoName)
    .filter((p) => isOwnerPhoto(p.authorAttributions?.[0]?.displayName, restaurantName))
    .slice(0, MAX_GALLERY);
  if (!candidates.length) return [];

  const out: GalleryAsset[] = [];
  for (const photo of candidates) {
    try {
      const url = `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=${PLACES_PHOTO_MAX_WIDTH_PX}&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) {
        console.warn(`  gallery photo ${out.length + 1} fetch ${res.status} — skipping`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get('content-type') ?? 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : 'jpg';
      const asset = await sanity.assets.upload('image', buffer, {
        filename: `${restaurantSlug}-gallery-${out.length + 1}.${ext}`,
        contentType,
      });
      const { credit, creditUrl } = photoAttribution(photo, place);
      out.push({
        _id: asset._id,
        alt: `${restaurantName} – Foto`,
        credit,
        creditUrl,
      });
    } catch (err) {
      console.warn(`  gallery photo upload failed: ${(err as Error).message} — skipping`);
    }
  }
  return out;
}

/**
 * Places sends its top tier open-ended (`startPrice: 100`, no `endPrice`);
 * requiring both bounds would drop nearly every fine-dining price.
 */
function buildPriceRange(pr?: Place['priceRange']) {
  if (!pr?.startPrice?.units) return null;
  const min = Number(pr.startPrice.units);
  if (Number.isNaN(min) || min <= 0) return null;
  const currency = pr.startPrice.currencyCode ?? pr.endPrice?.currencyCode ?? 'EUR';
  if (!pr.endPrice?.units) return { min, currency };
  const max = Number(pr.endPrice.units);
  if (Number.isNaN(max) || max <= 0) return { min, currency };
  return { min, max, currency };
}

interface BuildContext {
  bezirkRefId: string | null;
  ortsteil: string | null;
  photoAsset: PhotoAsset | null;
  galleryAssets: GalleryAsset[];
  categoryRefs: { _key: string; _type: 'reference'; _ref: string }[];
  slug: string;
}

/**
 * Google writes the locality as "Berlin" or "Berlin-Bezirk …"; the catalogue
 * uses the short form.
 */
export function normalizeAddress(address: string): string {
  return address.replace(/\bBerlin-Bezirk\s+[^,]+/g, 'Berlin');
}

function buildDoc(parsed: ParsedUrl, place: Place, mapsUrl: string, ctx: BuildContext) {
  const name = place.displayName?.text ?? parsed.name;
  const doc: { _id: string; _type: 'restaurant' } & Record<string, unknown> = {
    _id: `drafts.${randomUUID()}`,
    _type: 'restaurant',
    name,
    slug: { _type: 'slug', current: ctx.slug },
    isOpen: true,
    isClosed: false,
    lat: place.location?.latitude ?? parsed.lat,
    lng: place.location?.longitude ?? parsed.lng,
    mapsUrl: place.googleMapsUri ?? mapsUrl,
    googlePlaceId: place.id,
  };
  if (place.formattedAddress) doc.address = normalizeAddress(place.formattedAddress);
  if (place.websiteUri) doc.website = place.websiteUri;
  if (place.internationalPhoneNumber) doc.phone = place.internationalPhoneNumber;

  const cuisine = pickCuisine(place.types);
  if (cuisine) doc.cuisineType = cuisine;

  if (place.regularOpeningHours?.weekdayDescriptions?.length) {
    doc.openingHours = parseWeekdayDescriptions(place.regularOpeningHours.weekdayDescriptions);
  }
  const priceRange = buildPriceRange(place.priceRange);
  if (priceRange) doc.priceRange = priceRange;

  if (ctx.ortsteil) doc.district = ctx.ortsteil;
  if (ctx.bezirkRefId) {
    doc.bezirkRef = { _type: 'reference', _ref: ctx.bezirkRefId };
  }
  if (ctx.categoryRefs.length) doc.categories = ctx.categoryRefs;

  if (ctx.photoAsset) {
    const image: Record<string, unknown> = {
      _type: 'image',
      asset: { _type: 'reference', _ref: ctx.photoAsset._id },
    };
    if (ctx.photoAsset.credit) image.credit = ctx.photoAsset.credit;
    if (ctx.photoAsset.creditUrl) image.creditUrl = ctx.photoAsset.creditUrl;
    doc.image = image;
  }

  if (ctx.galleryAssets.length) {
    doc.gallery = ctx.galleryAssets.map((g) => {
      const item: Record<string, unknown> = {
        _key: randomUUID(),
        _type: 'image',
        asset: { _type: 'reference', _ref: g._id },
        alt: g.alt,
      };
      if (g.credit) item.credit = g.credit;
      if (g.creditUrl) item.creditUrl = g.creditUrl;
      return item;
    });
  }

  return doc;
}

export class ImportError extends Error {
  constructor(
    message: string,
    public hint?: string,
    /**
     * A known terminal outcome; batch runs skip it on resume.
     */
    public code?: 'duplicate'
  ) {
    super(message);
    this.name = 'ImportError';
  }
}

export interface RunImportOptions {
  uploadPhoto?: boolean;
  /**
   * Each gallery photo is a billed Place Photo call; bulk imports leave this
   * off and backfill later (backfill-gallery.ts).
   */
  uploadGallery?: boolean;
  duplicateCheck?: boolean;
  sanityClient?: SanityClient;
}

export interface RunImportResult {
  doc: { _id: string; _type: 'restaurant' } & Record<string, unknown>;
  place: Place;
  matchedName: string;
  ortsteil: string | null;
  bezirkRefId: string | null;
  photoAsset: PhotoAsset | null;
  canonicalUrl: string;
  categoryNames: string[];
}

export async function runImport(
  url: string,
  opts: RunImportOptions = {}
): Promise<RunImportResult> {
  const canonicalUrl = await resolveUrl(url);
  const parsed = parseMapsUrl(canonicalUrl);
  if (!parsed) {
    throw new ImportError(
      'Could not extract name + coordinates from this URL.',
      'URL must contain /place/{name}/ and @lat,lng — try the desktop "Share → Copy link" form.'
    );
  }
  return runImportFromParsed(parsed, canonicalUrl, opts);
}

/**
 * Batch entry for callers that already have name and coords.
 */
export async function runImportFromParsed(
  parsed: ParsedUrl,
  canonicalUrl: string,
  opts: RunImportOptions = {}
): Promise<RunImportResult> {
  if (!GOOGLE_API_KEY) throw new ImportError('GOOGLE_API_KEY is not set.');

  const sanity = opts.sanityClient ?? defaultSanity;
  if (!sanity.config().token) {
    throw new ImportError('An authenticated Sanity client is required.');
  }

  const uploadPhoto = opts.uploadPhoto !== false;
  const uploadGallery = uploadPhoto && opts.uploadGallery !== false;
  const duplicateCheck = opts.duplicateCheck !== false;

  const place = await searchPlace(parsed);
  if (!place) {
    throw new ImportError(
      'No Places match for that URL.',
      'Try a more specific URL or check the coordinates.'
    );
  }

  const matchedName = place.displayName?.text ?? parsed.name;

  // Dedupe on the Google Place ID: branches share a name, never a place_id.
  // Includes drafts.
  if (duplicateCheck) {
    const existing = await sanity.fetch<{ _id: string; name: string }[]>(
      `*[_type=="restaurant" && googlePlaceId == $placeId]{_id,name}`,
      { placeId: place.id }
    );
    if (existing.length) {
      const isDraft = existing[0]._id.startsWith('drafts.');
      throw new ImportError(
        `"${existing[0].name}" already exists in Sanity with the same Google Place ID (${existing[0]._id}).`,
        isDraft
          ? 'A draft for this place is already open — finish it in Studio.'
          : 'Edit the existing document instead.',
        'duplicate'
      );
    }
  }

  const ortsteil = findOrtsteil(place.addressComponents);
  const bezirkRefId = ortsteil ? await findBezirkRef(ortsteil, sanity) : null;

  const slug = await uniqueSlug(slugify(matchedName), ortsteil, sanity);
  const photoAsset = uploadPhoto ? await importPhoto(place, slug, matchedName, sanity) : null;
  const galleryAssets = uploadGallery
    ? await importGalleryPhotos(place, slug, matchedName, photoAsset?.sourcePhotoName, sanity)
    : [];

  const openingHours = place.regularOpeningHours?.weekdayDescriptions?.length
    ? parseWeekdayDescriptions(place.regularOpeningHours.weekdayDescriptions)
    : [];
  const categoryNames = inferCategories(place.types, openingHours);
  const categoryRefs = await lookupCategoryRefs(categoryNames, sanity);

  const doc = buildDoc(parsed, place, canonicalUrl, {
    bezirkRefId,
    ortsteil,
    photoAsset,
    galleryAssets,
    categoryRefs,
    slug,
  });

  return {
    doc,
    place,
    matchedName,
    ortsteil,
    bezirkRefId,
    photoAsset,
    canonicalUrl,
    categoryNames,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const noGallery = args.includes('--no-gallery');
  const url = args.find((a) => !a.startsWith('--'));
  if (!url) {
    console.error(
      'Usage: npx tsx scripts/import-from-url.ts <google-maps-url> [--dry-run] [--no-gallery]'
    );
    process.exit(1);
  }

  console.log(`→ Resolving: ${url}`);
  let result: RunImportResult;
  try {
    result = await runImport(url, { uploadPhoto: !dryRun, uploadGallery: !noGallery });
  } catch (err) {
    if (err instanceof ImportError) {
      console.error(`✗ ${err.message}`);
      if (err.hint) console.error(`  ${err.hint}`);
      process.exit(1);
    }
    throw err;
  }

  if (result.canonicalUrl !== url) console.log(`  canonical: ${result.canonicalUrl}`);
  console.log(`  matched: ${result.matchedName} (id=${result.place.id})`);
  if (result.place.types?.length)
    console.log(`  types:   ${result.place.types.slice(0, 4).join(', ')}`);
  if (result.ortsteil) {
    console.log(
      `  ortsteil: ${result.ortsteil}${result.bezirkRefId ? ` → ref ${result.bezirkRefId}` : ' (no bezirk doc)'}`
    );
  }
  if (result.photoAsset) console.log(`  photo:    uploaded ${result.photoAsset._id}`);
  else if (result.place.photos?.length)
    console.log(`  photo:    ${dryRun ? 'skipped (--dry-run)' : 'no usable owner photo'}`);
  else console.log(`  photo:    none on Places`);
  const galleryCount = Array.isArray(result.doc.gallery) ? result.doc.gallery.length : 0;
  if (galleryCount) console.log(`  gallery:  ${galleryCount} photos uploaded`);
  else if (noGallery && !dryRun) console.log('  gallery:  skipped (--no-gallery)');

  console.log(`\n→ Draft preview:\n${JSON.stringify(result.doc, null, 2)}\n`);

  if (dryRun) {
    console.log('--dry-run: skipping Sanity write');
    return;
  }

  const created = await defaultSanity.create(result.doc);
  const publishedId = created._id.replace(/^drafts\./, '');
  console.log(`✓ Draft created: ${created._id}`);
  console.log(`  Open in Studio:`);
  console.log(`    https://eat-this.sanity.studio/structure/restaurant;${publishedId}`);
  console.log(`  Next steps in the Studio: review address + cuisine, set bezirkRef,`);
  console.log(`  add description/tip/photo, then publish.`);
}

// Run main only when invoked directly. realpath because /tmp is /private/tmp on
// macOS.
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
function isCliEntry(): boolean {
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1] ?? '');
  } catch {
    return false;
  }
}
if (isCliEntry()) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
