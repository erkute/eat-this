import { NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase/admin'
import { resolveEntitlements } from '@/lib/firebase/entitlements'

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 })
  }

  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) {
    const ent = await resolveEntitlements(null, null)
    return NextResponse.json({
      uid:   null,
      email: null,
      ent: serializeEnt(ent),
    })
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    const ent = await resolveEntitlements(decoded.uid, decoded.email ?? null)
    return NextResponse.json({
      uid:   decoded.uid,
      email: decoded.email,
      ent: serializeEnt(ent),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 })
  }
}

function serializeEnt(ent: Awaited<ReturnType<typeof resolveEntitlements>>) {
  return {
    isAdmin:       ent.isAdmin,
    hasAllBerlin:  ent.hasAllBerlin,
    categorySlugs: [...ent.categorySlugs],
    restaurantIds: [...ent.restaurantIds],
    mustEatIds:    [...ent.mustEatIds],
  }
}
