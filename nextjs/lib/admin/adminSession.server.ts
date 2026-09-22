import 'server-only';

import { getAdminAuth } from '@/lib/firebase/admin';
import { isAdminToken } from '@/lib/firebase/entitlements';

/**
 * Ob hinter einem Session-Cookie ein Admin steht.
 *
 * Die Seiten unter /admin rendern im Browser; ohne diese Prüfung sah jeder
 * Fremde das Gerüst des Zahlenbretts samt Berichtsnamen, nur ohne Zahlen.
 * Der Server kennt den Aufrufer über dieselbe httpOnly-Session, die
 * `AuthProvider` bei jeder Anmeldung und jeder Token-Rotation setzt
 * (lib/must-eat/premium-session.ts) — sie ist ein echtes Firebase-Session-
 * Cookie und trägt `email`, `email_verified` und die Custom Claims.
 *
 * Grenzfall: das Cookie lebt eine Stunde. Wer länger keine Seite der App
 * offen hatte, sieht beim ersten Aufruf die 404 — deren Rahmen trägt selbst
 * `AuthProvider`, erneuert das Cookie, und ein Neuladen reicht.
 */
export async function isAdminSession(sessionCookie: string | undefined): Promise<boolean> {
  if (!sessionCookie) return false;
  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie);
    return isAdminToken({
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified === true,
      admin: decoded.admin === true,
    });
  } catch {
    return false;
  }
}
