import { NextRequest, NextResponse } from 'next/server';

import { warmMustEatImages } from '@/lib/must-eat/warmup';
import { warmupToken } from '@/lib/warmup/selfWarmup';

export const dynamic = 'force-dynamic';

// Nur der eigene Prozess ruft hier an — der Grund steht in lib/warmup/selfWarmup.
export async function POST(request: NextRequest) {
  const token = warmupToken();
  if (!token || request.headers.get('x-warmup-token') !== token) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const started = Date.now();
  const { cards, failedRenders, firstError } = await warmMustEatImages();
  console.log(
    `[warmup] must-eat images: ${cards} cards, ${failedRenders} renders failed, ${Date.now() - started} ms` +
      (firstError ? ` — ${firstError}` : '')
  );
  return new NextResponse(null, { status: 204 });
}
