import { createHash } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import { importRestaurant } from '@/lib/admin/import-restaurant.server';
import {
  authenticateStudioUser,
  studioCorsHeaders,
  studioJson,
} from '@/lib/admin/studioRequest.server';
import { isStaging } from '@/lib/env';
import { checkRateLimitFailClosed } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 120;

const MAPS_HOSTS = new Set([
  'maps.app.goo.gl',
  'google.com',
  'www.google.com',
  'maps.google.com',
  'google.de',
  'www.google.de',
  'maps.google.de',
]);

interface ImportBody {
  url?: unknown;
}

function isGoogleMapsUrl(value: string): boolean {
  if (value.length > 2048) return false;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || !MAPS_HOSTS.has(hostname)) return false;
    if (hostname === 'maps.app.goo.gl' || hostname.startsWith('maps.google.')) return true;
    return url.pathname === '/maps' || url.pathname.startsWith('/maps/');
  } catch {
    return false;
  }
}

export async function OPTIONS(request: Request) {
  if (isStaging) return new NextResponse(null, { status: 404 });
  const cors = studioCorsHeaders(request.headers.get('origin'));
  if (!cors) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(request: Request) {
  // Production imports are intentionally unavailable on the isolated staging
  // backend until it has its own Google provider secret and Studio deployment.
  if (isStaging) return new NextResponse('Not found', { status: 404 });

  const cors = studioCorsHeaders(request.headers.get('origin'));
  if (!cors) return NextResponse.json({ error: 'origin_forbidden' }, { status: 403 });

  const auth = await authenticateStudioUser(
    request,
    cors,
    'Deine Sanity-Rolle darf keine Restaurants anlegen.'
  );
  if ('response' in auth) return auth.response;
  const { user, sanity } = auth;

  if (!process.env.GOOGLE_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    Sentry.captureMessage('Live restaurant importer is missing provider configuration', 'error');
    return studioJson(
      { error: 'import_unavailable', message: 'Der Import ist noch nicht eingerichtet.' },
      503,
      cors
    );
  }

  let body: ImportBody;
  try {
    body = (await request.json()) as ImportBody;
  } catch {
    return studioJson({ error: 'invalid_json', message: 'Ungültiger JSON-Body.' }, 400, cors);
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url || !isGoogleMapsUrl(url)) {
    return studioJson(
      { error: 'invalid_url', message: 'Bitte einen gültigen Google-Maps-Link (https) einfügen.' },
      400,
      cors
    );
  }

  const userKey = createHash('sha256').update(user.id).digest('hex').slice(0, 32);
  if (!(await checkRateLimitFailClosed(`sanity-import:${userKey}`, 30, 60 * 60 * 1000))) {
    return studioJson(
      { error: 'rate_limited', message: 'Import-Limit erreicht. Bitte später erneut versuchen.' },
      429,
      cors
    );
  }

  try {
    const result = await importRestaurant(url, sanity);
    return studioJson(result, 200, cors);
  } catch (error) {
    if (error instanceof Error && error.name === 'ImportError') {
      const importError = error as Error & { hint?: string };
      return studioJson(
        {
          error: 'import_failed',
          message: importError.message,
          ...(importError.hint ? { hint: importError.hint } : {}),
        },
        400,
        cors
      );
    }

    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? (error as { statusCode?: unknown }).statusCode
        : null;
    if (statusCode === 401 || statusCode === 403) {
      return studioJson(
        { error: 'write_forbidden', message: 'Sanity hat das Speichern für dein Konto abgelehnt.' },
        403,
        cors
      );
    }

    Sentry.captureException(error, { extra: { source: 'admin-import-restaurant' } });
    return studioJson(
      { error: 'import_failed', message: 'Der Import ist fehlgeschlagen. Bitte erneut versuchen.' },
      500,
      cors
    );
  }
}
