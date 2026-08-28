import { browserPopupRedirectResolver, type Auth } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

/**
 * Lädt Firebases Popup-Helfer, BEVOR jemand auf „Mit Google anmelden" klickt.
 *
 * `signInWithPopup` öffnet das Fenster nämlich nicht im Klick-Handler. Es
 * wartet zuerst `resolver._initialize(auth)` ab, und das lädt
 * apis.google.com/js/api.js, hängt den `{authDomain}/__/auth/iframe`-Helfer in
 * die Seite und pingt ihn an. Ein paar hundert Millisekunden Netz später ist
 * die Nutzer-Aktivierung des Klicks abgelaufen, das `window.open` danach läuft
 * in den Popup-Blocker: `auth/popup-blocked`.
 *
 * Beim zweiten Klick liegt der Iframe im Cache, `_initialize` löst sofort auf,
 * das Fenster geht auf. Genau das war der Befund — „erst beim zweiten Klick
 * passiert was" (Nutzer, 28.08.2026), dazu sechs Vorfälle in Produktion, alle
 * mit ebendiesem Code.
 *
 * Das Warmlaufen gehört deshalb vor den Klick — aber nicht auf jede Seite: der
 * Cookie-Banner sagt zu, Google Sign-In lade „nur wenn du es nutzt", und genau
 * dafür verzichtet lib/firebase/config.ts auf den eingebauten Resolver. Der
 * zulässige Moment ist das Öffnen der Anmeldung selbst; bis der Knopf gedrückt
 * wird, vergehen dort Sekunden statt Millisekunden.
 *
 * `_initialize` gehört zur SDK-internen Resolver-Schnittstelle — der
 * öffentliche Typ `PopupRedirectResolver` ist leer. Fehlt die Methode in einer
 * künftigen Firebase-Version, passiert hier nichts und der Klick-Pfad verhält
 * sich wie zuvor.
 */
type WarmableResolver = { _initialize?: (auth: Auth) => Promise<unknown> };

let warmup: Promise<unknown> | null = null;

export function warmGooglePopup(): void {
  if (warmup || typeof window === 'undefined') return;
  const resolver = browserPopupRedirectResolver as unknown as WarmableResolver;
  if (typeof resolver._initialize !== 'function') return;
  warmup = resolver._initialize(auth).catch(() => {
    /* Ein misslungener Versuch darf den Knopf nicht dauerhaft verbauen.
       Firebase verwirft seinen eigenen Cache im Fehlerfall genauso; der
       nächste Aufruf — spätestens `signInWithPopup` — versucht es erneut und
       meldet dann den echten Fehler. */
    warmup = null;
  });
}
