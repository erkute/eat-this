/**
 * Wohin eine Anmeldung führt, wenn sie durch ist: immer ins Profil, egal, ob
 * sie im Burger-Menü, an einer verdeckten Karte, an einem Herz oder auf der
 * Startseiten-Tafel angefangen hat.
 *
 * Was die Anmeldung mitbringt, geht mit: Die Tour eines neuen Kontos hängt im
 * Locale-Layout (SignInReward) und läuft über dem Profil weiter, die angetippte
 * Karte liegt im Pack, das gemerkte Herz löst useFavorites in der Spot-Liste
 * des Profils ein (beide über den sessionStorage, siehe EmailLinkSignIn).
 */
export const PROFILE_PATH = '/profile';

/** Ohne Sprach-Praefix, wie ihn `usePathname` aus i18n/navigation liefert. */
export function shouldGoToProfile(pathname: string): boolean {
  return pathname !== PROFILE_PATH;
}

/**
 * Die Google-Anmeldung wird in AuthContext bestaetigt oder kommt
 * ueber den Redirect zurueck (AuthContext) — beides ohne eigenen Router. Sie
 * meldet deshalb nur, dass jemand angekommen ist; weiter schickt
 * EmailLinkSignIn, das in jedem Seitenlayout haengt.
 */
export const SIGNED_IN_EVENT = 'eatthis:signed-in';

export function announceSignedIn(): void {
  window.dispatchEvent(new Event(SIGNED_IN_EVENT));
}
