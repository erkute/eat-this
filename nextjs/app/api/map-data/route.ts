import { NextResponse } from 'next/server'
import { client } from '@/lib/sanity'
import { mapRestaurantsQuery, mapMustEatsQuery } from '@/lib/map/queries'

export const revalidate = 60

export async function GET() {
  const [restaurants, mustEats] = await Promise.all([
    client.fetch(mapRestaurantsQuery),
    client.fetch(mapMustEatsQuery),
  ])
  return NextResponse.json({ restaurants, mustEats })
}
