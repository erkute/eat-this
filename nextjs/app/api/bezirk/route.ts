import { NextResponse, type NextRequest } from 'next/server'
import { locateBezirk } from '@/lib/geo/locateBezirk'

/**
 * Reverse-geocode a coordinate to its Berlin Ortsteil (neighbourhood) via
 * point-in-polygon over the official boundaries. Used by the "Dein Bezirk X"
 * greeting pill. Pure function of lat/lng → safe to cache hard.
 */
export function GET(req: NextRequest) {
  const lat = Number.parseFloat(req.nextUrl.searchParams.get('lat') ?? '')
  const lng = Number.parseFloat(req.nextUrl.searchParams.get('lng') ?? '')
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'bad_coords' }, { status: 400 })
  }
  const bezirk = locateBezirk(lat, lng)
  return NextResponse.json(
    { bezirk },
    { headers: { 'Cache-Control': 'public, max-age=86400' } },
  )
}
