'use client';
import { auth } from '@/lib/firebase/config';
import { HEART_PARAM } from '@/lib/auth/loginContinueUrl';

/**
 * Das Herz, das jemand vergeben wollte, bevor der Login dazwischenkam.
 *
 * Wer ausgeloggt auf ein Herz tippt, bekommt das Login-Modal — und stand
 * danach vor demselben leeren Herz wie vorher. Der Tap war weg, und mit ihm
 * der Grund, sich ueberhaupt anzumelden. Also wird die Absicht gemerkt und
 * eingeloest, sobald ein Konto da ist.
 *
 * Zwei Traeger, weil der Login zwei Wege nimmt:
 *   sessionStorage — Google. Popup bleibt im selben Dokument, der
 *     Redirect-Ausweichweg (siehe AuthContext) kommt in denselben Tab zurueck.
 *   ?heart=<id>    — Magic-Link. Der Link oeffnet routinemaessig in einem
 *     ANDEREN Browser (Gmail-App → Chrome), dort ist der sessionStorage leer;
 *     nur die Continue-URL ueberlebt den Posteingang. Derselbe Weg, den der
 *     Gratis-Spot mit `claim=1` schon geht.
 *
 * Der Merker verfaellt: er deckt nur die Sekunden zwischen Tap und Anmeldung
 * im selben Tab ab. Wer das Modal wegklickt und eine halbe Stunde spaeter
 * ueber das Burger-Menue hereinkommt, soll nicht ploetzlich einen Spot geherzt
 * bekommen, an den er nicht mehr denkt.
 */

const STORAGE_KEY = 'eatthis_pending_heart';
const PENDING_TTL_MS = 10 * 60 * 1000;

export function rememberPendingHeart(restaurantId: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: restaurantId, at: Date.now() }));
  } catch {
    /* private mode — der URL-Traeger deckt den Mail-Weg trotzdem ab */
  }
}

function takeFromStorage(): string | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { id?: unknown; at?: unknown };
    if (typeof parsed.id !== 'string' || !parsed.id) return null;
    if (typeof parsed.at !== 'number' || Date.now() - parsed.at > PENDING_TTL_MS) return null;
    return parsed.id;
  } catch {
    return null;
  }
}

/* Der Marker verlaesst die Adresszeile, sobald er gelesen ist: ein Reload
   duerfte den Spot sonst ein zweites Mal herzen — und ein geteilter Link
   jedem Empfaenger ein Herz unterschieben. */
function takeFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const id = params.get(HEART_PARAM);
  if (!id) return null;
  params.delete(HEART_PARAM);
  const query = params.toString();
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}`
  );
  return id;
}

async function applyPendingHeart(restaurantId: string, locale: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const token = await user.getIdToken();
    /* Immer 'add', nie ein Toggle: der Tap von vorhin galt einem leeren Herz,
       und /api/heart ist bei 'add' idempotent. */
    const res = await fetch('/api/heart', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ restaurantId, action: 'add' }),
    });
    if (!res.ok) throw new Error(`heart ${res.status}`);
  } catch {
    window.showNotification?.(
      locale === 'en' ? 'Something went wrong' : 'Etwas ist schiefgelaufen'
    );
    return;
  }
  /* Laenger als die Standardmeldung: beim Google-Weg liegt bis zu diesem
     Moment noch der Wartescreen (AUTH_SCREEN_HOLD_MS) darueber, und die
     Bestaetigung soll danach noch zu lesen sein. */
  window.showNotification?.(locale === 'en' ? 'Spot saved' : 'Spot gespeichert', 5000);
}

let settling: { uid: string; promise: Promise<void> } | null = null;

/**
 * Loest ein ausstehendes Herz ein und meldet, wann das erledigt ist.
 *
 * useFavorites wartet darauf, BEVOR es die Favoriten liest — sonst laeuft die
 * Leseanfrage gegen den Stand von vor dem Schreiben, und das gerade vergebene
 * Herz waere im ersten Bild wieder leer. Mehrere useFavorites auf einer Seite
 * (Karte und Buddy-Widget) teilen sich dieselbe Zusage: eingeloest wird einmal.
 */
export function settlePendingHeart(uid: string, locale: string): Promise<void> {
  if (settling?.uid === uid) return settling.promise;
  const restaurantId = takeFromUrl() ?? takeFromStorage();
  if (!restaurantId) return Promise.resolve();
  const promise = applyPendingHeart(restaurantId, locale);
  settling = { uid, promise };
  return promise;
}
