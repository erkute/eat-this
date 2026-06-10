// Real client IP behind Firebase App Hosting. Verified empirically with a
// staging probe (2026-06-09): App Hosting appends ingress + GFE after the real
// client, while client-supplied spoofed values land further left.
export function clientIpFromXff(xff: string | null, xRealIp?: string | null): string | null {
  const hops = xff ? xff.split(',').map((hop) => hop.trim()).filter(Boolean) : []
  if (hops.length >= 3) return hops[hops.length - 3]
  if (hops.length > 0) return hops[0]
  const real = (xRealIp ?? '').trim()
  return real || null
}

export function clientIp(request: Request): string {
  return clientIpFromXff(
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip'),
  ) ?? 'unknown'
}
