/**
 * One-shot repair for a corrupted category entitlement doc.
 *
 * Re-runs the Sanity query for the pack's category slug and writes the
 * correct mustEatIds + restaurantIds + slug back to the existing
 * entitlement doc. Idempotent — safe to re-run.
 *
 * Used to repair the post-deploy fallout of the 'finedining' vs
 * 'fine-dining' slug mismatch (Sanity uses hyphenated, our old catalog
 * used concatenated, so the GROQ query returned 0 mustEats).
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/repair-stripe-entitlement.ts user@example.com category-finedining
 */
import { config as loadEnv } from 'dotenv'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@sanity/client'
import { getPack } from '../lib/stripe-catalog'

loadEnv({ path: '.env.local' })

initializeApp({
  credential: cert({
    projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
    privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  }),
})

const sanity = createClient({
  projectId:  'ehwjnjr2',
  dataset:    'production',
  apiVersion: '2024-01-01',
  useCdn:     false,
})

async function main() {
  const [, , email, packId] = process.argv
  if (!email || !packId) {
    console.error('Usage: npx tsx scripts/repair-stripe-entitlement.ts <email> <packId>')
    process.exit(1)
  }

  const pack = getPack(packId)
  if (!pack) throw new Error(`Unknown packId: ${packId}`)
  if (pack.type !== 'category' || !pack.slug) {
    throw new Error('Repair only applies to category packs (with slug).')
  }

  const user = await getAuth().getUserByEmail(email)
  const ref  = getFirestore()
    .collection('users').doc(user.uid)
    .collection('entitlements').doc(packId)
  const snap = await ref.get()
  if (!snap.exists) throw new Error(`Entitlement ${packId} not found for ${email}`)

  const rows = await sanity.fetch<{ _id: string; rid: string | null }[]>(
    `*[_type == "mustEat" && defined(image.asset) && defined(restaurantRef._ref) && restaurantRef->isOpen != false && $slug in restaurantRef->categories[defined(@->_id)]->slug.current]{ _id, "rid": restaurantRef._ref }`,
    { slug: pack.slug },
  )
  const mustEatIds    = rows.map((r) => r._id)
  const restaurantIds = [...new Set(rows.map((r) => r.rid).filter((x): x is string => Boolean(x)))]

  // We allow 0 mustEats: map visibility uses the category slug, not the
  // mustEatIds set. Pack-reveal animation is empty but the unlocked
  // restaurants are still visible on the map.
  await ref.update({ slug: pack.slug, mustEatIds, restaurantIds })
  console.log(`✔ Repaired ${packId} for ${email}:`)
  console.log(`  slug          = ${pack.slug}`)
  console.log(`  mustEatIds    = ${mustEatIds.length}${mustEatIds.length === 0 ? '  (no mustEats curated yet)' : ''}`)
  console.log(`  restaurantIds = ${restaurantIds.length}`)
}

main().catch((e) => {
  console.error('✖', e instanceof Error ? e.message : e)
  process.exit(1)
})
