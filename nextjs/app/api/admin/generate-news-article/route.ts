import { createHash } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import {
  generateNewsArticle,
  type GeneratedNewsArticle,
  type NewsCategory,
} from '@/lib/admin/generate-news-article.server';
import { applyGeneratedArticle, readArticle, type ArticleDraft } from '@/lib/admin/applyGeneratedArticle.server';
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
// Websuche plus Artikel auf Deutsch und Englisch: gemessen 4:40 min.
export const maxDuration = 600;

// „Mit AI schreiben“ im Studio: Die App schreibt den Artikel und setzt ihn
// selbst in den Entwurf — mit dem Sanity-Token der angemeldeten Person. So
// kommt der Text auch an, wenn im Studio der Tab inzwischen zu ist.
const TARGETS = new Set(['ehwjnjr2/production', 'tqgkp8uc/staging']);
const CATEGORIES = new Set<NewsCategory>(['openings', 'guides', 'culture']);
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

interface RequestBody {
  brief?: unknown;
  documentId?: unknown;
  projectId?: unknown;
  dataset?: unknown;
  replace?: unknown;
  sourceUrls?: unknown;
}

interface ParsedRequest {
  brief: string;
  documentId: string;
  projectId: string;
  dataset: string;
  replace: boolean;
  sourceUrls: string[];
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

function parseBody(body: RequestBody): ParsedRequest | null {
  const brief = typeof body.brief === 'string' ? body.brief.trim() : '';
  const documentId = typeof body.documentId === 'string' ? body.documentId.replace(/^drafts\./, '') : '';
  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const dataset = typeof body.dataset === 'string' ? body.dataset : '';
  const sourceUrls = parseSourceUrls(body.sourceUrls ?? []);

  if (
    brief.length < 20 ||
    brief.length > 8000 ||
    !ID_PATTERN.test(documentId) ||
    !TARGETS.has(`${projectId}/${dataset}`) ||
    sourceUrls === null ||
    typeof body.replace !== 'boolean'
  ) {
    return null;
  }
  return { brief, documentId, projectId, dataset, replace: body.replace, sourceUrls };
}

/**
 * Was die Redaktion tun kann, wenn die AI nicht schreibt. Leeres Guthaben
 * meldet die API nur als Text im 400 — eine eigene Fehlerklasse gibt es dafür nicht.
 */
function providerTrouble(error: unknown): string | null {
  if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError) {
    return 'Die AI ist gerade überlastet. Bitte in ein paar Minuten noch einmal.';
  }
  if (error instanceof Anthropic.BadRequestError && /credit balance/i.test(error.message)) {
    return 'Das Guthaben bei Anthropic ist aufgebraucht. Erst im Anthropic-Konto aufladen, dann noch einmal.';
  }
  return null;
}

/** Das Aufmacher-Bild beschreibt die AI nur aus dem Produktions-Datensatz. */
async function heroImageUrl(
  sanity: Parameters<typeof readArticle>[0],
  target: string,
  article: ArticleDraft | null
): Promise<string | null> {
  const ref = article?.image?.asset?._ref;
  if (target !== 'ehwjnjr2/production' || !ref) return null;
  const url = await sanity.fetch<string | null>('*[_id == $ref][0].url', { ref });
  return typeof url === 'string' && url.startsWith('https://cdn.sanity.io/images/ehwjnjr2/production/')
    ? url
    : null;
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
      { error: 'invalid_request', message: 'Briefing, Artikel oder Quellen sind ungültig.' },
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

  const target = `${input.projectId}/${input.dataset}`;
  const sanity = auth.sanity.withConfig({
    projectId: input.projectId,
    dataset: input.dataset,
    apiVersion: '2024-01-01',
  });

  let current: ArticleDraft | null;
  try {
    current = await readArticle(sanity, input.documentId);
  } catch (error) {
    Sentry.captureException(error, { extra: { source: 'admin-generate-news-article' } });
    return json({ error: 'sanity_failed', message: 'Sanity war nicht erreichbar.' }, 502, cors);
  }
  if (current && current._type !== 'newsArticle') {
    return json({ error: 'invalid_document', message: 'Das ist kein Artikel.' }, 400, cors);
  }

  let article: GeneratedNewsArticle;
  try {
    article = await generateNewsArticle({
      brief: input.brief,
      category: current?.category && CATEGORIES.has(current.category) ? current.category : 'guides',
      heroImageUrl: await heroImageUrl(sanity, target, current),
      imageDescription: null,
      includeEnglish: true,
      length: 'standard',
      sourceUrls: input.sourceUrls,
    });
  } catch (error) {
    Sentry.captureException(error, { extra: { source: 'admin-generate-news-article' } });
    const trouble = providerTrouble(error);
    if (trouble) return json({ error: 'writer_unavailable', message: trouble }, 503, cors);
    return json(
      {
        error: 'generation_failed',
        message: 'Der Artikel konnte nicht erzeugt werden. Bitte erneut versuchen.',
      },
      500,
      cors
    );
  }

  try {
    await applyGeneratedArticle(sanity, input.documentId, current, article, input.replace);
  } catch (error) {
    Sentry.captureException(error, { extra: { source: 'admin-generate-news-article' } });
    return json(
      { error: 'apply_failed', message: 'Der Text ist fertig, ließ sich aber nicht in den Entwurf setzen.' },
      500,
      cors
    );
  }
  return json({ sources: article.sources.length, titleDe: article.titleDe }, 200, cors);
}
