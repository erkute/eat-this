/**
 * Wohin eine Anmeldung fuehrt, wenn sie durch ist.
 *
 * Ins Profil (Nutzer, 24.09.2026: „kann man nicht einfach ins Profil nach
 * dem Einloggen") — aber nur, wenn nichts anderes wartet:
 *
 * - Ein NEUES Konto bleibt stehen: dort laeuft die Starter-Pack-Tour
 *   (SignInReward), und ein Seitenwechsel wuerde sie abwuergen.
 * - Wer sich angemeldet hat, weil er eine verdeckte Karte oder ein Herz
 *   angetippt hat, bleibt ebenfalls: die Karte soll im Pack aufgehen, der Spot
 *   sichtbar gespeichert werden — genau dort, wo er gegriffen hat.
 * - Wer schon im Profil steht, muss nirgends hin.
 */
export const PROFILE_PATH = '/profile';

export function shouldGoToProfile({
  isNewUser,
  hasIntent,
  pathname,
}: {
  isNewUser: boolean;
  hasIntent: boolean;
  /** Ohne Sprach-Praefix, wie ihn `usePathname` aus i18n/navigation liefert. */
  pathname: string;
}): boolean {
  return !isNewUser && !hasIntent && pathname !== PROFILE_PATH;
}

/**
 * Die Google-Anmeldung passiert in der Anmelde-Tafel (LoginBoard), und die
 * steckt in Komponenten ohne eigenen Router (Modal, Startseiten-Tafel). Sie
 * meldet deshalb nur, dass jemand angekommen ist; weiter schickt
 * EmailLinkSignIn, das in jedem Seitenlayout haengt.
 */
export const SIGNED_IN_EVENT = 'eatthis:signed-in';

export interface SignedInDetail {
  isNewUser: boolean;
  hasIntent: boolean;
}

export function announceSignedIn(detail: SignedInDetail): void {
  window.dispatchEvent(new CustomEvent<SignedInDetail>(SIGNED_IN_EVENT, { detail }));
}
