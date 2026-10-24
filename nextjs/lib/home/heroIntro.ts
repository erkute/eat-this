/* Solange die Fahrstuhltüren den Hero freigeben, steht `data-hero-intro`
 * am <html>. Remy-Dock und Cookie-Dialog warten auf das Ende des Auftritts.
 * Bei reduzierter Bewegung wird das Attribut gar nicht gesetzt. */

const ATTR = 'data-hero-intro';

/** Ruft `run` auf, sobald kein Auftritt (mehr) läuft — ohne Auftritt sofort.
 *  Mit `maxWaitMs` spätestens dann, falls der Auftritt hängen bleibt. Gibt
 *  eine Funktion zurück, die das Warten abbricht. */
export function afterHeroIntro(run: () => void, maxWaitMs?: number): () => void {
  const html = document.documentElement;
  if (!html.hasAttribute(ATTR)) {
    run();
    return () => {};
  }
  let settled = false;
  let timer = 0;
  const watch = new MutationObserver(() => {
    if (!html.hasAttribute(ATTR)) finish();
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
  watch.observe(html, { attributes: true, attributeFilter: [ATTR] });
  if (maxWaitMs !== undefined) timer = window.setTimeout(finish, maxWaitMs);
  return cancel;
}
