// Mask an email address for display on unauthenticated surfaces.
//
// The checkout success page renders the buyer's email from a verified Stripe
// session. Anyone holding that session URL (referrer logs, shared screenshots,
// browser history) could otherwise read the full address. Masking keeps the UX
// signal without echoing recoverable PII:
// `dirtyersan@gmail.com` → `di•••@gmail.com`.
export function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at <= 0) return '•••'
  const local = email.slice(0, at)
  const domain = email.slice(at)
  const keep = local.length > 2 ? 2 : 1
  return `${local.slice(0, keep)}•••${domain}`
}
