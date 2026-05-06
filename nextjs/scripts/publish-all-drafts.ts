/**
 * Publishes all restaurant + bezirk drafts to live. Uses the manual transaction
 * pattern: createOrReplace(published-with-draft-content) + delete(draft) in
 * one atomic commit per doc.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/publish-all-drafts.ts --dry-run
 *   npx tsx scripts/publish-all-drafts.ts --type restaurant --limit 1
 *   npx tsx scripts/publish-all-drafts.ts --type all
 *
 * After this runs, eatthisdot.com starts serving the new descriptions on
 * next ISR refresh (≤ 1 hour) for restaurant + bezirk pages and at the
 * next sitemap regen for sitemap.xml.
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'

loadEnv({ path: '.env.local' })

const sanity = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: requireEnv('SANITY_API_WRITE_TOKEN'),
  useCdn: false,
})

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}. Add it to nextjs/.env.local.`)
  return v
}

type DocType = 'restaurant' | 'bezirk'

interface CliOptions {
  type: DocType | 'all'
  limit: number | null
  dryRun: boolean
}

function parseArgs(): CliOptions {
  const opts: CliOptions = { type: 'all', limit: null, dryRun: false }
  const args = process.argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--limit') opts.limit = parseInt(args[++i] ?? '', 10)
    else if (arg === '--type') {
      const v = args[++i]
      if (v !== 'restaurant' && v !== 'bezirk' && v !== 'all') {
        throw new Error(`--type must be restaurant|bezirk|all, got "${v}"`)
      }
      opts.type = v
    } else {
      throw new Error(`Unknown arg: ${arg}`)
    }
  }
  if (opts.limit !== null && (Number.isNaN(opts.limit) || opts.limit < 1)) {
    throw new Error(`--limit must be a positive integer`)
  }
  return opts
}

async function listDraftsToPublish(opts: CliOptions): Promise<Array<Record<string, unknown>>> {
  const typeFilter =
    opts.type === 'all'
      ? `(_type == "restaurant" || _type == "bezirk")`
      : `_type == "${opts.type}"`
  return sanity.fetch(
    `*[${typeFilter} && _id in path("drafts.**")]{...} | order(_type asc, name asc)`,
  )
}

async function publishOne(draft: Record<string, unknown>): Promise<void> {
  const draftId = draft._id as string
  const publishedId = draftId.replace(/^drafts\./, '')

  // Build the next-published doc from the draft's full content. Strip system
  // fields that Sanity manages itself; keep _type so the new doc retains its
  // schema binding.
  const publishedDoc: Record<string, unknown> = { ...draft, _id: publishedId }
  delete publishedDoc._rev
  delete publishedDoc._createdAt
  delete publishedDoc._updatedAt

  await sanity
    .transaction()
    .createOrReplace(publishedDoc as { _id: string; _type: string } & Record<string, unknown>)
    .delete(draftId)
    .commit({ autoGenerateArrayKeys: true })
}

async function main(): Promise<void> {
  const opts = parseArgs()
  console.log(`[publish] type=${opts.type} limit=${opts.limit ?? 'all'} dryRun=${opts.dryRun}`)

  let drafts = await listDraftsToPublish(opts)
  if (opts.limit !== null) drafts = drafts.slice(0, opts.limit)
  console.log(`[publish] found ${drafts.length} drafts to publish`)

  let published = 0
  let failed = 0

  for (const draft of drafts) {
    const draftId = draft._id as string
    const name = (draft.name as string) ?? '<unnamed>'
    const type = draft._type as string
    try {
      if (opts.dryRun) {
        console.log(`  → [${type}] ${name} (${draftId}) — would publish`)
      } else {
        await publishOne(draft)
        console.log(`  ✓ [${type}] ${name} → live`)
      }
      published++
    } catch (e) {
      console.error(`  ✗ [${type}] ${name} (${draftId}):`, e instanceof Error ? e.message : e)
      failed++
    }
  }

  console.log(`[publish] done — ${opts.dryRun ? 'would publish' : 'published'}: ${published}, failed: ${failed}`)
}

main().catch(err => {
  console.error('[publish] FATAL:', err)
  process.exit(1)
})
