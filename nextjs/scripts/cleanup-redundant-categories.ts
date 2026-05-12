/**
 * Strips redundant category refs from restaurants. Currently codifies one
 * rule: if a doc carries `fine-dining`, the `dinner` ref is redundant
 * (Fine Dining implies a dinner setting). Easy to extend with more
 * (implies → removes) tuples as conventions land.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/cleanup-redundant-categories.ts --dry-run
 *   npx tsx scripts/cleanup-redundant-categories.ts --apply
 *
 * Required env (in nextjs/.env.local):
 *   SANITY_API_WRITE_TOKEN  (Editor role)
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'

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

// (implying-slug → redundant-slug) — when the implying category is present
// the redundant ref gets removed. The slugs reference category docs by
// slug.current; the script resolves them to _ids at runtime.
const REDUNDANCY_RULES: Array<{ implies: string; redundant: string }> = [
  { implies: 'fine-dining', redundant: 'dinner' },
]

interface CategoryRow { _id: string; slug: string }
interface Restaurant {
  _id: string
  name: string
  categoryRefs: string[]
}

async function main() {
  const opts = parseArgs()

  const cats = await sanity.fetch<CategoryRow[]>(
    `*[_type == "category"]{ _id, "slug": slug.current }`,
  )
  const slugToId = new Map(cats.map(c => [c.slug, c._id]))

  let removed = 0
  let touched = 0

  for (const rule of REDUNDANCY_RULES) {
    const impliesId = slugToId.get(rule.implies)
    const redundantId = slugToId.get(rule.redundant)
    if (!impliesId || !redundantId) {
      console.warn(`⚠️  Missing category: ${rule.implies} → ${rule.redundant}; skipping rule.`)
      continue
    }

    const hits = await sanity.fetch<Restaurant[]>(
      `*[_type == "restaurant" && !(_id in path("drafts.**"))
        && $impliesId in categories[]._ref
        && $redundantId in categories[]._ref
      ]{ _id, name, "categoryRefs": categories[]._ref } | order(name asc)`,
      { impliesId, redundantId },
    )

    console.log(`\n▶ Rule: has "${rule.implies}" → drop "${rule.redundant}" — ${hits.length} match(es)`)

    for (const r of hits) {
      const before = r.categoryRefs
      const after = before.filter(ref => ref !== redundantId)
      process.stdout.write(`  → ${r.name} (${before.length} → ${after.length} cats) … `)
      if (opts.dryRun) {
        console.log('would patch')
      } else {
        try {
          await sanity
            .patch(r._id)
            .unset([`categories[_ref=="${redundantId}"]`])
            .commit()
          console.log('patched')
        } catch (err) {
          console.log(`ERROR ${(err as Error).message}`)
          continue
        }
      }
      removed++
      touched++
    }
  }

  console.log(
    `\n✅ ${touched} doc(s) ${opts.dryRun ? 'would be' : 'were'} touched, ${removed} redundant ref(s) ${opts.dryRun ? 'would be' : 'were'} removed`,
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
