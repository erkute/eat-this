/**
 * Parst docs/superpowers/seo-meta-drafts.md und patcht die approveden
 * draft-de/draft-en-Blöcke auf seo.metaDescription/(En) der publizierten
 * Restaurant-Docs. Leere Blöcke werden übersprungen.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/seo/publish-meta-descriptions.ts --dry-run
 *   npx tsx scripts/seo/publish-meta-descriptions.ts
 * Required env: SANITY_API_WRITE_TOKEN (Editor)
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'
import { readFileSync } from 'node:fs'

loadEnv({ path: '.env.local' })

const DRY = process.argv.includes('--dry-run')
const TOKEN = process.env.SANITY_API_WRITE_TOKEN
if (!TOKEN && !DRY) throw new Error('SANITY_API_WRITE_TOKEN fehlt (.env.local)')

const sanity = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: TOKEN,
  useCdn: false,
})

function parse(md: string) {
  const sections = md.split(/^## /m).slice(1)
  return sections.map(sec => {
    const slug = sec.slice(0, sec.indexOf('\n')).trim()
    const de = sec.match(/```draft-de\n([\s\S]*?)```/)?.[1].trim() ?? ''
    const en = sec.match(/```draft-en\n([\s\S]*?)```/)?.[1].trim() ?? ''
    return { slug, de, en }
  })
}

async function main() {
  const drafts = parse(readFileSync('../docs/superpowers/seo-meta-drafts.md', 'utf8'))
    .filter(d => d.de || d.en)
  for (const d of drafts) {
    if (d.de.length > 170 || d.en.length > 170)
      throw new Error(`${d.slug}: Draft >170 Zeichen — kürzen statt publishen`)
    const id: string | null = await sanity.fetch(
      `*[_type == "restaurant" && slug.current == $slug && !(_id in path("drafts.**"))][0]._id`,
      { slug: d.slug },
    )
    if (!id) { console.warn(`SKIP ${d.slug}: kein publiziertes Doc`); continue }
    const set: Record<string, string> = {}
    if (d.de) set['seo.metaDescription'] = d.de
    if (d.en) set['seo.metaDescriptionEn'] = d.en
    console.log(`${DRY ? '[dry] ' : ''}${d.slug} ←`, Object.keys(set).join(', '))
    if (!DRY) await sanity.patch(id).set(set).commit()
  }
  console.log(`Fertig: ${drafts.length} Drafts verarbeitet.`)
}

main()
