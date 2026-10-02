/* Der Auftritt der Startseite: Remy schiebt den Vorhang weg, die Marke wird
 * auf ihren Platz geschubst, die Headline stempelt ein. Solange er läuft,
 * steht `data-hero-intro` am <html> — gesetzt vom Kopf-Skript in
 * app/[locale]/layout.tsx, genommen von HubMotion (`finishIntro`). Ohne
 * Auftritt (andere Seiten, reduzierte Bewegung) fehlt es von Anfang an.
 *
 * Wer erst danach auftauchen soll, wartet hier: der Remy-Knopf unten rechts
 * (Ansage 30.09.2026) und der Cookie-Dialog (Ansage 02.10.2026: „die Cookies
 * kommen zu früh" — am Telefon lag er ab ~2 s über dem schiebenden Remy). */

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
