// nextjs/lib/buddy/clientIp.ts
// Real client IP behind Firebase App Hosting. Verified empirically with a staging
// probe (2026-06-09): App Hosting appends THREE trusted segments to
// x-forwarded-for, so the header looks like
//   <client-supplied, spoofable…>, <REAL CLIENT IP>, <App Hosting ingress>, <GFE>
// The genuine client is therefore the 3rd hop FROM THE RIGHT; the last two are
// Google infra and the rightmost (GFE) IP even rotates per request — reading it
// (the old behaviour) hashed a shared, changing infra IP and bucketed every user
// together, so the per-IP limit did nothing. Anything a client spoofs lands left
// of the real IP and is ignored. Falls back to leftmost / x-real-ip when the
// shape is shorter than expected (e.g. local dev, no proxy chain).
//
// Lives in its own module (not route.ts) because Next.js route files may only
// export the HTTP handlers + route config — an extra named export fails the build.
export function clientIpFromXff(xff: string | null, xRealIp?: string | null): string | null {
  const hops = xff ? xff.split(',').map((h) => h.trim()).filter(Boolean) : []
  if (hops.length >= 3) return hops[hops.length - 3]
  if (hops.length > 0) return hops[0]
  const real = (xRealIp ?? '').trim()
  return real || null
}
