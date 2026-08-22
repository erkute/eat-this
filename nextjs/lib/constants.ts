export const SITE_URL = 'https://www.eatthisdot.com';

// Cache-bust for the manually-linked SPA stylesheet (public/css/style.min.css).
// Single source of truth — every (spa)/restaurant/bezirk/pack/kategorie/
// profile/login layout references this so the value can't drift between routes
// (it had: 6× v=154 vs 1× v=170). BUMP THIS on any css/style.css change.
export const CSS_VERSION = 310;

// Adobe Fonts kit (Providence, chauncy, salted, moonblossom). [locale]/layout
// loads it non-blocking via CRITICAL_BOOTSTRAP, but that script never runs on
// a streamed notFound()/error render — those screens link it themselves.
export const TYPEKIT_STYLESHEET = 'https://use.typekit.net/kgb1lmh.css';

export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) return SITE_URL;
  try {
    return new URL(configured).origin;
  } catch {
    return SITE_URL;
  }
}
