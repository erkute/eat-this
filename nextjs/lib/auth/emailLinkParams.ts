/**
 * Was der Link aus der Anmelde-Mail an die Zielseite hängt.
 *
 * `mode`, `oobCode` und `apiKey` liest `signInWithEmailLink`; `e` ist die
 * Adresse, an die der Link ging. Gebaut in lib/auth/sendMagicLink.ts,
 * eingelöst und sofort aus der Adresszeile geräumt in
 * app/components/EmailLinkSignIn.tsx.
 */
export const EMAIL_LINK_EMAIL_PARAM = 'e';
export const EMAIL_LINK_PARAMS = ['mode', 'oobCode', 'apiKey', EMAIL_LINK_EMAIL_PARAM] as const;
