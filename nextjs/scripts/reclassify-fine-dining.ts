/**
 * Reclassifies Berlin's Michelin-starred restaurants into the `fine-dining`
 * category. For each slug in the list:
 *   - adds `fine-dining` ref if missing
 *   - removes `dinner` ref if present
 *   - removes `lunch` ref if present
 *   - keeps `drinks` and any other refs as-is
 *
 * Patches the published doc AND any matching draft. Idempotent.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/reclassify-fine-dining.ts --dry-run
 *   npx tsx scripts/reclassify-fine-dining.ts --apply
 *
 * Required env (in nextjs/.env.local):
 *   SANITY_API_WRITE_TOKEN  (Editor role)
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'
import { randomUUID } from 'node:crypto'

loadEnv({ path: '.env.local' })

const sanity = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: (() => {
    const t = process.env.SANITY_API_WRITE_TOKEN
    if (!t) throw new Error('Missing SANITY_API_WRITE_TOKEN in .env.local')
    return t
  })(),
  useCdn: false,
})

// Berlin Michelin-starred restaurants (2026 guide). CODA is already in
// fine-dining only, so it's omitted here.
const STAR_SLUGS = [
  'rutz',
  'facil',
  'restaurant-horvath',
  'lorenz-adlon-esszimmer',
  'restaurant-tim-raue',
  'bieberbau',
  'bonvivant-cocktail-bistro',
  'restaurant-bricole',
  'cookies-cream',
  'golvet',
  'hallmann-und-klee',
  'hugos-restaurant-private-dining',
  'irma-la-douce',
  'loumi',
  'matthias-restaurant',
  'nobelhart-schmutzig',
  'pars-restaurant',
  'skykitchen',
  'speiselokal-tulus-lotrek',
] as const

interface CliOptions { dryRun: boolean; apply: boolean }
function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const opts: CliOptions = { dryRun: false, apply: false }
  for (const a of args) {
    if (a === '--dry-run') opts.dryRun = true
    else if (a === '--apply') opts.apply = true
    else throw new Error(`Unknown arg: ${a}`)
  }
  if (!opts.apply && !opts.dryRun) opts.dryRun = true
  if (opts.apply && opts.dryRun) throw new Error('Pass --apply or --dry-run, not both.')
  return opts
}

interface CategoryRow { _id: string; slug: string }
interface CategoryRef { _type: 'reference'; _ref: string; _key: string }
interface RestaurantDoc {
  _id: string
  name: string
  slug: string
  categories: CategoryRef[] | null
}

async function patchRestaurant(
  doc: RestaurantDoc,
  fineDiningId: string,
  dinnerId: string,
  lunchId: string,
  dryRun: boolean,
): Promise<{ changed: boolean; nextRefs: string[] }> {
  const current = doc.categories ?? []
  const hasFineDining = current.some(c => c._ref === fineDiningId)
  const hasDinner = current.some(c => c._ref === dinnerId)
  const hasLunch = current.some(c => c._ref === lunchId)

  if (hasFineDining && !hasDinner && !hasLunch) {
    return { changed: false, nextRefs: current.map(c => c._ref) }
  }

  const nextCategories: CategoryRef[] = []
  if (!hasFineDining) {
    nextCategories.push({ _type: 'reference', _ref: fineDiningId, _key: randomUUID().replace(/-/g, '').slice(0, 12) })
  }
  for (const c of current) {
    if (c._ref === dinnerId || c._ref === lunchId) continue
    nextCategories.push(c)
  }

  const nextRefs = nextCategories.map(c => c._ref)
  if (dryRun) return { changed: true, nextRefs }

  await sanity.patch(doc._id).set({ categories: nextCategories }).commit()
  return { changed: true, nextRefs }
}

async function main() {
  const opts = parseArgs()

  const cats = await sanity.fetch<CategoryRow[]>(
    `*[_type == "category" && slug.current in ["fine-dining","dinner","lunch"]]{ _id, "slug": slug.current }`,
  )
  const slugToId = new Map(cats.map(c => [c.slug, c._id]))
  const fineDiningId = slugToId.get('fine-dining')
  const dinnerId = slugToId.get('dinner')
  const lunchId = slugToId.get('lunch')
  if (!fineDiningId || !dinnerId || !lunchId) {
    throw new Error('Could not resolve one of the category ids (fine-dining/dinner/lunch).')
  }

  const slugList = STAR_SLUGS as readonly string[]
  const docs = await sanity.fetch<RestaurantDoc[]>(
    `*[_type == "restaurant" && slug.current in $slugs]{
      _id,
      name,
      "slug": slug.current,
      "categories": categories[]{_type, _ref, _key}
    } | order(slug asc, _id asc)`,
    { slugs: slugList },
  )

  const found = new Set(docs.map(d => d.slug))
  const missing = slugList.filter(s => !found.has(s))
  if (missing.length) {
    console.warn(`⚠️  ${missing.length} slug(s) not found in Sanity: ${missing.join(', ')}`)
  }

  console.log(`\nMode: ${opts.dryRun ? 'DRY-RUN' : 'APPLY'}`)
  console.log(`Targets: ${docs.length} doc(s) across ${new Set(docs.map(d => d.slug)).size} slug(s)`)
  console.log()

  let touched = 0
  for (const d of docs) {
    const isDraft = d._id.startsWith('drafts.')
    const tag = isDraft ? '[draft]' : '[live ]'
    const before = (d.categories ?? []).map(c => c._ref)
    const result = await patchRestaurant(d, fineDiningId, dinnerId, lunchId, opts.dryRun)
    if (!result.changed) {
      console.log(`  ${tag} ${d.slug.padEnd(36)} — already clean, skip`)
      continue
    }
    touched++
    const beforeLabels = labelize(before, fineDiningId, dinnerId, lunchId)
    const afterLabels = labelize(result.nextRefs, fineDiningId, dinnerId, lunchId)
    console.log(`  ${tag} ${d.slug.padEnd(36)} ${opts.dryRun ? 'would patch' : 'patched   '}  [${beforeLabels}] → [${afterLabels}]`)
  }

  console.log(`\n✅ ${touched} doc(s) ${opts.dryRun ? 'would be' : 'were'} ${opts.dryRun ? 'patched' : 'patched'}`)
  if (opts.dryRun) console.log(`Re-run with --apply to commit.`)
}

function labelize(refs: string[], fd: string, di: string, lu: string): string {
  return refs.map(r => r === fd ? 'fine-dining' : r === di ? 'dinner' : r === lu ? 'lunch' : 'other').join(', ') || '∅'
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
