/**
 * One-shot bootstrap that translates published Restaurant + Bezirk DE prose
 * into EN drafts in Sanity. Idempotent: skips docs that already have a
 * non-empty `descriptionEn`. Drafts only — editorial publishes manually.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/bootstrap-en-translations.ts --dry-run
 *   npx tsx scripts/bootstrap-en-translations.ts --type restaurant --limit 1
 *   npx tsx scripts/bootstrap-en-translations.ts --type bezirk
 *
 * Required env (in nextjs/.env.local):
 *   ANTHROPIC_API_KEY
 *   SANITY_API_WRITE_TOKEN  (Editor role, sanity.io/manage → API → Tokens)
 */
import 'dotenv/config'
import { createClient } from '@sanity/client'
import Anthropic from '@anthropic-ai/sdk'

const SANITY_PROJECT_ID = 'ehwjnjr2'
const SANITY_DATASET = 'production'
const SANITY_API_VERSION = '2024-01-01'

type DocType = 'restaurant' | 'bezirk'

interface CliOptions {
  type: DocType | 'all'
  limit: number | null
  dryRun: boolean
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const opts: CliOptions = { type: 'all', limit: null, dryRun: false }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--dry-run') {
      opts.dryRun = true
    } else if (arg === '--limit') {
      opts.limit = parseInt(args[++i] ?? '', 10)
    } else if (arg === '--type') {
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

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}. Add it to nextjs/.env.local.`)
  return v
}

const sanity = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  token: requireEnv('SANITY_API_WRITE_TOKEN'),
  useCdn: false,
})

const anthropic = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') })

interface RestaurantSource {
  _id: string
  name: string
  description?: string
  descriptionEn?: string
  shortDescription?: string
  shortDescriptionEn?: string
  tip?: string
  tipEn?: string
  seo?: {
    metaTitle?: string
    metaTitleEn?: string
    metaDescription?: string
    metaDescriptionEn?: string
  }
}

interface BezirkSource {
  _id: string
  name: string
  description?: string
  descriptionEn?: string
}

async function fetchRestaurants(): Promise<RestaurantSource[]> {
  return sanity.fetch(
    `*[_type == "restaurant" && !(_id in path("drafts.**"))] {
      _id, name,
      description, descriptionEn,
      shortDescription, shortDescriptionEn,
      tip, tipEn,
      seo { metaTitle, metaTitleEn, metaDescription, metaDescriptionEn }
    }`,
  )
}

async function fetchBezirke(): Promise<BezirkSource[]> {
  return sanity.fetch(
    `*[_type == "bezirk" && !(_id in path("drafts.**"))] {
      _id, name, description, descriptionEn
    }`,
  )
}

async function main(): Promise<void> {
  const opts = parseArgs()
  console.log(`[bootstrap] type=${opts.type} limit=${opts.limit ?? 'all'} dryRun=${opts.dryRun}`)

  if (opts.type === 'restaurant' || opts.type === 'all') {
    const all = await fetchRestaurants()
    console.log(`[bootstrap] fetched ${all.length} restaurants`)
  }
  if (opts.type === 'bezirk' || opts.type === 'all') {
    const all = await fetchBezirke()
    console.log(`[bootstrap] fetched ${all.length} bezirke`)
  }
}

main().catch(err => {
  console.error('[bootstrap] FATAL:', err)
  process.exit(1)
})
