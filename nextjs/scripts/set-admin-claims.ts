/**
 * Provision the `admin: true` Firebase custom claim for trusted operators.
 *
 * This is the authoritative admin signal checked by isAdminToken() in
 * lib/firebase/entitlements.ts. The verified-email-in-ADMIN_EMAILS path is
 * only a bootstrap fallback; setting the claim is the durable mechanism and
 * removes any dependence on the (mutable) email field.
 *
 * Reads ADMIN_EMAILS from the environment and sets the claim for each user
 * whose account has a VERIFIED matching email. Refuses to grant admin to an
 * unverified account — that would re-open the very hole this fixes.
 *
 * Run from `nextjs/` (needs FIREBASE_ADMIN_* in .env.local):
 *   npx tsx scripts/set-admin-claims.ts            # apply to ADMIN_EMAILS
 *   npx tsx scripts/set-admin-claims.ts a@b.com    # apply to a specific email
 *   npx tsx scripts/set-admin-claims.ts --revoke a@b.com
 *
 * Note: the user must obtain a fresh ID token (re-login, or wait up to ~1h
 * for token refresh) before the new claim takes effect on the API.
 */
import { config as loadEnv } from 'dotenv'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

loadEnv({ path: '.env.local' })

initializeApp({
  credential: cert({
    projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
    privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  }),
})

const auth = getAuth()

function adminEmailsFromEnv(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

async function main() {
  const args   = process.argv.slice(2)
  const revoke = args.includes('--revoke')
  const explicit = args.filter((a) => a !== '--revoke').map((s) => s.toLowerCase())
  const emails = explicit.length > 0 ? explicit : adminEmailsFromEnv()

  if (emails.length === 0) {
    console.error('No emails to process. Set ADMIN_EMAILS or pass an email argument.')
    process.exit(1)
  }

  for (const email of emails) {
    let user
    try {
      user = await auth.getUserByEmail(email)
    } catch {
      console.warn(`[skip] no account for ${email}`)
      continue
    }

    if (revoke) {
      const claims = { ...(user.customClaims ?? {}) }
      delete (claims as Record<string, unknown>).admin
      await auth.setCustomUserClaims(user.uid, claims)
      console.log(`[revoked] admin claim removed for ${email} (uid ${user.uid})`)
      continue
    }

    if (!user.emailVerified) {
      console.warn(`[refuse] ${email} is NOT email-verified — not granting admin`)
      continue
    }

    await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), admin: true })
    console.log(`[granted] admin claim set for ${email} (uid ${user.uid})`)
  }

  console.log('Done. Affected users must refresh their ID token (re-login) to pick up the claim.')
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1) })
