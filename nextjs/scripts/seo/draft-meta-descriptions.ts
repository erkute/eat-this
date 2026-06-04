/**
 * Holt die Editorial-Quellen (tip/shortDescription/description, DE+EN) der
 * Top-25-GSC-Seiten und schreibt ein Review-Markdown, in das die kuratierten
 * metaDescriptions (~150 Z., Curator-Voice) eingetragen werden. Publish
 * erfolgt separat via publish-meta-descriptions.ts NACH User-Review.
 *
 * Run from `nextjs/`:  npx tsx scripts/seo/draft-meta-descriptions.ts
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'
import { writeFileSync } from 'node:fs'

loadEnv({ path: '.env.local' })

// Top-25 nach GSC-Impressionen (API-Pull 2026-06-04, 45 Tage)
const SLUGS = [
  'sofi', 'material', 'gorilla-baeckerei-schoeneberg', 'kureme', 'amato',
  'feed-the-pony', 'fischer-lustig', 'vera', 'boii-boii', 'almi-bistro',
  'fuku-ramen', '136-berlin-restaurant', 'bistro-gri-gri', 'bardele',
  'beast-berlin', 'patakha', 'luna-doro', 'marktlokal', 'muret-la-barba',
  'lovis-restaurant', 'la-mezcla', 'kitchen-library',
  'der-weinlobbyist-restaurant-weinbar', 'vox-restaurant-bar', 'bob-thoms',
]

const sanity = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

async function main() {
  const docs: Array<{
    slug: string; name: string; tip?: string; tipEn?: string
    shortDescription?: string; shortDescriptionEn?: string
    description?: string; descriptionEn?: string
    metaDescription?: string; metaDescriptionEn?: string
  }> = await sanity.fetch(
    `*[_type == "restaurant" && slug.current in $slugs]{
      "slug": slug.current, name, tip, tipEn,
      shortDescription, shortDescriptionEn, description, descriptionEn,
      "metaDescription": seo.metaDescription, "metaDescriptionEn": seo.metaDescriptionEn
    }`,
    { slugs: SLUGS },
  )
  const bySlug = new Map(docs.map(d => [d.slug, d]))
  const missing = SLUGS.filter(s => !bySlug.has(s))
  if (missing.length) console.warn('NICHT GEFUNDEN:', missing.join(', '))

  const out = SLUGS.filter(s => bySlug.has(s)).map(slug => {
    const d = bySlug.get(slug)!
    return [
      `## ${slug}`,
      `**Name:** ${d.name}`,
      `**Quelle (tip):** ${d.tip ?? '—'}`,
      `**Quelle (tipEn):** ${d.tipEn ?? '—'}`,
      `**Quelle (short):** ${d.shortDescription ?? '—'}`,
      `**Quelle (desc, gekürzt):** ${(d.description ?? '—').slice(0, 300)}`,
      `**Quelle (descEn, gekürzt):** ${(d.descriptionEn ?? '—').slice(0, 300)}`,
      `**Bestehende metaDescription:** ${d.metaDescription ?? '—'}`,
      '', '```draft-de', d.metaDescription ?? '', '```',
      '```draft-en', d.metaDescriptionEn ?? '', '```', '',
    ].join('\n')
  })
  writeFileSync('../docs/superpowers/seo-meta-drafts.md',
    `# Top-25 metaDescription Drafts (Review vor Publish!)\n\n${out.join('\n')}`)
  console.log(`OK: ${docs.length} Restaurants → docs/superpowers/seo-meta-drafts.md`)
}

main()
