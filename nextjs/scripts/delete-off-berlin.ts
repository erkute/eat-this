/**
 * Hard-deletes restaurants whose address is outside Berlin proper.
 * One-off cleanup script — see memory: feedback-address-berlin-verify.
 *
 * Pre-checked: zero incoming references (no entitlements, no mustEats) for
 * all four IDs as of 2026-05-19.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/delete-off-berlin.ts --dry-run
 *   npx tsx scripts/delete-off-berlin.ts --apply
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { createClient } from '@sanity/client'

const sanity = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

const TARGETS: Array<{ id: string; name: string; address: string }> = [
  { id: '9e78812f-8715-4708-8775-c63cad65c6ba', name: 'Alte Überfahrt',     address: 'Werder/Havel 14542 (Brandenburg)' },
  { id: 'd487b6ac-b886-48f6-af53-5abf19190da5', name: 'Fuku Ramen',         address: 'Amsterdam, Netherlands' },
  { id: 'f508a0f5-e3a2-4ff9-b47b-668ff02d7780', name: 'Forsthaus Strelitz', address: 'Neustrelitz 17235 (Mecklenburg-Vorpommern)' },
  { id: 'fed75328-260c-4686-9c9c-fd1a1c907ab4', name: 'GARAGE du PONT',     address: 'Potsdam 14467 (Brandenburg)' },
]

async function main() {
  const apply = process.argv.includes('--apply')
  const dryRun = !apply
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}\n`)
  for (const t of TARGETS) {
    process.stdout.write(`  ${dryRun ? 'would delete' : 'deleting   '} ${t.name.padEnd(20)} (${t.id})  — ${t.address} … `)
    if (dryRun) { console.log('ok'); continue }
    try {
      await sanity.delete(t.id)
      await sanity.delete(`drafts.${t.id}`).catch(() => {})
      console.log('deleted')
    } catch (e) {
      console.log(`ERROR ${(e as Error).message}`)
    }
  }
}
main().catch(e => { console.error(e); process.exit(1) })
