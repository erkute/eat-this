/**
 * Ressourcen-Ladefehler aus dem Fehler-Stream halten.
 *
 * Scheitert ein `<link>` oder `<script>` im `<head>`, feuert das Element ein
 * DOM-`Event` vom Typ "error". Der Browser reicht dieses Event-Objekt — kein
 * `Error` — an den globalen Rejection-Handler weiter, und Sentry erfasst es als
 *
 *   Event `Event` (type=error) captured as promise rejection
 *
 * ohne Titel, ohne Stacktrace, ohne Datei. Genau daran ist JAVASCRIPT-3N seit
 * dem 26.05.2026 gewachsen: 56 Vorkommen, davon 13 aus einem einzigen
 * HeadlessChrome-Lauf, und die Häufungen liegen auf Deploy-Zeitpunkten. Der
 * Grund ist banal: ein Deploy ändert die Chunk-Namen, und wer die Seite in dem
 * Moment offen hat, lädt eine CSS-URL, die es nicht mehr gibt. Für den Besucher
 * folgenlos, für die Fehlerliste ein Sammelbecken, das echte Regressionen
 * überdeckt.
 *
 * Bewusst eng gefasst: Verworfen wird nur, was ein DOM-Event mit einem
 * Ressourcen-Element als Ziel ist. Ein echter `Error` — auch
 * "Loading chunk failed" oder ein fehlgeschlagener dynamischer Import — bringt
 * einen Stacktrace mit, ist auswertbar und kommt weiterhin durch.
 */

/** Elemente, deren Ladefehler als DOM-Event statt als Error ankommen. */
const RESOURCE_TAGS = new Set(['link', 'script', 'img', 'source', 'video', 'audio', 'track']);

export function isResourceLoadEvent(originalException: unknown): boolean {
  if (!originalException || typeof originalException !== 'object') return false;

  const candidate = originalException as { type?: unknown; target?: unknown };
  if (candidate.type !== 'error') return false;

  const target = candidate.target;
  if (!target || typeof target !== 'object') return false;

  const tagName = (target as { tagName?: unknown }).tagName;
  if (typeof tagName !== 'string') return false;

  return RESOURCE_TAGS.has(tagName.toLowerCase());
}

/**
 * `beforeSend`-Hook für Sentry: `null` verwirft das Event, alles andere geht
 * unverändert raus.
 */
export function dropResourceLoadErrors<TEvent>(
  event: TEvent,
  hint?: { originalException?: unknown }
): TEvent | null {
  return isResourceLoadEvent(hint?.originalException) ? null : event;
}
