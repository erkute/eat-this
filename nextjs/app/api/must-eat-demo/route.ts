import { NextResponse } from 'next/server'
import { getCachedMapData } from '@/lib/map/cached-sanity'
import { hydrateAuthorizedMustEats } from '@/lib/must-eat/private-store'
import { setPremiumAccessCookie } from '@/lib/must-eat/premium-access'

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

  const [hydratedMustEat] = await hydrateAuthorizedMustEats(
    [mustEat],
    new Set([mustEatId]),
  )
  const res = NextResponse.json({ mustEat: hydratedMustEat })
  res.headers.set('Cache-Control', 'private, no-store')
  setPremiumAccessCookie(res, [mustEatId], 'development')
  return res
}
