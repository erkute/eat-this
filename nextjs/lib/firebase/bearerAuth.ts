// Server-only, like ./admin.

import { getAdminAuth } from './admin';
import type { TokenIdentity } from './entitlements';

export type BearerAuth =
  | { status: 'missing' }
  | { status: 'invalid'; error: unknown }
  | { status: 'ok'; uid: string; email: string | null; token: string; identity: TokenIdentity };

/**
 * The caller behind `Authorization: Bearer <Firebase ID token>`. The token is
 * checked for revocation. What a missing or invalid token means is up to the
 * route: some answer 401, some treat the caller as a guest.
 */
export async function verifyBearer(request: Request): Promise<BearerAuth> {
  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return { status: 'missing' };
  try {
    const decoded = await getAdminAuth().verifyIdToken(token, true);
    const email = decoded.email ?? null;
    return {
      status: 'ok',
      uid: decoded.uid,
      email,
      token,
      identity: {
        email,
        emailVerified: decoded.email_verified === true,
        admin: decoded.admin === true,
      },
    };
  } catch (error) {
    return { status: 'invalid', error };
  }
}
