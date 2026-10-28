// Die feste E-Mail-Palette folgt den hellen Papierfenstern der App.
// Hex-Farben, Tabellen und vorgerenderte Schrift funktionieren auch in Outlook.

export const COLOR = {
  surface: '#ffffff',
  raised: '#f2f1ef',
  text: '#15120e',
  muted: '#45423e',
  accent: '#ffc600',
  onAccent: '#15120e',
} as const;

// Body copy only. Every brand-font surface is a pre-rendered image (see
// lib/email/brandFont.ts): Gmail strips @font-face, so live text can never
// carry Neue Haas Grotesk Text Pro. This stack is what the live text actually
// renders in — a neutral system sans, chosen over a wrong-flavoured
// handwriting fallback, which reads worse than clean type.
export const BODY_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const LAYOUT = {
  /** Card width — the email equivalent of --et-wrap-max. */
  width: 600,
  padX: 32,
  padXMobile: 20,
  /** --et-radius-photo */
  radiusPhoto: 0,
  /** --et-radius-control */
  radiusControl: 999,
} as const;

/**
 * Haengt als ?v= an den Bildern unter public/pics/email, die KEIN Generator
 * erzeugt (Logo, Starter-Pack-Artwork) und die daher keinen Inhalts-Hash im
 * Manifest tragen. Bei jeder Aenderung an einer dieser Dateien hochzaehlen.
 *
 * Ohne Version liefert Gmails Bild-Proxy eine einmal geholte URL dauerhaft aus
 * seinem Cache aus — eine ersetzte Datei erreicht den Empfaenger dann nie.
 */
export const EMAIL_ASSET_VERSION = '20261028hero2';
