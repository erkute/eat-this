/** One explicit light/dark preference for every page and the map. */
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'et-theme';
const ATTR = 'data-theme';

export function currentTheme(): Theme {
  return document.documentElement.getAttribute(ATTR) === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
  const html = document.documentElement;
  html.setAttribute(ATTR, theme);
  // Ohne Speicher (privates Fenster, gesperrte Website-Daten) gilt die Wahl
  // eben nur bis zum Neuladen.
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}

/** Meldet jeden Wechsel am Attribut — auch den, den der Bootstrap vor dem
 *  Hydrieren gesetzt hat, damit die Knöpfe im Menü dieselbe Wahl zeigen. */
export function subscribeTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: [ATTR] });
  return () => observer.disconnect();
}
