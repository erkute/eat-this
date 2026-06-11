import { NextResponse } from 'next/server'
import { client } from '@/lib/sanity'
import { restaurantMapDetailQuery } from '@/lib/map/queries'

// On-demand detail fields for the map detail sheet (address, phone, tip,
// description, …). These are the same editorial/contact fields the public
// /restaurant/[slug] SEO page already renders, so no auth gate — the point
// is that they no longer ship up-front in the map payload for every spot.
export const revalidate = 3600

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const detail = await client.fetch(
    restaurantMapDetailQuery,
    { slug },
    { next: { revalidate: 3600, tags: [`restaurant:${slug}`] } },
  )
  if (!detail) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(detail, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
  })
}
