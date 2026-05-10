import { NextResponse } from 'next/server'
import { client } from '@/lib/sanity'
import { mapRestaurantsQuery, mapMustEatsQuery } from '@/lib/map/queries'
import { allCategoriesQuery } from '@/lib/queries'

export const revalidate = 60

export async function GET() {
  const [restaurants, mustEats, categories] = await Promise.all([
    client.fetch(mapRestaurantsQuery),
    client.fetch(mapMustEatsQuery),
    client.fetch(allCategoriesQuery),
  ])
  return NextResponse.json({ restaurants, mustEats, categories })
}
