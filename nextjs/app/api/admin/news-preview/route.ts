import { createHash } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import {
  authenticateStudioUser,
  studioCorsHeaders,
  studioJson,
} from '@/lib/admin/studioRequest.server';
import { saveNewsPreview } from '@/lib/admin/newsPreview.server';
import { articleByIdQuery } from '@/lib/queries';
import { checkRateLimitFailClosed } from '@/lib/rateLimit';
import type { NewsArticle } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Sanity-Dokument-IDs: Buchstaben, Ziffern, Bindestrich, Unterstrich, Punkt.
const DOCUMENT_ID = /^[A-Za-z0-9._-]{1,128}$/;

export async function OPTIONS(request: Request) {
  const cors = studioCorsHeaders(request.headers.get('origin'));
  if (!cors) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(request: Request) {
  const cors = studioCorsHeaders(request.headers.get('origin'));
  if (!cors) return NextResponse.json({ error: 'origin_forbidden' }, { status: 403 });

  const auth = await authenticateStudioUser(
    request,
    cors,
    'Deine Sanity-Rolle darf keine Vorschau öffnen.'
  );
  if ('response' in auth) return auth.response;
  const { user, sanity } = auth;

  let body: { id?: unknown };
  try {
    body = (await request.json()) as { id?: unknown };
  } catch {
    return studioJson({ error: 'invalid_json', message: 'Ungültiger JSON-Body.' }, 400, cors);
  }
  const rawId = typeof body.id === 'string' ? body.id : '';
  if (!DOCUMENT_ID.test(rawId)) {
    return studioJson({ error: 'invalid_request', message: 'Ungültige Dokument-ID.' }, 400, cors);
  }
  const id = rawId.replace(/^drafts\./, '');

  const userKey = createHash('sha256').update(user.id).digest('hex').slice(0, 32);
  if (!(await checkRateLimitFailClosed(`sanity-news-preview:${userKey}`, 120, 60 * 60 * 1000))) {
    return studioJson(
      { error: 'rate_limited', message: 'Vorschau-Limit erreicht. Bitte später erneut versuchen.' },
      429,
      cors
    );
  }

  try {
    const article = await sanity
      .withConfig({ apiVersion: '2025-02-19', perspective: 'drafts' })
      .fetch<NewsArticle | null>(articleByIdQuery, { id });
    if (!article) {
      return studioJson(
        { error: 'not_found', message: 'Den Artikel gibt es noch nicht.' },
        404,
        cors
      );
    }
    const previewId = await saveNewsPreview(article);
    return studioJson({ path: `/news/vorschau/${previewId}` }, 200, cors);
  } catch (error) {
    Sentry.captureException(error, { extra: { source: 'admin-news-preview' } });
    return studioJson(
      { error: 'preview_failed', message: 'Die Vorschau konnte nicht erstellt werden.' },
      500,
      cors
    );
  }
}
