/**
 * Repair: ensure every existing welcome pack maps to 10 unique parent
 * restaurants. For users whose pack contains multiple mustEats with the
 * same parent, drop the duplicates and replace them with mustEats from
 * restaurants not yet in the user's pack.
 *
 * Invariant after this script:
 *   pack.mustEatIds       — 10 mustEats, one per restaurant
 *   entitlement.starter.restaurantIds — 10 unique IDs
 *   entitlement.starter.mustEatIds    — same 10 mustEatIds
 *
 * Map visibility derives from restaurantIds, so any extra mustEats at
 * those 10 restaurants become visible automatically.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/repair-welcome-pack-uniqueness.ts --dry-run
 *   npx tsx scripts/repair-welcome-pack-uniqueness.ts
 */
import { config as loadEnv } from 'dotenv'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@sanity/client'

loadEnv({ path: '.env.local' })
const DRY_RUN = process.argv.includes('--dry-run')

const TARGET = 10

const sanity = createClient({
  projectId:  'ehwjnjr2',
  dataset:    'production',
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

interface PoolRow { mustEatId: string; restaurantId: string | null }
interface ParentRow { _id: string; rid: string | null }

async function main() {
  console.log(`[repair-welcome-pack-uniqueness] dry-run=${DRY_RUN}`)

  // Pool of currently-eligible mustEats (image present, parent open)
  const pool = await sanity.fetch<PoolRow[]>(`
    *[_type == "mustEat" && defined(image.asset) && defined(restaurantRef._ref) && restaurantRef->isOpen != false]{
      "mustEatId": _id,
      "restaurantId": restaurantRef._ref
    }
  `)
  const byRestaurant = new Map<string, string[]>()
  for (const r of pool) {
    if (!r.restaurantId) continue
    if (!byRestaurant.has(r.restaurantId)) byRestaurant.set(r.restaurantId, [])
    byRestaurant.get(r.restaurantId)!.push(r.mustEatId)
  }

  const packs = (await db.collectionGroup('packs').get()).docs.filter((d) => d.id === 'welcome')

  let scanned        = 0
  let alreadyUnique  = 0
  let patched        = 0
  let skipped        = 0

  for (const packDoc of packs) {
    scanned++
    const uid    = packDoc.ref.parent.parent!.id
    const packMustEatIds: string[] = packDoc.data().mustEatIds || []
    if (packMustEatIds.length === 0) {
      console.warn(`  ${uid} → empty pack, skipping`)
      skipped++
      continue
    }

    const parents = await sanity.fetch<ParentRow[]>(
      `*[_type == "mustEat" && _id in $ids]{ _id, "rid": restaurantRef._ref }`,
      { ids: packMustEatIds },
    )
    const parentByMustEat = new Map(parents.map((p) => [p._id, p.rid]))

    // Keep the first mustEat seen per restaurant, drop the rest
    const keptByRestaurant = new Map<string, string>()
    for (const mid of packMustEatIds) {
      const rid = parentByMustEat.get(mid) ?? null
      if (!rid) continue
      if (!keptByRestaurant.has(rid)) keptByRestaurant.set(rid, mid)
    }
    const uniqueCount = keptByRestaurant.size

    if (uniqueCount === TARGET) {
      alreadyUnique++
      continue
    }

    const need = TARGET - uniqueCount
    const exclude = new Set(keptByRestaurant.keys())
    const candidates = [...byRestaurant.keys()].filter((rid) => !exclude.has(rid))
    if (candidates.length < need) {
      console.error(`  ${uid} → only ${candidates.length} fresh restaurants available, need ${need} — skipping`)
      skipped++
      continue
    }
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }
    const pickedRestaurants = candidates.slice(0, need)
    const addedMustEats = pickedRestaurants.map((rid) => {
      const eats = byRestaurant.get(rid)!
      return eats[Math.floor(Math.random() * eats.length)]
    })

    const finalMustEatIds    = [...keptByRestaurant.values(), ...addedMustEats]
    const finalRestaurantIds = [...keptByRestaurant.keys(),   ...pickedRestaurants]

    console.log(`  ${uid} → ${uniqueCount}/${TARGET} → +${need} (restaurants ${pickedRestaurants.join(',')})`)

    if (!DRY_RUN) {
      const packRef = packDoc.ref
      const entRef  = db.collection('users').doc(uid).collection('entitlements').doc('starter')
      await packRef.update({ mustEatIds: finalMustEatIds })
      await entRef.update({
        mustEatIds:    finalMustEatIds,
        restaurantIds: finalRestaurantIds,
      })
    }
    patched++
  }

  console.log(`\n[repair-welcome-pack-uniqueness] complete`)
  console.log(`  scanned:          ${scanned}`)
  console.log(`  already 10/10:    ${alreadyUnique}`)
  console.log(`  patched:          ${patched}${DRY_RUN ? ' (dry-run)' : ''}`)
  console.log(`  skipped:          ${skipped}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
