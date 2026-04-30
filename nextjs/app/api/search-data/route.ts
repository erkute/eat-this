import { NextResponse } from 'next/server'
import { client } from '@/lib/sanity'
import { mapRestaurantsQuery } from '@/lib/map/queries'
import { allNewsArticlesQuery } from '@/lib/queries'

// Edge data source for the global search overlay. Returns the slim shapes
// the overlay actually filters on (no Must Eats — search excludes them by
// design). Cached for a minute to keep typing snappy across visits.
export const revalidate = 60

export async function GET() {
  const [restaurants, news] = await Promise.all([
    client.fetch(mapRestaurantsQuery),
    client.fetch(allNewsArticlesQuery),
  ])
  return NextResponse.json({ restaurants, news })
}
