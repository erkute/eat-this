/**
 * Applies Voice-B v2 Wave 45 content to 5 restaurants:
 * SAN / Sardinen Bar / 3× Saveur de Bánh Mì (Schöneberg, Charlottenburg, Kreuzberg).
 *
 * Reads /tmp/wave45-outputs.json (per-slug content) and patches the published
 * documents directly (no draft cycle).
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/apply-wave45.ts --dry-run
 *   npx tsx scripts/apply-wave45.ts --apply
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
  'san':                              'restaurant-san',
  'sardinen-bar':                     'restaurant-sardinen-bar',
  'saveur-de-banh-mi':                'restaurant-saveur-de-b-nh-m',
  'saveur-de-banh-mi-charlottenburg': '9fe4fd98-a957-44c9-b6e0-67c3d056c23b',
  'saveur-de-banh-mi-kreuzberg':      'a8edccef-8f9e-4f8d-a16b-901b4f9208db',
}

interface Output {
  description: string
  tip: string
  shortDescription: string
  descriptionEn: string
  tipEn: string
  shortDescriptionEn: string
  seo: {
    metaTitle: string
    metaDescription: string
    metaTitleEn: string
    metaDescriptionEn: string
  }
}

async function main() {
  const apply = process.argv.includes('--apply')
  const dryRun = !apply
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}\n`)
  const outputs: Record<string, Output> = JSON.parse(
    readFileSync('/tmp/wave45-outputs.json', 'utf8'),
  )
  for (const [slug, content] of Object.entries(outputs)) {
    const id = SLUG_TO_DOC_ID[slug]
    if (!id) { console.log(`  ✗ ${slug}: unknown slug, skipping`); continue }
    process.stdout.write(`  ${dryRun ? 'would patch' : 'patching   '} ${slug.padEnd(38)} (${id}) … `)
    if (dryRun) { console.log('ok'); continue }
    try {
      await sanity.patch(id).set({
        description: content.description,
        tip: content.tip,
        shortDescription: content.shortDescription,
        descriptionEn: content.descriptionEn,
        tipEn: content.tipEn,
        shortDescriptionEn: content.shortDescriptionEn,
        seo: content.seo,
      }).commit()
      console.log('done')
    } catch (e) {
      console.log(`ERROR ${(e as Error).message}`)
    }
  }
}
main().catch(e => { console.error(e); process.exit(1) })
