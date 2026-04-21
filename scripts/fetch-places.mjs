// Fetches cuisine type + description from Google Places for all Sanity restaurants
// Usage: node scripts/fetch-places.mjs
// Saves results to scripts/places-results.json

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const SANITY_PROJECT = 'ehwjnjr2'
const SANITY_DATASET = 'production'

// Maps Google place types → clean cuisineType string
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
  restaurant: null, // too generic, skip
}

function extractSearchQuery(mapsUrl) {
  try {
    const url = new URL(mapsUrl)
    if (url.pathname.includes('/search/')) {
      return decodeURIComponent(url.searchParams.get('query') || '')
    }
    if (url.pathname.includes('/place/')) {
      const parts = url.pathname.split('/')
      const placeIdx = parts.indexOf('place')
      if (placeIdx >= 0 && parts[placeIdx + 1]) {
        return decodeURIComponent(parts[placeIdx + 1].replace(/\+/g, ' '))
      }
    }
  } catch {}
  return null
}

function pickCuisineType(types) {
  for (const t of types) {
    if (TYPE_MAP[t]) return TYPE_MAP[t]
  }
  return null
}

async function fetchFromSanity() {
  const query = encodeURIComponent('*[_type == "restaurant"]{_id, name, mapsUrl}')
  const url = `https://${SANITY_PROJECT}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${query}`
  const res = await fetch(url)
  const json = await res.json()
  return json.result
}

async function searchPlace(query) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.types,places.editorialSummary,places.displayName',
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: 'de',
      locationBias: {
        circle: {
          center: { latitude: 52.52, longitude: 13.405 },
          radius: 30000,
        },
      },
    }),
  })
  return res.json()
}

async function main() {
  console.log('Fetching restaurants from Sanity...')
  const restaurants = await fetchFromSanity()
  console.log(`Found ${restaurants.length} restaurants\n`)

  const results = []
  let success = 0, failed = 0

  for (let i = 0; i < restaurants.length; i++) {
    const r = restaurants[i]
    const query = extractSearchQuery(r.mapsUrl)
    if (!query) {
      console.log(`[${i + 1}/${restaurants.length}] SKIP (no query): ${r.name}`)
      failed++
      continue
    }

    try {
      const data = await searchPlace(query)
      const place = data.places?.[0]
      if (!place) {
        console.log(`[${i + 1}/${restaurants.length}] NOT FOUND: ${r.name}`)
        failed++
        results.push({ _id: r._id, name: r.name, cuisineType: null, description: null })
        continue
      }

      const cuisineType = pickCuisineType(place.types || [])
      const description = place.editorialSummary?.text || null

      console.log(`[${i + 1}/${restaurants.length}] ✓ ${r.name} → ${cuisineType || '?'} | ${description ? description.slice(0, 60) + '…' : 'no description'}`)
      results.push({ _id: r._id, name: r.name, cuisineType, description, rawTypes: place.types })
      success++
    } catch (e) {
      console.log(`[${i + 1}/${restaurants.length}] ERROR: ${r.name} — ${e.message}`)
      failed++
    }

    // Rate limiting — stay well under 10 req/sec
    await new Promise(r => setTimeout(r, 150))
  }

  const fs = await import('fs')
  fs.writeFileSync(
    '/Users/ersane/Downloads/Projekte/Eat This/scripts/places-results.json',
    JSON.stringify(results, null, 2)
  )

  console.log(`\nDone: ${success} found, ${failed} failed`)
  console.log('Results saved to scripts/places-results.json')
}

main().catch(console.error)
