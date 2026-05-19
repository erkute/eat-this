/**
 * Applies Voice-B v2 Wave 46 content to 5 restaurants.
 * Reads /tmp/wave46-outputs.json and patches published documents directly.
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { createClient } from '@sanity/client'
import { readFileSync } from 'node:fs'

const sanity = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

const SLUG_TO_DOC_ID: Record<string, string> = {
  'saveur-de-banh-mi-mitte': '6a5d9b14-2bca-4fef-817d-ea699368fe2f',
  'schuesseldienst':         'restaurant-sch-sseldienst',
  'sfera':                   'restaurant-sfera',
  'shodo-udon-lab':          'restaurant-sh-do-udon-lab',
  'slice-society':           'dbad8bf5-ea17-4f59-b28a-60d7a7ebe85c',
}

interface Output {
  description: string; tip: string; shortDescription: string
  descriptionEn: string; tipEn: string; shortDescriptionEn: string
  seo: { metaTitle: string; metaDescription: string; metaTitleEn: string; metaDescriptionEn: string }
}

async function main() {
  const apply = process.argv.includes('--apply')
  const dryRun = !apply
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}\n`)
  const outputs: Record<string, Output> = JSON.parse(readFileSync('/tmp/wave46-outputs.json', 'utf8'))
  for (const [slug, content] of Object.entries(outputs)) {
    const id = SLUG_TO_DOC_ID[slug]
    if (!id) { console.log(`  ✗ ${slug}: unknown slug, skipping`); continue }
    process.stdout.write(`  ${dryRun ? 'would patch' : 'patching   '} ${slug.padEnd(30)} (${id}) … `)
    if (dryRun) { console.log('ok'); continue }
    try {
      await sanity.patch(id).set({
        description: content.description, tip: content.tip, shortDescription: content.shortDescription,
        descriptionEn: content.descriptionEn, tipEn: content.tipEn, shortDescriptionEn: content.shortDescriptionEn,
        seo: content.seo,
      }).commit()
      console.log('done')
    } catch (e) { console.log(`ERROR ${(e as Error).message}`) }
  }
}
main().catch(e => { console.error(e); process.exit(1) })
