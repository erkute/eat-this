import { createHash } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import {
  authenticateStudioUser,
  studioCorsHeaders,
  studioJson,
} from '@/lib/admin/studioRequest.server';
import { fetchRemoteImage, RemoteImageError } from '@/lib/admin/remoteImage.server';
import { checkRateLimitFailClosed } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

// „Foto per Link“ im Studio: Der Link kommt hier an, die App holt das Bild und
// lädt es mit dem Sanity-Token der angemeldeten Person hoch. Im Browser ginge
// das nicht — fremde Seiten erlauben dem Studio keinen Abruf (CORS).
//
// Nur diese beiden Datensätze nehmen Uploads an; das Studio schickt mit, in
// welchem es gerade arbeitet.
const TARGETS = new Set(['ehwjnjr2/production', 'tqgkp8uc/staging']);

interface ImportImageBody {
  url?: unknown;
  projectId?: unknown;
  dataset?: unknown;
  credit?: unknown;
}

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
    'Deine Sanity-Rolle darf keine Fotos hochladen.'
  );
  if ('response' in auth) return auth.response;
  const { user, sanity } = auth;

  let body: ImportImageBody;
  try {
    body = (await request.json()) as ImportImageBody;
  } catch {
    return studioJson({ error: 'invalid_json', message: 'Ungültiger JSON-Body.' }, 400, cors);
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const dataset = typeof body.dataset === 'string' ? body.dataset : '';
  const credit = typeof body.credit === 'string' ? body.credit.trim().slice(0, 200) : '';
  if (!url) {
    return studioJson({ error: 'invalid_url', message: 'Bitte einen Link einfügen.' }, 400, cors);
  }
  if (!TARGETS.has(`${projectId}/${dataset}`)) {
    return studioJson(
      { error: 'invalid_target', message: 'Dieser Datensatz nimmt keine Uploads an.' },
      400,
      cors
    );
  }

  const userKey = createHash('sha256').update(user.id).digest('hex').slice(0, 32);
  if (!(await checkRateLimitFailClosed(`sanity-import-image:${userKey}`, 200, 60 * 60 * 1000))) {
    return studioJson(
      { error: 'rate_limited', message: 'Upload-Limit erreicht. Bitte später erneut versuchen.' },
      429,
      cors
    );
  }

  let image;
  try {
    image = await fetchRemoteImage(url);
  } catch (error) {
    if (error instanceof RemoteImageError) {
      return studioJson({ error: 'fetch_failed', message: error.message }, 422, cors);
    }
    Sentry.captureException(error, { extra: { source: 'admin-import-image' } });
    return studioJson(
      { error: 'fetch_failed', message: 'Der Link ließ sich nicht abrufen.' },
      502,
      cors
    );
  }

  try {
    const asset = await sanity
      .withConfig({ projectId, dataset, apiVersion: '2024-01-01' })
      .assets.upload('image', image.body, {
        filename: image.filename,
        contentType: image.contentType,
        source: { name: 'url', id: image.imageUrl, url: image.pageUrl ?? image.imageUrl },
        ...(credit ? { creditLine: credit } : {}),
      });
    return studioJson(
      {
        assetId: asset._id,
        previewUrl: asset.url,
        width: asset.metadata?.dimensions?.width ?? null,
        height: asset.metadata?.dimensions?.height ?? null,
        pageUrl: image.pageUrl,
      },
      200,
      cors
    );
  } catch (error) {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? (error as { statusCode?: unknown }).statusCode
        : null;
    if (statusCode === 401 || statusCode === 403) {
      return studioJson(
        { error: 'write_forbidden', message: 'Sanity lässt diesen Upload für dein Konto nicht zu.' },
        403,
        cors
      );
    }
    Sentry.captureException(error, { extra: { source: 'admin-import-image' } });
    return studioJson(
      { error: 'upload_failed', message: 'Der Upload zu Sanity ist fehlgeschlagen.' },
      500,
      cors
    );
  }
}
