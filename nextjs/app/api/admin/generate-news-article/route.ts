import { createHash } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import {
  generateNewsArticle,
  type GenerateNewsArticleInput,
  type NewsArticleLength,
  type NewsCategory,
} from '@/lib/admin/generate-news-article.server';
import { isStaging } from '@/lib/env';
import { checkRateLimitFailClosed } from '@/lib/rateLimit';
import {
  authenticateStudioUser,
  studioCorsHeaders as corsHeaders,
  studioJson as json,
} from '@/lib/admin/studioRequest.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 120;

const CATEGORIES = new Set<NewsCategory>(['openings', 'guides', 'culture']);
const LENGTHS = new Set<NewsArticleLength>(['short', 'standard', 'long']);

interface RequestBody {
  brief?: unknown;
  category?: unknown;
  heroImageUrl?: unknown;
  imageDescription?: unknown;
  includeEnglish?: unknown;
  length?: unknown;
  sourceUrls?: unknown;
}

function parseSourceUrls(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 8) return null;
  const urls: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== 'string' || candidate.length > 2048) return null;
    try {
      const url = new URL(candidate);
      if (url.protocol !== 'https:' || url.username || url.password) return null;
      urls.push(url.toString());
    } catch {
      return null;
    }
  }
  return [...new Set(urls)];
}

function parseHeroImageUrl(value: unknown): string | null | false {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    const isProductionAsset =
      url.protocol === 'https:' &&
      url.hostname === 'cdn.sanity.io' &&
      /^\/images\/ehwjnjr2\/production\//.test(url.pathname);
    return isProductionAsset ? url.toString() : false;
  } catch {
    return false;
  }
}

function parseBody(body: RequestBody): GenerateNewsArticleInput | null {
  const brief = typeof body.brief === 'string' ? body.brief.trim() : '';
  const category = body.category;
  const length = body.length;
  const sourceUrls = parseSourceUrls(body.sourceUrls ?? []);
  const heroImageUrl = parseHeroImageUrl(body.heroImageUrl);
  const imageDescription =
    typeof body.imageDescription === 'string' ? body.imageDescription.trim() : '';

  if (
    brief.length < 20 ||
    brief.length > 8000 ||
    typeof category !== 'string' ||
    !CATEGORIES.has(category as NewsCategory) ||
    typeof length !== 'string' ||
    !LENGTHS.has(length as NewsArticleLength) ||
    sourceUrls === null ||
    heroImageUrl === false ||
    imageDescription.length > 600 ||
    typeof body.includeEnglish !== 'boolean'
  ) {
    return null;
  }

  return {
    brief,
    category: category as NewsCategory,
    heroImageUrl,
    imageDescription: imageDescription || null,
    includeEnglish: body.includeEnglish,
    length: length as NewsArticleLength,
    sourceUrls,
  };
}

export async function OPTIONS(request: Request) {
  if (isStaging) return new NextResponse(null, { status: 404 });
  const cors = corsHeaders(request.headers.get('origin'));
  if (!cors) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(request: Request) {
  if (isStaging) return new NextResponse('Not found', { status: 404 });

  const cors = corsHeaders(request.headers.get('origin'));
  if (!cors) return NextResponse.json({ error: 'origin_forbidden' }, { status: 403 });

  const auth = await authenticateStudioUser(
    request,
    cors,
    'Deine Sanity-Rolle darf keine Artikel erzeugen.'
  );
  if ('response' in auth) return auth.response;
  const { user } = auth;

  if (!process.env.ANTHROPIC_API_KEY) {
    Sentry.captureMessage('AI news writer is missing Anthropic configuration', 'error');
    return json(
      { error: 'writer_unavailable', message: 'Der AI-News-Assistent ist nicht konfiguriert.' },
      503,
      cors
    );
  }

  let rawBody: RequestBody;
  try {
    rawBody = (await request.json()) as RequestBody;
  } catch {
    return json({ error: 'invalid_json', message: 'Ungültiger JSON-Body.' }, 400, cors);
  }

  const input = parseBody(rawBody);
  if (!input) {
    return json(
      { error: 'invalid_request', message: 'Briefing, Kategorie oder Quellen sind ungültig.' },
      400,
      cors
    );
  }

  const userKey = createHash('sha256').update(user.id).digest('hex').slice(0, 32);
  if (!(await checkRateLimitFailClosed(`sanity-news-writer:${userKey}`, 10, 60 * 60 * 1000))) {
    return json(
      { error: 'rate_limited', message: 'AI-Limit erreicht. Bitte später erneut versuchen.' },
      429,
      cors
    );
  }

  try {
    const article = await generateNewsArticle(input);
    return json(article, 200, cors);
  } catch (error) {
    Sentry.captureException(error, { extra: { source: 'admin-generate-news-article' } });
    return json(
      {
        error: 'generation_failed',
        message: 'Der Artikel konnte nicht erzeugt werden. Bitte erneut versuchen.',
      },
      500,
      cors
    );
  }
}
