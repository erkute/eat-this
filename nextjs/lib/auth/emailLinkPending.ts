/**
 * Ob gerade ein Link aus der Anmelde-Mail auf seine Bestaetigung wartet.
 *
 * Das Kopf-Skript im Locale-Layout setzt `data-email-link` am <html>, sobald
 * die Adresse einen Anmelde-Link traegt — also vor jedem Effekt der Seite.
 * EmailLinkSignIn nimmt es wieder ab, wenn seine Tafel zugeht. Was von selbst
 * aufgehen will (das Must-Eats-Onboarding im Must-Eat-Detail), wartet so
 * lange: es lag sonst hinter oder vor der Bestaetigung — und nach der
 * Anmeldung geht es ohnehin ins Profil (afterSignIn.ts).
 */
const ATTR = 'data-email-link';

export function finishEmailLink(): void {
  document.documentElement.removeAttribute(ATTR);
}

/** Ruft `run` auf, sobald kein Mail-Link (mehr) wartet — ohne sofort. Gibt
 *  eine Funktion zurueck, die das Warten abbricht. */
export function afterEmailLink(run: () => void): () => void {
  const html = document.documentElement;
  if (!html.hasAttribute(ATTR)) {
    run();
    return () => {};
  }
  const watch = new MutationObserver(() => {
    if (html.hasAttribute(ATTR)) return;
    watch.disconnect();
    run();
  });
  watch.observe(html, { attributes: true, attributeFilter: [ATTR] });
  return () => watch.disconnect();
}
