// Enriches newly added restaurants with Google Places data (address, hours, website, cuisine)
// Usage:
//   set -a; source scripts/.env.local; set +a
//   node scripts/enrich-new-restaurants.mjs

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const SANITY_TOKEN = process.env.SANITY_TOKEN
const SANITY_PROJECT = 'ehwjnjr2'
const SANITY_DATASET = 'production'

if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY missing')
if (!SANITY_TOKEN) throw new Error('SANITY_TOKEN missing')

// Restaurants to enrich — name used for Places search, lat/lng for location bias
const TARGETS = [
  { _id: 'dbad8bf5-ea17-4f59-b28a-60d7a7ebe85c', name: 'Slice Society',            lat: 52.5289504, lng: 13.3949077 },
  { _id: 'cf08b319-c3cb-496d-abcb-34b73fb4db48', name: 'Bubar Crepes und Galettes', lat: 52.508476,  lng: 13.3103616, skipHours: true }, // hours bereits manuell
  { _id: '7ff02840-857e-4e8e-9c48-9839f1a0d2fd', name: 'Bursa Uludağ Kebapçısı',    lat: 52.4864751, lng: 13.3577537 },
  { _id: '9ab67a92-03bc-49f7-91d0-13232a8e46ea', name: 'ALL IN.',                   lat: 52.5324367, lng: 13.4121647 },
  { _id: 'ec1a1092-479d-4160-9f28-1eae53b1fd54', name: 'AERA',                      lat: 52.5023677, lng: 13.3276348 },
  { _id: 'a77d0d23-d218-4464-98ee-76086c57849b', name: "Romeo's Sandwiches",        lat: 52.4978,    lng: 13.4295    },
]

const TYPE_MAP = {
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
}

function pickCuisine(types = []) {
  for (const t of types) if (TYPE_MAP[t]) return TYPE_MAP[t]
  return null
}

// Converts Google's weekdayDescriptions (localized) into Sanity daySlot[]
// Groups consecutive identical-hours days into ranges.
const DAY_ORDER = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const DAY_SHORT = { Montag: 'Mon', Dienstag: 'Tue', Mittwoch: 'Wed', Donnerstag: 'Thu', Freitag: 'Fri', Samstag: 'Sat', Sonntag: 'Sun' }

function parseWeekdayDescriptions(descs = []) {
  // Format: "Montag: 12:00–22:00" or "Montag: Geschlossen"
  const parsed = descs.map(d => {
    const [day, ...rest] = d.split(':')
    const hours = rest.join(':').trim()
    const isClosed = /geschlossen|closed/i.test(hours)
    const clean = isClosed ? 'closed' : hours
      .replace(/\u202F| /g, '')
      .replace(/–/g, '-')
      .replace(/Uhr/gi, '')
      .trim()
    return { day: day.trim(), hours: clean }
  })
  // Group consecutive days with same hours
  const ordered = DAY_ORDER.map(d => parsed.find(p => p.day === d)).filter(Boolean)
  const groups = []
  for (const slot of ordered) {
    const last = groups[groups.length - 1]
    if (last && last.hours === slot.hours) last.days.push(slot.day)
    else groups.push({ days: [slot.day], hours: slot.hours })
  }
  return groups.map((g, i) => ({
    _key: `hours-${i}`,
    _type: 'daySlot',
    days: g.days.length === 1
      ? DAY_SHORT[g.days[0]]
      : `${DAY_SHORT[g.days[0]]}-${DAY_SHORT[g.days[g.days.length - 1]]}`,
    hours: g.hours,
  }))
}

async function searchPlace(t) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.types,places.formattedAddress,places.websiteUri,places.regularOpeningHours,places.editorialSummary',
    },
    body: JSON.stringify({
      textQuery: t.name,
      languageCode: 'de',
      locationBias: {
        circle: { center: { latitude: t.lat, longitude: t.lng }, radius: 300 },
      },
    }),
  })
  if (!res.ok) throw new Error(`Places ${res.status}: ${await res.text()}`)
  return res.json()
}

async function patchSanity(_id, patch) {
  const body = { mutations: [{ patch: { id: _id, set: patch } }] }
  const url = `https://${SANITY_PROJECT}.api.sanity.io/v2024-01-01/data/mutate/${SANITY_DATASET}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SANITY_TOKEN}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Sanity ${res.status}: ${await res.text()}`)
  return res.json()
}

async function main() {
  for (const t of TARGETS) {
    console.log(`\n→ ${t.name}`)
    const data = await searchPlace(t)
    const place = data.places?.[0]
    if (!place) {
      console.log('  NOT FOUND')
      continue
    }

    const patch = {}
    if (place.formattedAddress) patch.address = place.formattedAddress
    if (place.websiteUri) patch.website = place.websiteUri
    const cuisine = pickCuisine(place.types)
    if (cuisine) patch.cuisineType = cuisine
    if (place.editorialSummary?.text) patch.shortDescription = place.editorialSummary.text.slice(0, 160)
    if (!t.skipHours && place.regularOpeningHours?.weekdayDescriptions?.length) {
      patch.openingHours = parseWeekdayDescriptions(place.regularOpeningHours.weekdayDescriptions)
    }

    console.log('  types:', place.types?.slice(0, 4).join(', '))
    console.log('  patch:', JSON.stringify(patch, null, 2))

    if (Object.keys(patch).length === 0) {
      console.log('  nothing to patch')
      continue
    }
    await patchSanity(t._id, patch)
    console.log('  ✓ patched')
    await new Promise(r => setTimeout(r, 200))
  }
  console.log('\nDone.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
