import type { Event, EventHint } from '@sentry/nextjs';

/**
 * Ressourcen-Ladefehler aus dem Fehler-Stream halten.
 *
 * Scheitert ein `<link>` oder `<script>` im `<head>`, feuert das Element ein
 * DOM-`Event` vom Typ "error". Der Browser reicht dieses Event-Objekt (kein
 * `Error`) an den globalen Rejection-Handler weiter, und Sentry erfasst es als
 *
 *   Event `Event` (type=error) captured as promise rejection
 *
 * ohne Titel, ohne Stacktrace, ohne Datei. Die Häufungen liegen auf
 * Deploy-Zeitpunkten: Ein Deploy ändert die Chunk-Namen, und wer die Seite in
 * dem Moment offen hat, lädt eine CSS-URL, die es nicht mehr gibt. Für den
 * Besucher folgenlos, für die Fehlerliste ein Sammelbecken, das echte
 * Regressionen überdeckt.
 *
 * Bewusst eng gefasst: Verworfen wird nur, was ein DOM-Event mit einem
 * Ressourcen-Element als Ziel ist. Ein echter `Error`, auch "Loading chunk
 * failed" oder ein fehlgeschlagener dynamischer Import, bringt einen Stacktrace
 * mit, ist auswertbar und kommt durch.
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

const URBAN_VPN_EXECUTOR = 'chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/executors/200.js';

function isUrbanVpnExecutorError(event: Event): boolean {
  const values = event.exception?.values;
  if (values?.length !== 1) return false;

  const [exception] = values;
  const frames = exception.stacktrace?.frames;
  return (
    exception.type === 'TypeError' &&
    exception.value === "Cannot read properties of undefined (reading 'M_ID')" &&
    exception.mechanism?.type === 'auto.browser.global_handlers.onunhandledrejection' &&
    !!frames?.length &&
    frames.every(
      ({ filename, lineno, colno }) =>
        filename === URBAN_VPN_EXECUTOR ||
        (filename === 'app:///executors/200.js' && lineno === 1 && (colno === 761 || colno === 1442))
    )
  );
}

/** Den Urban-VPN-Fehler (JAVASCRIPT-B5) und DOM-Ressourcenfehler verwerfen. */
export function filterBrowserErrors<TEvent extends Event>(
  event: TEvent,
  hint?: EventHint
): TEvent | null {
  if (isResourceLoadEvent(hint?.originalException) || isUrbanVpnExecutorError(event)) return null;
  return event;
}
