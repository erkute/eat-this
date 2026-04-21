// scripts/generate-restaurant-slugs.js
// Generates slugs for all restaurants that don't have one yet.
// Uses the same slugify logic as studio/schemaTypes/restaurant.js
//
// Usage:
//   SANITY_TOKEN=<your-write-token> node scripts/generate-restaurant-slugs.js
//
// Get a write token at: https://www.sanity.io/manage/personal/project/ehwjnjr2/settings/api

import { createClient } from '@sanity/client'

const token = process.env.SANITY_TOKEN
if (!token) {
  console.error('Error: SANITY_TOKEN environment variable is required.')
  console.error('Get a token at: https://www.sanity.io/manage/personal/project/ehwjnjr2/settings/api')
  process.exit(1)
}

const client = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  console.log('Fetching restaurants without slugs…')
  const restaurants = await client.fetch(
    `*[_type == "restaurant" && !defined(slug.current)] { _id, name }`
  )
  console.log(`Found ${restaurants.length} restaurants without slugs.`)

  if (restaurants.length === 0) {
    console.log('Nothing to do.')
    return
  }

  // Deduplicate slugs within this batch
  const usedSlugs = new Set()
  const patches = []

  for (const r of restaurants) {
    let slug = slugify(r.name)
    if (!slug) slug = r._id.replace(/^restaurant-/, '')

    // If slug already taken in this batch, append a counter
    let candidate = slug
    let i = 2
    while (usedSlugs.has(candidate)) {
      candidate = `${slug}-${i++}`
    }
    usedSlugs.add(candidate)
    patches.push({ id: r._id, name: r.name, slug: candidate })
  }

  console.log('\nPatching documents…')
  let done = 0
  for (const { id, name, slug } of patches) {
    await client.patch(id).set({ slug: { _type: 'slug', current: slug } }).commit()
    done++
    console.log(`  [${done}/${patches.length}] ${name} → ${slug}`)
  }

  console.log(`\nDone. Generated slugs for ${done} restaurants.`)
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
