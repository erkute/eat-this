// The email half of the home design contract. Every value mirrors a token in
// `app/globals.css` (search `--et-home-`) — home stays the visual source of
// truth, this file is its email projection.
//
// Ink seit dem 20.09.2026. Bis dahin stand die Mail auf weissem Papier mit
// roten Headlines — die Gestaltung, die die Seite selbst laengst abgelegt
// hat. Wer den Link anklickte, kam aus einer hellen Mail auf eine dunkle
// Seite. Die Schluessel heissen deshalb jetzt nach ihrer ROLLE, nicht nach
// ihrer Farbe: `surface` ist die Flaeche, `text` die Schrift darauf. Ein
// `paper`, das dunkel ist, haette den naechsten Leser in die Irre gefuehrt.
//
// Zwei bewusste Abweichungen, beide von den Clients erzwungen:
//   * `muted` und `rule` sind flach gerechnete Hex-Werte, keine rgba() —
//     Outlooks Word-Engine verwirft rgba() und rendert stattdessen schwarz,
//     was auf Ink unlesbar waere.
//   * Es gibt keine durchscheinenden Haarlinien; `rule` ist eine feste Farbe.

export const COLOR = {
  /** --et-home-ink — die Flaeche, auf der die Mail steht. */
  surface: '#15120e',
  /** --et-ink-raised — eine Stufe darueber: die Starter-Pack-Tafel. */
  raised: '#25231f',
  /** --et-home-inverse-text — Schrift auf der Flaeche. */
  text: '#ffffff',
  /** Fliesstext: rgba(255,255,255,.76) flach ueber `surface` gerechnet. */
  muted: '#c7c6c5',
  /** --et-home-accent — der eine Akzent: Kicker, Marker, Knopf. */
  accent: '#ffc600',
  /** --et-home-ink — Schrift AUF dem gelben Knopf. */
  onAccent: '#15120e',
  /** Haarlinie: rgba(255,255,255,.14) flach ueber `surface` gerechnet. */
  rule: '#363330',
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
