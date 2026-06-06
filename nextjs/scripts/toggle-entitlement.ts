/**
 * Dev/smoke helper: toggle a named entitlement on/off for a user.
 * Run twice to add then remove. Used to verify the live-refetch path
 * in MapSection — first run should make the map expand to show all
 * spots, second run should snap it back to the starter set.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/toggle-entitlement.ts user@example.com all-berlin
 *   npx tsx scripts/toggle-entitlement.ts user@example.com category italian
 */
import { config as loadEnv } from 'dotenv'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

loadEnv({ path: '.env.local' })

initializeApp({
  credential: cert({
    projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
    privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  }),
})

const auth = getAuth()
const db   = getFirestore()

const [, , email, kind, slug] = process.argv
if (!email || !kind) {
  console.error('Usage: toggle-entitlement.ts <email> <all-berlin|category|starter> [slug]')
  process.exit(1)
}
if (kind === 'category' && !slug) {
  console.error('category toggle needs a slug: toggle-entitlement.ts <email> category <slug>')
  process.exit(1)
}

async function main() {
  const user = await auth.getUserByEmail(email)
  const docId =
    kind === 'all-berlin' ? 'all-berlin'
  : kind === 'starter'    ? 'starter'
  :                          `category-${slug}`

  const ref = db.collection('users').doc(user.uid).collection('entitlements').doc(docId)
  const snap = await ref.get()

  if (snap.exists) {
    await ref.delete()
    console.log(`[toggle] REVOKED ${docId} for ${email} (uid ${user.uid})`)
  } else {
    await ref.set({
      type:            kind === 'all-berlin' ? 'all-berlin' : kind === 'category' ? 'category' : 'starter',
      slug:            kind === 'category' ? slug : null,
      restaurantIds:   [],
      mustEatIds:      [],
      purchasedAt:     FieldValue.serverTimestamp(),
      stripeSessionId: null,
      source:          'manual',
    })
    console.log(`[toggle] GRANTED ${docId} for ${email} (uid ${user.uid})`)
  }
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1) })
