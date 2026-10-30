/* `data-hero-intro` hält Remys Auftritt fest, `data-hero-cards` das folgende
 * Auffächern und Aufdecken der Karten. Bei reduzierter Bewegung entfallen
 * beide Phasen. */

const ATTR = 'data-hero-intro';
export const HERO_CARDS_ATTR = 'data-hero-cards';

/** Ruft `run` auf, sobald kein Auftritt (mehr) läuft — ohne Auftritt sofort.
 *  Mit `maxWaitMs` spätestens dann, falls der Auftritt hängen bleibt. Gibt
 *  eine Funktion zurück, die das Warten abbricht. */
export function afterHeroIntro(run: () => void, maxWaitMs?: number): () => void {
  return afterHeroPhases([ATTR], run, maxWaitMs);
}

/** Der Cookie-Dialog wartet auf Remy und die fertig aufgedeckten Karten. */
export function afterHeroReveal(run: () => void, maxWaitMs?: number): () => void {
  return afterHeroPhases([ATTR, HERO_CARDS_ATTR], run, maxWaitMs);
}

function afterHeroPhases(attributes: string[], run: () => void, maxWaitMs?: number): () => void {
  const html = document.documentElement;
  const pending = () => attributes.some((attribute) => html.hasAttribute(attribute));
  if (!pending()) {
    run();
    return () => {};
  }
  let settled = false;
  let timer = 0;
  const watch = new MutationObserver(() => {
    if (!pending()) finish();
  });
  const cancel = () => {
    settled = true;
    watch.disconnect();
    window.clearTimeout(timer);
  };
  function finish() {
    if (settled) return;
    cancel();
    run();
  }
  watch.observe(html, { attributes: true, attributeFilter: attributes });
  if (maxWaitMs !== undefined) timer = window.setTimeout(finish, maxWaitMs);
  return cancel;
}
