/**
 * Translates news article DE content (titleDe, excerptDe, categoryLabelDe,
 * contentDe Portable Text body, seo.metaTitle/metaDescription) into the EN
 * fields. Idempotent: skips articles where `title` is already filled.
 *
 * Portable Text translation strategy: extract every translatable text span
 * (block.children[].text + image.alt + image.caption) into a flat list, send
 * to Claude as a JSON array, get a parallel JSON array back, then re-inject
 * into a structural deep-clone of contentDe. This decouples translation from
 * structure: marks, markDefs (links), styles (h2/h3/blockquote), image asset
 * refs and _key values are preserved verbatim.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/translate-news-articles.ts --dry-run
 *   npx tsx scripts/translate-news-articles.ts --limit 1
 *   npx tsx scripts/translate-news-articles.ts
 *
 * Required env (in nextjs/.env.local):
 *   ANTHROPIC_API_KEY
 *   SANITY_API_WRITE_TOKEN  (Editor role)
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'
import Anthropic from '@anthropic-ai/sdk'

loadEnv({ path: '.env.local' })

const SANITY_PROJECT_ID = 'ehwjnjr2'
const SANITY_DATASET = 'production'
const SANITY_API_VERSION = '2024-01-01'
const MODEL = 'claude-sonnet-4-6'

interface CliOptions {
  limit: number | null
  dryRun: boolean
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const opts: CliOptions = { limit: null, dryRun: false }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--limit') opts.limit = parseInt(args[++i] ?? '', 10)
    else throw new Error(`Unknown arg: ${arg}`)
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

// ── Sanity types ────────────────────────────────────────────────────────────

interface PtSpan {
  _type: 'span'
  _key?: string
  text: string
  marks?: string[]
}

interface PtBlock {
  _type: 'block'
  _key?: string
  style?: string
  children: PtSpan[]
  markDefs?: Array<Record<string, unknown>>
  listItem?: string
  level?: number
}

interface PtImage {
  _type: 'image'
  _key?: string
  asset?: { _ref: string; _type: string }
  alt?: string
  caption?: string
  hotspot?: unknown
  crop?: unknown
}

type PtNode = PtBlock | PtImage | Record<string, unknown>

interface NewsArticleSource {
  _id: string
  titleDe?: string
  title?: string
  excerptDe?: string
  excerpt?: string
  categoryLabelDe?: string
  categoryLabel?: string
  contentDe?: PtNode[]
  content?: PtNode[]
  seo?: {
    metaTitle?: string
    metaTitleEn?: string
    metaDescription?: string
    metaDescriptionEn?: string
  }
}

// Idempotent: skip articles where `title` (EN) is already non-empty in either
// the published doc OR an existing draft. Without the draft check, re-runs
// would re-translate every doc whose translation lives only in the draft.
async function fetchArticles(): Promise<NewsArticleSource[]> {
  return sanity.fetch(
    `*[_type == "newsArticle" && !(_id in path("drafts.**"))
        && (!defined(title) || title == "")
        && !defined(*[_id == "drafts." + ^._id][0].title)]{...} | order(date desc)`,
  )
}

// ── Translatable string extraction ─────────────────────────────────────────

interface TextRef {
  source: 'block' | 'imageAlt' | 'imageCaption'
  blockIndex: number
  spanIndex?: number
  text: string
}

function extractTexts(content: PtNode[]): TextRef[] {
  const refs: TextRef[] = []
  content.forEach((node, blockIndex) => {
    if (node._type === 'block') {
      const block = node as PtBlock
      block.children?.forEach((child, spanIndex) => {
        if (child._type === 'span' && typeof child.text === 'string' && child.text.length > 0) {
          refs.push({ source: 'block', blockIndex, spanIndex, text: child.text })
        }
      })
    } else if (node._type === 'image') {
      const img = node as PtImage
      if (typeof img.alt === 'string' && img.alt.length > 0) {
        refs.push({ source: 'imageAlt', blockIndex, text: img.alt })
      }
      if (typeof img.caption === 'string' && img.caption.length > 0) {
        refs.push({ source: 'imageCaption', blockIndex, text: img.caption })
      }
    }
  })
  return refs
}

function injectTexts(content: PtNode[], refs: TextRef[], translations: string[]): PtNode[] {
  if (refs.length !== translations.length) {
    throw new Error(`Translation count mismatch: ${refs.length} refs vs ${translations.length} translations`)
  }
  // Deep clone via JSON round-trip — safe here because PT is plain JSON-serializable.
  const cloned = JSON.parse(JSON.stringify(content)) as PtNode[]
  refs.forEach((ref, i) => {
    const tr = translations[i]
    if (typeof tr !== 'string') throw new Error(`Translation at index ${i} is not a string`)
    const node = cloned[ref.blockIndex]
    if (ref.source === 'block') {
      const block = node as PtBlock
      const span = block.children[ref.spanIndex!]
      span.text = tr
    } else if (ref.source === 'imageAlt') {
      ;(node as PtImage).alt = tr
    } else if (ref.source === 'imageCaption') {
      ;(node as PtImage).caption = tr
    }
  })
  return cloned
}

// ── Anthropic calls ─────────────────────────────────────────────────────────

const TRANSLATION_PROMPT = `Du übersetzt Texte für "Eat This Berlin", einen kuratierten Berliner Food-Guide, vom Deutschen ins Englische.

Brand-Voice: direkt, persönlich, opinionated. Klingt wie eine Berliner Food-Autorin die Empfehlungen gibt — kein Tourismus-Sprech, kein "discover", kein "must-try", kein "hidden gem". Idiomatisches, natürliches Englisch (American/British neutral).

WICHTIG:
- Eigennamen NICHT übersetzen: Restaurantnamen, Bezirksnamen, Straßennamen, Dish-Eigennamen (Döner, Currywurst, Kebab, Borek), Personen, deutsche Marken/Adressen.
- Berlin-spezifische Begriffe behalten oder Englisch erklären, je nachdem was natürlicher ist (z.B. "Späti" → "Späti (corner shop)" beim ersten Auftauchen, danach "Späti").
- Ton 1:1 spiegeln. Wenn DE locker und mit Witz, dann EN auch. Wenn DE direkt, dann EN auch.
- KEINE Erklärungen, KEINE Markdown-Codeblöcke. Nur das geforderte Output-Format.`

interface ContentBlock { type: 'text'; text: string }

function extractJsonText(content: ContentBlock[]): string {
  const block = content.find(b => b.type === 'text')
  if (!block) throw new Error('No text block in response')
  return block.text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

async function translateStrings(strings: string[], context: string): Promise<string[]> {
  if (strings.length === 0) return []
  const userMsg = `Übersetze die folgenden ${strings.length} deutschen Strings ins Englische. Behalte die Reihenfolge, gib genau ${strings.length} Übersetzungen zurück.

KONTEXT: ${context}

INPUT (JSON-Array):
${JSON.stringify(strings, null, 2)}

OUTPUT (nur das JSON-Array der Übersetzungen, gleiche Länge, gleiche Reihenfolge):`

  const callOnce = async (extra = '') => {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: TRANSLATION_PROMPT,
      messages: [{ role: 'user', content: userMsg + extra }],
    })
    const parsed = JSON.parse(extractJsonText(msg.content as ContentBlock[])) as unknown
    if (!Array.isArray(parsed)) throw new Error('Translation result is not an array')
    if (parsed.length !== strings.length) {
      throw new Error(`Length mismatch: expected ${strings.length}, got ${parsed.length}`)
    }
    return parsed.map((v, i) => {
      if (typeof v !== 'string') throw new Error(`Translation at index ${i} is not a string`)
      return v
    })
  }

  try {
    return await callOnce()
  } catch (err) {
    if (err instanceof SyntaxError) {
      // Model wrapped in markdown or wrote prose — retry with stricter reminder.
      return await callOnce('\n\nWICHTIG: Antworte AUSSCHLIESSLICH mit dem JSON-Array. Keine Prosa, kein Markdown-Fence.')
    }
    throw err
  }
}

interface SeoTranslation {
  metaTitleEn: string
  metaDescriptionEn: string
}

async function translateSeo(
  metaTitleDe: string | undefined,
  metaDescriptionDe: string | undefined,
  fallbackTitleEn: string,
  fallbackExcerptEn: string,
): Promise<SeoTranslation> {
  // Source: prefer existing DE seo strings, fall back to translated EN title/excerpt.
  // Length budgets: metaTitle ≤ 60, metaDescription ≤ 160 (matches Sanity validation).
  const sourceTitle = metaTitleDe || fallbackTitleEn
  const sourceDesc = metaDescriptionDe || fallbackExcerptEn

  const userMsg = `Erzeuge zwei englische SEO-Strings für einen News-Artikel auf "Eat This Berlin":
- metaTitleEn: prägnanter Click-Title, max 60 Zeichen
- metaDescriptionEn: klick-orientierter Snippet, max 160 Zeichen

QUELL-MATERIAL (DE oder existing EN):
- Titel-Quelle: ${JSON.stringify(sourceTitle)}
- Description-Quelle: ${JSON.stringify(sourceDesc)}

REGELN:
- Keine Werbe-Phrasen ("discover", "must-try", "hidden gem")
- Eigennamen unverändert
- Brand-Suffix " — Eat This Berlin" weglassen (zu wertvoll für Title-Platz)
- Halte die Limits HART: 60 und 160 Zeichen MAXIMAL.

Antworte AUSSCHLIESSLICH mit JSON-Objekt:
{"metaTitleEn": string, "metaDescriptionEn": string}`

  const callOnce = async (extra = '') => {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: TRANSLATION_PROMPT,
      messages: [{ role: 'user', content: userMsg + extra }],
    })
    const parsed = JSON.parse(extractJsonText(msg.content as ContentBlock[])) as SeoTranslation
    if (typeof parsed.metaTitleEn !== 'string' || typeof parsed.metaDescriptionEn !== 'string') {
      throw new Error('Invalid SEO translation shape')
    }
    return parsed
  }

  let parsed: SeoTranslation
  try {
    parsed = await callOnce()
  } catch (err) {
    if (err instanceof SyntaxError) {
      parsed = await callOnce('\n\nWICHTIG: Antworte AUSSCHLIESSLICH mit dem JSON-Objekt. Keine Prosa, kein Markdown.')
    } else {
      throw err
    }
  }

  // Length-violation retry — same trick as restaurant seo backfill.
  const offenders: string[] = []
  if (parsed.metaTitleEn.length > 60) {
    offenders.push(`metaTitleEn ist ${parsed.metaTitleEn.length} Zeichen, Limit 60`)
  }
  if (parsed.metaDescriptionEn.length > 160) {
    offenders.push(`metaDescriptionEn ist ${parsed.metaDescriptionEn.length} Zeichen, Limit 160`)
  }
  if (offenders.length > 0) {
    parsed = await callOnce(
      `\n\nDer letzte Versuch hat die HARTEN Limits verletzt:\n- ${offenders.join('\n- ')}\nKürze strikt unter die Limits. Antworte nur mit dem JSON-Objekt.`,
    )
    if (parsed.metaTitleEn.length > 60 || parsed.metaDescriptionEn.length > 160) {
      throw new Error(
        `SEO retry still over limit: title=${parsed.metaTitleEn.length}, desc=${parsed.metaDescriptionEn.length}`,
      )
    }
  }

  return parsed
}

// ── Orchestration ──────────────────────────────────────────────────────────

interface TranslatedArticle {
  title: string
  excerpt: string
  categoryLabel: string
  content: PtNode[]
  metaTitleEn: string
  metaDescriptionEn: string
}

async function translateArticle(a: NewsArticleSource): Promise<TranslatedArticle> {
  if (!a.titleDe) throw new Error(`Article ${a._id} has no titleDe — required`)

  // Translate the simple string fields in one batch for context cohesion.
  const headerStrings = [
    a.titleDe,
    a.excerptDe ?? '',
    a.categoryLabelDe ?? '',
  ]
  const headerTranslations = await translateStrings(
    headerStrings,
    'Header-Felder eines News-Artikels: title, excerpt (Teaser), categoryLabel.',
  )
  const [titleEn, excerptEn, categoryLabelEn] = headerTranslations

  // Translate the body Portable Text by extracting all spans + image alts/captions.
  let contentEn: PtNode[] = []
  if (a.contentDe && a.contentDe.length > 0) {
    const refs = extractTexts(a.contentDe)
    const bodyTranslations = await translateStrings(
      refs.map(r => r.text),
      `Fließtext-Spans des News-Artikels "${a.titleDe}". Erhalte die Sätze 1:1 in der Reihenfolge — die Übersetzungen werden in eine identische Block-Struktur zurückgemappt.`,
    )
    contentEn = injectTexts(a.contentDe, refs, bodyTranslations)
  }

  // Translate / generate SEO strings.
  const seo = await translateSeo(a.seo?.metaTitle, a.seo?.metaDescription, titleEn, excerptEn)

  return {
    title: titleEn,
    excerpt: excerptEn,
    categoryLabel: categoryLabelEn,
    content: contentEn,
    metaTitleEn: seo.metaTitleEn,
    metaDescriptionEn: seo.metaDescriptionEn,
  }
}

async function patchArticleDraft(a: NewsArticleSource, t: TranslatedArticle): Promise<void> {
  const draftId = `drafts.${a._id}`

  // Full-doc clone so the draft retains image, slug, date, contentDe, etc.
  await sanity.createIfNotExists({
    ...a,
    _id: draftId,
    _type: 'newsArticle',
  } as { _id: string; _type: 'newsArticle' } & Record<string, unknown>)

  // Two-await: setIfMissing seo parent, then set fields.
  await sanity
    .patch(draftId)
    .setIfMissing({ seo: {} })
    .set({
      title: t.title,
      excerpt: t.excerpt,
      categoryLabel: t.categoryLabel,
      content: t.content,
      'seo.metaTitleEn': t.metaTitleEn,
      'seo.metaDescriptionEn': t.metaDescriptionEn,
    })
    .commit({ autoGenerateArrayKeys: true })
}

async function main(): Promise<void> {
  const opts = parseArgs()
  console.log(`[translate-news] limit=${opts.limit ?? 'all'} dryRun=${opts.dryRun}`)

  let articles = await fetchArticles()
  if (opts.limit !== null) articles = articles.slice(0, opts.limit)
  console.log(`[translate-news] articles needing EN: ${articles.length}`)

  let ok = 0
  let failed = 0

  for (const a of articles) {
    try {
      console.log(`\n  • ${a.titleDe} (${a._id})`)
      const t = await translateArticle(a)
      console.log(`     title    [${t.title.length}]: ${t.title}`)
      console.log(`     excerpt  [${t.excerpt.length}]: ${t.excerpt.slice(0, 120)}${t.excerpt.length > 120 ? '…' : ''}`)
      console.log(`     catLabel: ${t.categoryLabel}`)
      console.log(`     content  : ${t.content.length} blocks`)
      console.log(`     metaT EN [${t.metaTitleEn.length}]: ${t.metaTitleEn}`)
      console.log(`     metaD EN [${t.metaDescriptionEn.length}]: ${t.metaDescriptionEn}`)
      if (!opts.dryRun) {
        await patchArticleDraft(a, t)
        console.log(`     → patched draft drafts.${a._id}`)
      }
      ok++
    } catch (e) {
      console.error(`     ✗ ${a._id}:`, e instanceof Error ? e.message : e)
      failed++
    }
  }

  console.log(`\n[translate-news] done — ok: ${ok}, failed: ${failed}`)
}

main().catch(err => {
  console.error('[translate-news] FATAL:', err)
  process.exit(1)
})
