// Patches all restaurant documents with cuisineType, description and isOpen=true
// Usage: SANITY_TOKEN=xxx node scripts/patch-sanity.mjs
// If no token, uses read-only public API to verify + writes via mutations API

const PROJECT = 'ehwjnjr2'
const DATASET = 'production'
const TOKEN = process.env.SANITY_TOKEN

const results = JSON.parse(
  (await import('fs')).default.readFileSync(
    '/Users/ersane/Downloads/Projekte/Eat This/scripts/places-results.json',
    'utf8'
  )
)

if (!TOKEN) {
  console.error('Missing SANITY_TOKEN. Get one at https://www.sanity.io/manage → project → API → Tokens → Add API token (Editor role)')
  process.exit(1)
}

const MUTATION_URL = `https://${PROJECT}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}`

async function patchBatch(mutations) {
  const res = await fetch(MUTATION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({mutations}),
  })
  return res.json()
}

let patched = 0
const BATCH = 20

for (let i = 0; i < results.length; i += BATCH) {
  const chunk = results.slice(i, i + BATCH)
  const mutations = chunk.map(r => ({
    patch: {
      id: r._id,
      set: {
        isOpen: true,
        isClosed: false,
        ...(r.cuisineType ? {cuisineType: r.cuisineType} : {}),
        ...(r.description ? {shortDescription: r.description} : {}),
      },
    },
  }))

  const result = await patchBatch(mutations)
  if (result.error) {
    console.error('Error:', result.error)
    process.exit(1)
  }
  patched += chunk.length
  console.log(`Patched ${patched}/${results.length}...`)
}

console.log('\nDone! All restaurants updated.')
