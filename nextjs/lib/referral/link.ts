// Canonical share link. Direct www host avoids the apex→www 308 on click.
export function buildReferralLink(uid: string): string {
  return `https://www.eatthisdot.com/?ref=${uid}`
}
