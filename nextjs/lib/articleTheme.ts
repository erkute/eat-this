/**
 * Hell oder dunkel — nur im Artikel, nur auf Knopfdruck (Ansage 02.10.2026:
 * „mach noch einen Button, wo man dark und white umschalten kann, im
 * Artikel"). Kein Dark Mode der App und kein `prefers-color-scheme`: die App
 * bleibt light-only, `color-scheme: light` in globals.css bleibt stehen.
 * Dunkel heisst hier der Ink-Grund der Marke, auf dem der Artikel bis zum
 * 02.10. stand.
 *
 * Der Zustand ist ein Attribut an <html>, weil der Grund dort liegt
 * (globals.css) und die Tokens der Seite daran hängen
 * (NewsArticleShell.module.css). Gemerkt wird er pro Browser; der Bootstrap in
 * app/[locale]/layout.tsx setzt ihn vor dem ersten Paint wieder.
 */

export type ArticleTheme = 'light' | 'dark';

export const ARTICLE_THEME_KEY = 'et-article-theme';
const ATTR = 'data-article-theme';

export function currentArticleTheme(): ArticleTheme {
  return document.documentElement.getAttribute(ATTR) === 'dark' ? 'dark' : 'light';
}

export function setArticleTheme(theme: ArticleTheme): void {
  const html = document.documentElement;
  if (theme === 'dark') html.setAttribute(ATTR, 'dark');
  else html.removeAttribute(ATTR);
  // Ohne Speicher (privates Fenster, gesperrte Website-Daten) gilt die Wahl
  // eben nur bis zum Neuladen.
  try {
    if (theme === 'dark') localStorage.setItem(ARTICLE_THEME_KEY, 'dark');
    else localStorage.removeItem(ARTICLE_THEME_KEY);
  } catch {}
}

/** Meldet jeden Wechsel am Attribut — auch den, den der Bootstrap vor dem
 *  Hydrieren gesetzt hat, damit der Knopf im Kopf dieselbe Wahl zeigt. */
export function subscribeArticleTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: [ATTR] });
  return () => observer.disconnect();
}
