import { createHash } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import {
  authenticateStudioUser,
  studioCorsHeaders,
  studioJson,
} from '@/lib/admin/studioRequest.server';
import {
  MAX_CARD_BYTES,
  MustEatCardError,
  firebaseServesDataset,
  readMustEatCard,
  writeMustEatCard,
} from '@/lib/must-eat/card-admin.server';
import { checkRateLimitFailClosed } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

// Die Karte einer Must Eat aus dem Studio: JSON liest den Stand, ein
// Formular (multipart) speichert ihn. Lesen und Schreiben prüfen dasselbe —
// Sanity-Rolle der angemeldeten Person, passendes Firebase-Projekt, und dass
// es die Must Eat im Datensatz gibt.

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

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
    'Deine Sanity-Rolle darf keine Must Eat Karten bearbeiten.'
  );
  if ('response' in auth) return auth.response;
  const { user, sanity } = auth;

  const isForm = (request.headers.get('content-type') ?? '').startsWith('multipart/form-data');
  let fields: Record<string, unknown>;
  let upload: File | null = null;
  try {
    if (isForm) {
      const form = await request.formData();
      const image = form.get('image');
      upload = image instanceof File && image.size > 0 ? image : null;
      fields = Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === 'string'));
    } else {
      fields = (await request.json()) as Record<string, unknown>;
    }
  } catch {
    return studioJson({ error: 'invalid_body', message: 'Die Anfrage war unvollständig.' }, 400, cors);
  }

  const field = (name: string) => (typeof fields[name] === 'string' ? (fields[name] as string) : '');
  const id = field('id').replace(/^drafts\./, '');
  const projectId = field('projectId');
  const dataset = field('dataset');
  if (!ID_PATTERN.test(id)) {
    return studioJson({ error: 'invalid_id', message: 'Unbekannte Must Eat.' }, 400, cors);
  }
  if (!firebaseServesDataset(projectId, dataset)) {
    return studioJson(
      {
        error: 'wrong_target',
        message:
          'Dieser Server speichert Karten für einen anderen Datensatz. Karten bitte im Studio des passenden Datensatzes pflegen.',
      },
      409,
      cors
    );
  }

  // Der Spot kommt aus Sanity, nicht aus der Anfrage: Entwurf vor Fassung.
  let restaurantId: string | null = null;
  try {
    const rows = await sanity
      .withConfig({ projectId, dataset, apiVersion: '2024-01-01' })
      .fetch<{ _id: string; restaurantId: string | null }[]>(
        `*[_type == "mustEat" && _id in [$id, "drafts." + $id]]{_id, "restaurantId": restaurantRef._ref}`,
        { id }
      );
    const row = rows.find((r) => r._id.startsWith('drafts.')) ?? rows[0];
    if (!row) {
      return studioJson(
        { error: 'not_found', message: 'Diese Must Eat gibt es noch nicht — erst den Spot wählen.' },
        404,
        cors
      );
    }
    restaurantId = row.restaurantId;
  } catch (error) {
    Sentry.captureException(error, { extra: { source: 'admin-must-eat-card' } });
    return studioJson({ error: 'sanity_failed', message: 'Sanity war nicht erreichbar.' }, 502, cors);
  }

  if (!isForm) {
    try {
      // Die Prüfung vor dem Veröffentlichen braucht kein Vorschaubild.
      const card = await readMustEatCard(id, { preview: fields.preview !== false });
      return studioJson({ ...card, spotId: restaurantId }, 200, cors);
    } catch (error) {
      Sentry.captureException(error, { extra: { source: 'admin-must-eat-card' } });
      return studioJson({ error: 'read_failed', message: 'Die Karte ließ sich nicht laden.' }, 500, cors);
    }
  }

  if (!restaurantId) {
    return studioJson({ error: 'no_spot', message: 'Erst den Spot wählen.' }, 400, cors);
  }
  if (upload && (!IMAGE_TYPES.has(upload.type) || upload.size > MAX_CARD_BYTES)) {
    return studioJson(
      { error: 'invalid_image', message: 'Bitte ein PNG, JPG oder WebP bis 15 MB.' },
      400,
      cors
    );
  }

  const userKey = createHash('sha256').update(user.id).digest('hex').slice(0, 32);
  if (!(await checkRateLimitFailClosed(`sanity-must-eat-card:${userKey}`, 120, 60 * 60 * 1000))) {
    return studioJson(
      { error: 'rate_limited', message: 'Zu viele Änderungen. Bitte später erneut versuchen.' },
      429,
      cors
    );
  }

  try {
    const card = await writeMustEatCard({
      id,
      restaurantId,
      text: {
        dish: field('dish'),
        description: field('description'),
        descriptionEn: field('descriptionEn'),
        price: field('price'),
      },
      image: upload ? Buffer.from(await upload.arrayBuffer()) : null,
    });
    return studioJson({ ...card, spotId: restaurantId }, 200, cors);
  } catch (error) {
    if (error instanceof MustEatCardError) {
      return studioJson({ error: 'invalid_card', message: error.message }, 400, cors);
    }
    Sentry.captureException(error, { extra: { source: 'admin-must-eat-card' } });
    return studioJson({ error: 'write_failed', message: 'Die Karte ließ sich nicht speichern.' }, 500, cors);
  }
}
