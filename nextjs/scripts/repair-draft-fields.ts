/**
 * One-shot repair for drafts created by generate-de-descriptions.ts and
 * bootstrap-en-translations.ts before the GROQ-projection bug was fixed.
 *
 * Both scripts originally projected only the fields needed for the AI prompt,
 * then called createIfNotExists with that partial doc — so drafts ended up
 * missing image, gallery, slug, openingHours, isOpen/isClosed, bezirkRef,
 * mapsUrl, lastReviewed, reservationUrl, seo, *En fields, etc. Publishing
 * such a draft would replace the published doc and lose those fields.
 *
 * This script fetches each draft's corresponding published doc in full and
 * uses setIfMissing(...) to backfill missing keys without touching anything
 * the draft already has (description / shortDescription / tip / descriptionEn
 * etc. survive intact).
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/repair-draft-fields.ts --dry-run
 *   npx tsx scripts/repair-draft-fields.ts
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

interface CliOptions {
  dryRun: boolean
}

function parseArgs(): CliOptions {
  const opts: CliOptions = { dryRun: false }
  for (const arg of process.argv.slice(2)) {
    if (arg === '--dry-run') opts.dryRun = true
    else throw new Error(`Unknown arg: ${arg}`)
  }
  return opts
}

// Skip any underscore-prefixed key — Sanity convention for system/internal fields
// (_id, _rev, _createdAt, _updatedAt, _type, _system, future additions).
function isSystemKey(k: string): boolean {
  return k.startsWith('_')
}

interface DraftWithPublished {
  draftId: string
  publishedId: string
  type: 'restaurant' | 'bezirk'
  name: string
  draft: Record<string, unknown>
  published: Record<string, unknown> | null
}

async function listDraftsToRepair(): Promise<DraftWithPublished[]> {
  // All restaurant + bezirk drafts that exist
  const drafts = await sanity.fetch<Array<Record<string, unknown>>>(
    `*[(_type == "restaurant" || _type == "bezirk") && _id in path("drafts.**")] | order(name asc)`,
  )

  const result: DraftWithPublished[] = []
  for (const draft of drafts) {
    const draftId = draft._id as string
    const publishedId = draftId.replace(/^drafts\./, '')
    const published = await sanity.fetch<Record<string, unknown> | null>(
      `*[_id == $id][0]`,
      { id: publishedId },
    )
    result.push({
      draftId,
      publishedId,
      type: draft._type as 'restaurant' | 'bezirk',
      name: (draft.name as string) ?? '<unnamed>',
      draft,
      published,
    })
  }
  return result
}

function computeMissingFields(
  draft: Record<string, unknown>,
  published: Record<string, unknown>,
): Record<string, unknown> {
  const missing: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(published)) {
    if (isSystemKey(key)) continue
    if (value === undefined || value === null) continue
    if (draft[key] !== undefined && draft[key] !== null) continue
    missing[key] = value
  }
  return missing
}

async function repairDraft(item: DraftWithPublished, dryRun: boolean): Promise<{ filledKeys: string[] }> {
  if (!item.published) {
    return { filledKeys: [] } // orphan draft (no published source) — leave as-is
  }
  const missing = computeMissingFields(item.draft, item.published)
  const filledKeys = Object.keys(missing)
  if (filledKeys.length === 0) return { filledKeys }
  if (dryRun) return { filledKeys }
  await sanity.patch(item.draftId).setIfMissing(missing).commit({ autoGenerateArrayKeys: true })
  return { filledKeys }
}

async function main(): Promise<void> {
  const opts = parseArgs()
  console.log(`[repair] dryRun=${opts.dryRun}`)

  const items = await listDraftsToRepair()
  console.log(`[repair] found ${items.length} drafts (restaurant + bezirk combined)`)

  let repaired = 0
  let already = 0
  let orphan = 0
  let totalKeys = 0

  for (const item of items) {
    if (!item.published) {
      console.log(`  ⚠ ${item.name} (${item.draftId}): orphan — published doc missing, skipping`)
      orphan++
      continue
    }
    try {
      const { filledKeys } = await repairDraft(item, opts.dryRun)
      if (filledKeys.length === 0) {
        console.log(`  ✓ ${item.name} (${item.draftId}): already complete`)
        already++
      } else {
        console.log(`  ${opts.dryRun ? '→' : '✓'} ${item.name} (${item.draftId}): ${opts.dryRun ? 'would fill' : 'filled'} ${filledKeys.length} fields — ${filledKeys.join(', ')}`)
        repaired++
        totalKeys += filledKeys.length
      }
    } catch (e) {
      console.error(`  ✗ ${item.name} (${item.draftId}):`, e instanceof Error ? e.message : e)
    }
  }

  console.log(`[repair] done — repaired: ${repaired}, already complete: ${already}, orphans: ${orphan}, total fields filled: ${totalKeys}`)
}

main().catch(err => {
  console.error('[repair] FATAL:', err)
  process.exit(1)
})
