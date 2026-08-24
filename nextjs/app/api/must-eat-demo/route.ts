import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getAdminStorage } from '@/lib/firebase/admin';
import { getCachedMapData } from '@/lib/map/cached-sanity';
import { getPrivateMustEatContent } from '@/lib/must-eat/private-store';
import { hydrateAuthorizedMustEats } from '@/lib/must-eat/private-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const mustEatId = searchParams.get('mustEatId');
  if (!mustEatId) {
    return NextResponse.json({ error: 'mustEatId required' }, { status: 400 });
  }

  const { mustEats } = await getCachedMapData();
  const mustEat = mustEats.find((m) => m._id === mustEatId);
  if (!mustEat) {
    return NextResponse.json({ error: 'unknown must-eat' }, { status: 404 });
  }

  const [hydratedMustEat] = await hydrateAuthorizedMustEats([mustEat], new Set([mustEatId]));

  // Das Bild kommt als data-URL direkt mit, statt über /api/must-eat-image:
  // die Route verlangt das Premium-Access-Cookie, und das hier gesetzte
  // verlor jedes Rennen gegen den anonymen Auth-Init (AuthContext DELETEt
  // /api/auth/premium-access und löscht es wieder) — der Demo-Reveal zeigte
  // dann ein kaputtes Bild. Eine data-URL kennt keine Cookies.
  let demoMustEat = hydratedMustEat;
  try {
    const content = await getPrivateMustEatContent(mustEatId);
    const [buffer] = await getAdminStorage().bucket().file(content.imageObjectPath).download();
    const webp = await sharp(buffer)
      .rotate()
      .resize({ width: 720, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    demoMustEat = {
      ...hydratedMustEat,
      image: `data:image/webp;base64,${webp.toString('base64')}`,
    };
  } catch (error) {
    console.warn(
      '[must-eat-demo] could not inline image, serving stripped card',
      error instanceof Error ? error.name : 'UnknownError'
    );
  }

  const res = NextResponse.json({ mustEat: demoMustEat });
  res.headers.set('Cache-Control', 'private, no-store');
  return res;
}
