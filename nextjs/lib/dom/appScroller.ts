/* Ab 768px scrollt nicht das Fenster, sondern `.app-pages` (globals.css,
   Desktop app frame). Der Container wird gesucht statt angenommen: auf dem
   Telefon steht er im Fluss und scrollt gar nicht, dann bleibt das Fenster.
   Welcher von beiden scrollt, entscheidet die Breite — und die kann sich
   während der Sitzung ändern, also jedes Mal neu fragen, nicht merken. */
export function appScroller(): HTMLElement | null {
  const el = document.querySelector<HTMLElement>('.app-pages');
  return el && el.scrollHeight > el.clientHeight + 1 ? el : null;
}
