import { SITE_URL } from '@/lib/constants'

// Canonical share link. Direct www host (SITE_URL) avoids the apex→www 308 on click.
export function buildReferralLink(uid: string): string {
  return `${SITE_URL}/?ref=${uid}`
}
