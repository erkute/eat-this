// The email half of the home design contract. Every value mirrors a token in
// `app/globals.css` (search `--et-home-`) — home stays the visual source of
// truth, this file is its email projection.
//
// Two deliberate deviations, both forced by email clients:
//   * `muted` is a solid hex, not the site's rgba(21,18,14,.64) — Outlook's
//     Word engine drops rgba() colours entirely and renders black.
//   * `rule` sits on white only; there are no translucent hairlines.

export const COLOR = {
  /** --et-home-paper */
  paper: '#ffffff',
  /** --et-home-ink */
  ink: '#15120e',
  /** --et-home-accent — the single accent, used as marker squares and pills. */
  accent: '#ffc600',
  /** --et-home-red — headlines and section titles, exactly as on home. */
  red: '#d9382a',
  /** --et-home-quiet — the panel grey behind Starter Pack on home. */
  quiet: '#f2f1ef',
  /** --et-home-rule */
  rule: '#e4e1dc',
  /** Flattened --et-home-muted: rgba(21,18,14,.64) over white. */
  muted: '#5a5550',
  /** --et-home-inverse-text */
  inverse: '#ffffff',
} as const;

// Body copy only. Every brand-font surface is a pre-rendered image (see
// lib/email/brandFont.ts): Gmail strips @font-face, so live text can never
// carry FF Providence Sans Pro. This stack is what the live text actually
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
  radiusPhoto: 10,
  /** --et-radius-control */
  radiusControl: 7,
} as const;

/**
 * Haengt als ?v= an den Bildern unter public/pics/email, die KEIN Generator
 * erzeugt (Logo, Starter-Pack-Artwork) und die daher keinen Inhalts-Hash im
 * Manifest tragen. Bei jeder Aenderung an einer dieser Dateien hochzaehlen.
 *
 * Ohne Version liefert Gmails Bild-Proxy eine einmal geholte URL dauerhaft aus
 * seinem Cache aus — eine ersetzte Datei erreicht den Empfaenger dann nie.
 */
export const EMAIL_ASSET_VERSION = '1';

/** The yellow `hv-mk` square that precedes every section title on home. */
export const MARKER_SIZE = 9;
