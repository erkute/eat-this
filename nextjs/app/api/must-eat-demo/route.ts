import { NextResponse } from 'next/server'
import { getCachedMapData } from '@/lib/map/cached-sanity'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const mustEatId = searchParams.get('mustEatId')
  if (!mustEatId) {
    return NextResponse.json({ error: 'mustEatId required' }, { status: 400 })
  }

  const { mustEats } = await getCachedMapData()
  const mustEat = mustEats.find((m) => m._id === mustEatId)
  if (!mustEat) {
    return NextResponse.json({ error: 'unknown must-eat' }, { status: 404 })
  }

  const res = NextResponse.json({ mustEat })
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}
