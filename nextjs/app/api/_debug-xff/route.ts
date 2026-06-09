// TEMPORARY XFF probe — verifies which x-forwarded-for hop is the real client
// IP behind Firebase App Hosting, so the buddy rate-limiter hashes the right one.
// /api is not behind staging Basic Auth (see middleware matcher), so this is
// reachable directly. Token-gated and returns only IPs. REMOVE after probing.
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('t')
  if (token !== 'xff-probe-2026') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  const xff = request.headers.get('x-forwarded-for')
  const hops = xff ? xff.split(',').map((h) => h.trim()).filter(Boolean) : []
  return NextResponse.json(
    {
      xff,
      hops,
      hopCount: hops.length,
      leftmost: hops[0] ?? null,
      secondToLast: hops.length >= 2 ? hops[hops.length - 2] : null,
      rightmost: hops[hops.length - 1] ?? null,
      xRealIp: request.headers.get('x-real-ip'),
      xForwardedHost: request.headers.get('x-forwarded-host'),
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}
