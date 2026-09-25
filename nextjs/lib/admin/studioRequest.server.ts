import 'server-only';
import type { CurrentSanityUser, SanityClient } from '@sanity/client';
import { NextResponse } from 'next/server';
import { client as baseSanityClient } from '@/lib/sanity';

// Routes the Sanity Studio calls directly. The browser bundle of the Studio
// holds no secret: it sends the signed-in user's short-lived session token,
// and that user's Sanity role stays the authorization boundary.

const LIVE_STUDIO_ORIGINS = new Set(['https://eat-this.sanity.studio', 'https://www.sanity.io']);
const STUDIO_WRITER_ROLES = new Set(['administrator', 'developer', 'editor']);

export function studioCorsHeaders(origin: string | null): Record<string, string> | null {
  const isLocalStudio =
    process.env.NODE_ENV === 'development' &&
    typeof origin === 'string' &&
    /^http:\/\/localhost:\d+$/.test(origin);
  if (!origin || (!LIVE_STUDIO_ORIGINS.has(origin) && !isLocalStudio)) return null;

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
}

export function studioJson(body: unknown, status: number, headers: Record<string, string>) {
  return NextResponse.json(body, { status, headers });
}

/**
 * Resolves the Studio user behind the request's Bearer token. Returns the
 * user plus a client that reads with that user's rights — or the error
 * response to send back as is.
 */
export async function authenticateStudioUser(
  request: Request,
  cors: Record<string, string>,
  deniedMessage: string
): Promise<{ user: CurrentSanityUser; sanity: SanityClient } | { response: NextResponse }> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return {
      response: studioJson(
        { error: 'missing_token', message: 'Sanity neu laden und erneut anmelden.' },
        401,
        cors
      ),
    };
  }

  const sanity = baseSanityClient.withConfig({
    token,
    useCdn: false,
    perspective: 'raw',
  });

  // `roles` is on the /users/me payload but missing from the client's type.
  let user: CurrentSanityUser & { roles?: { name: string }[] };
  try {
    user = await sanity.users.getById('me');
  } catch {
    return {
      response: studioJson(
        { error: 'invalid_token', message: 'Deine Sanity-Sitzung ist nicht mehr gültig.' },
        401,
        cors
      ),
    };
  }

  // `role` is Sanity's legacy single role and reads "write" for API tokens;
  // the project roles live in `roles`. Either one may carry the grant.
  const roleNames = [user.role, ...(user.roles ?? []).map((r) => r.name)];
  if (!roleNames.some((name) => STUDIO_WRITER_ROLES.has(name))) {
    return {
      response: studioJson({ error: 'insufficient_role', message: deniedMessage }, 403, cors),
    };
  }

  return { user, sanity };
}
