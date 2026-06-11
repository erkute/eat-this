/**
 * Embeds the whole restaurant catalog with Voyage and writes the vectors to
 * lib/buddy/restaurant-embeddings.json (checked in as a static asset). Run this
 * once, and again whenever restaurant editorial content changes meaningfully.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/embed-restaurants.ts
 *
 * Required env (nextjs/.env.local):
 *   VOYAGE_API_KEY
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { embedBatched, VOYAGE_MODEL, VOYAGE_DIM } from '../lib/buddy/voyage'

loadEnv({ path: '.env.local' })

const client = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

interface Row {
  slug: string
  name: string
  cuisineType?: string
  bezirk?: string
  district?: string
  categories?: string[]
  shortDescription?: string
  tip?: string
}

const QUERY = `*[_type == "restaurant" && isOpen == true && isClosed != true && defined(slug.current)] | order(slug.current asc) {
  "slug": slug.current,
  name,
  cuisineType,
  "bezirk": bezirkRef->name,
  district,
  "categories": categories[defined(@->_id)]->name,
  shortDescription,
  tip
}`

// One compact text per spot — the fields a diner cares about. DE is the richest
// locale and Voyage is multilingual, so we embed the German text.
function embeddingText(r: Row): string {
  const parts = [
    r.name,
    r.cuisineType,
    r.bezirk ?? r.district,
    (r.categories ?? []).join(', '),
    r.shortDescription,
    r.tip,
  ].filter((p): p is string => Boolean(p && p.trim()))
  return parts.join('. ')
}

async function main() {
  if (!process.env.VOYAGE_API_KEY) {
    console.error('VOYAGE_API_KEY not set in nextjs/.env.local')
    process.exit(1)
  }
  console.log('Fetching restaurants from Sanity…')
  const rows = await client.fetch<Row[]>(QUERY)
  console.log(`  ${rows.length} restaurants`)

  const texts = rows.map(embeddingText)
  console.log(`Embedding via Voyage (${VOYAGE_MODEL}, ${VOYAGE_DIM}-dim), batched…`)
  const vecs = await embedBatched(texts, 'document', {
    onProgress: (done, total) => console.log(`  ${done}/${total}`),
  })

  const vectors: Record<string, number[]> = {}
  rows.forEach((r, i) => {
    // Round to 6 decimals — keeps cosine identical to 6+ sig-figs, ~30% smaller.
    vectors[r.slug] = vecs[i].map((x) => Math.round(x * 1e6) / 1e6)
  })

  const out = { model: VOYAGE_MODEL, dim: VOYAGE_DIM, count: rows.length, vectors }
  const path = join(process.cwd(), 'lib/buddy/restaurant-embeddings.json')
  writeFileSync(path, JSON.stringify(out))
  const kb = Math.round(JSON.stringify(out).length / 1024)
  console.log(`Wrote ${path} (${rows.length} vectors, ~${kb} KB)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
