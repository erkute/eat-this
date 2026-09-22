// Texte von /welcome. Die Seite liegt ausserhalb von [locale] und hat keinen
// next-intl-Provider (eigener <html>-Baum, siehe layout.tsx) — darum ein
// eigenes, kleines Woerterbuch statt lib/i18n/translations.ts.

import type { WelcomeLocale } from '@/lib/auth/welcomeLocale';

export const WELCOME_COPY = {
  de: {
    docTitle: 'Anmeldung',
    splashTitle: 'Gleich geht’s los.',
    splashSub: 'Deine Anmeldung wird vorbereitet.',
    confirmKicker: 'Ein Klick noch',
    confirmTitle: ['Deine Map.', 'Deine Sammlung.'],
    confirmAs: 'Anmelden als',
    confirmCardNote: 'Deine Karte ist im Pack dabei.',
    confirmCta: 'Anmelden',
    next: 'Weiter',
    genericError: 'Etwas ist schiefgelaufen. Versuch es nochmal.',
    emailKicker: 'Noch ein Schritt',
    emailTitle: 'Fast drin',
    emailSub:
      'Du hast den Link in einem anderen Browser geöffnet. Bestätige kurz die E-Mail-Adresse, an die er geschickt wurde.',
    emailPlaceholder: 'deine@email.com',
    emailInvalid: 'Bitte gib eine gültige E-Mail-Adresse ein.',
    signingIn: 'Anmelden …',
    expiredKicker: 'Sackgasse',
    expiredTitle: 'Dieser Link geht nicht mehr',
    expiredSub:
      'Er ist abgelaufen oder wurde bereits verwendet. Starte den Login einfach noch einmal von der Startseite.',
    home: 'Startseite',
    verifiedTitle: 'Bestätigt.',
    verifiedSub: 'Du wirst weitergeleitet …',
    previewEmail: 'du@beispiel.de',
  },
  en: {
    docTitle: 'Sign in',
    splashTitle: 'Almost there.',
    splashSub: 'Getting your sign-in ready.',
    confirmKicker: 'One more click',
    confirmTitle: ['Your map.', 'Your collection.'],
    confirmAs: 'Signing in as',
    confirmCardNote: 'Your card is in the pack.',
    confirmCta: 'Sign in',
    next: 'Next',
    genericError: 'Something went wrong. Please try again.',
    emailKicker: 'One more step',
    emailTitle: 'Almost in',
    emailSub:
      'You opened the link in a different browser. Just confirm the email address it was sent to.',
    emailPlaceholder: 'your@email.com',
    emailInvalid: 'Please enter a valid email address.',
    signingIn: 'Signing in …',
    expiredKicker: 'Dead end',
    expiredTitle: 'This link no longer works',
    expiredSub:
      'It has expired or has already been used. Just start the sign-in again from the homepage.',
    home: 'Home',
    verifiedTitle: 'Confirmed.',
    verifiedSub: 'Redirecting you …',
    previewEmail: 'you@example.com',
  },
} as const satisfies Record<WelcomeLocale, Record<string, string | readonly string[]>>;

export type WelcomeCopy = (typeof WELCOME_COPY)[WelcomeLocale];
