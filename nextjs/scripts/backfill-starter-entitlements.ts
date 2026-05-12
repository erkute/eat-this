/**
 * One-time backfill: for every existing welcome pack, ensure a matching
 * starter entitlement exists at users/{uid}/entitlements/starter. The
 * restaurantIds are derived from the pack's existing mustEatIds so the
 * entitlement matches the user's visible cards.
 *
 * Idempotent — re-running on already-backfilled users is a no-op.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/backfill-starter-entitlements.ts --dry-run
 *   npx tsx scripts/backfill-starter-entitlements.ts
 *
 * Required env (in nextjs/.env.local):
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY
 */
import { config as loadEnv } from 'dotenv'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { createClient } from '@sanity/client'

loadEnv({ path: '.env.local' })

const DRY_RUN = process.argv.includes('--dry-run')

const SANITY_PROJECT_ID = 'ehwjnjr2'
const SANITY_DATASET    = 'production'

const sanity = createClient({
  projectId:  SANITY_PROJECT_ID,
  dataset:    SANITY_DATASET,
  apiVersion: '2024-01-01',
  useCdn:     true,
})

initializeApp({
  credential: cert({
    projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
    privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  }),
})

const db = getFirestore()

async function parentRestaurantIdsOf(mustEatIds: string[]): Promise<string[]> {
  if (mustEatIds.length === 0) return []
  const rows = await sanity.fetch<{ rid: string | null }[]>(
    `*[_type == "mustEat" && _id in $ids]{ "rid": restaurantRef._ref }`,
    { ids: mustEatIds },
  )
  return [...new Set(rows.map((r) => r.rid).filter((x): x is string => Boolean(x)))]
}

async function main() {
  console.log(`[backfill-starter-entitlements] dry-run=${DRY_RUN}`)

  // collectionGroup query pulls every doc in any subcollection named
  // 'packs'. That includes both users/{uid}/packs/welcome AND the legacy
  // userPacks/{uid}/packs/starter docs (from onUserCreate's first try
  // block). Filter to welcome packs by doc ID before processing.
  const snap = await db.collectionGroup('packs').get()
  const welcomePacks = snap.docs.filter((d) => d.id === 'welcome')

  let total                  = 0
  let alreadyHadEntitlement  = 0
  let backfilled             = 0
  let skippedEmptyPack       = 0

  for (const packDoc of welcomePacks) {
    total++
    const uid    = packDoc.ref.parent.parent!.id
    const entRef = db.collection('users').doc(uid).collection('entitlements').doc('starter')
    const entSnap = await entRef.get()

    if (entSnap.exists) {
      alreadyHadEntitlement++
      continue
    }

    const mustEatIds: string[] = packDoc.data().mustEatIds || []
    if (mustEatIds.length === 0) {
      skippedEmptyPack++
      console.warn(`  ${uid} → welcome pack has no mustEatIds, skipping`)
      continue
    }

    const restaurantIds = await parentRestaurantIdsOf(mustEatIds)

    if (DRY_RUN) {
      console.log(`  ${uid} → would write entitlement with ${restaurantIds.length} restaurants, ${mustEatIds.length} must-eats`)
    } else {
      await entRef.set({
        type:            'starter',
        slug:            null,
        restaurantIds,
        mustEatIds,
        purchasedAt:     FieldValue.serverTimestamp(),
        stripeSessionId: null,
        source:          'manual',
      })
      console.log(`  ${uid} → backfilled (${restaurantIds.length} restaurants, ${mustEatIds.length} must-eats)`)
    }
    backfilled++
  }

  console.log(`\n[backfill-starter-entitlements] complete`)
  console.log(`  total welcome packs:     ${total}`)
  console.log(`  already had entitlement: ${alreadyHadEntitlement}`)
  console.log(`  backfilled:              ${backfilled}${DRY_RUN ? ' (dry-run)' : ''}`)
  console.log(`  skipped (empty pack):    ${skippedEmptyPack}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
