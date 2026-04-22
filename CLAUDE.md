# Project Rules

## Git Hygiene (parallel sessions)

This repo is occasionally worked on in **multiple Claude sessions simultaneously**. The working tree and git index are shared between them, which means one session's staged changes can accidentally be committed by another.

**Before any `git commit`:**

1. Run `git status` and read it fully.
2. If there are staged changes you did not make yourself in this session, **stop and ask the user** — they may belong to another parallel session.
3. Only commit files you explicitly edited in this session. Never use `git add .`, `git add -A`, or `git add -u`. Always stage specific paths.
4. If the user confirms unknown staged files are unrelated, unstage them with `git restore --staged <path>` before committing.

**Before any `git push` to `main`:**

- Confirm the commit range only contains your intended changes (`git log origin/main..HEAD --stat`).
- If anything looks foreign, ask before pushing — `main` auto-deploys to Firebase App Hosting.

## Deployment

- `nextjs/` is the live app. Push to `main` → Firebase App Hosting auto-builds and deploys.
- Service worker cache bump (`nextjs/public/sw.js` `CACHE_VERSION`) is required when shipping breaking asset changes.
- CSS source lives in `nextjs/css/`, minified output in `nextjs/public/css/`. Never edit the minified file directly.
- Build CSS with `npm run build:css` before testing changes — dev doesn't auto-rebuild.

## Routing & i18n (next-intl)

Live structure: DE served at `/`, EN at `/en/...` (Phase A, commit `db0110a`).

- Route tree: `app/[locale]/(spa)/...` and `app/[locale]/restaurant/...`. Exceptions at app root: `reset-password/`, `robots.ts`, `sitemap.ts`, `news-sitemap.xml/`.
- `i18n/routing.ts` defines locales `['de','en']`, default `'de'`, `localePrefix: 'as-needed'`.
- `i18n/request.ts` imports the existing `lib/i18n/translations.ts` as messages — do not duplicate.
- `middleware.ts` handles `?lang=en` / `?lang=de` legacy redirects to `/en/...` or strips the param. Matcher excludes `/reset-password`, `/api`, `/_next`, static asset folders.
- Root `app/layout.tsx` is a minimal pass-through; `<html>`/`<body>` live in `app/[locale]/layout.tsx` so `lang` is locale-aware.
- `useTranslation()` in `lib/i18n/I18nContext.tsx` is a thin wrapper over next-intl — keeps the legacy `{ lang, t, setLang, applyTranslations }` API so components don't need rewriting. `setLang` does a full-page reload (`window.location.assign`) because the legacy minified JS relies on DOMContentLoaded re-running for the new locale.
- Internal links use `app/components/LocaleLink.tsx` — plain `<a>` with locale-aware href prefix. Never use `next/link` for SPA nav while legacy init is still in play: client-side soft-nav skips `DOMContentLoaded` and breaks map/album init.

## Legacy JS bridge shims (remove with Phase B)

Three tiny shims in `public/js/` that make vanilla SPA JS (`app.min.js`, `map-init.min.js`, `i18n.min.js`, `cms.min.js`, `auth.min.js`) cooperate with the new routing. Don't touch without understanding why they exist:

- `legacy-domready-shim.js` — `DOMContentLoaded` already fired by the time `afterInteractive` scripts load. Shim queues late handlers on a microtask.
- `legacy-locale-shim.js` — bridges `/en/*` URL prefix for legacy JS. Sets `window.__basePath` and `window._path()` (pathname with locale stripped), monkey-patches `history.pushState`/`replaceState` to re-prepend the prefix, and dedupes pushState-to-current-URL so back navigation works.
- `app.min.js` sed-patched: all `window.location.pathname` reads became `window._path()` (commit `e89788c`).

## Gotchas learned the hard way

1. **Relative asset paths in minified legacy JS break on `/en/` prefix.** `fetch('js/map-init.min.js')` resolves against the current URL, so `/en/map` loads `/en/js/map-init.min.js` (404). Fix: always leading slash. Patched so far: `map-init.min.js`, `css/map.min.css`, `css/leaflet.min.css`, `pics/eat.webp`, `pics/logo.webp`, `pics/globe.webp`, `pics/point_red.webp`. If markers/icons/tiles break again on EN, look here first.

2. **FOUC of overlay elements on reload.** `.map-spot-overlay`, `.search-overlay`, `.burger-drawer` default to visible because their hide rule lives in external `style.min.css`. The inline-critical hide rule is in `app/globals.css` (Next.js ships it in the app layout CSS bundle). Any new toggle overlay: add `:not(.active) { display: none }` there, NOT only in `style.css`.

3. **Mobile rubber-band white flash.** `html` needs an explicit `background-color` (off-white / black per theme) in `globals.css`, otherwise iOS Safari bounce exposes the browser default white.

4. **Map page reload flash of search/nearby.** Those elements are CSS-gated by `.app-page[data-page="map"].map-ready`. `map-init.min.js` adds `map-ready` when Leaflet init starts. If you rewrite map-init, preserve this hook.

5. **`setLang` must full-reload.** Don't try to soft-nav on locale switch while `app.min.js` / `map-init.min.js` / `i18n.min.js` are still loaded — their DOMContentLoaded-bound init will not re-run and the page goes half-stale.

6. **Do not reintroduce dead modals.** The raw-HTML modals for About/Contact/Press/Impressum in `app/[locale]/(spa)/spa-content.ts` were removed (Phase B); the burger menu links directly to the full React pages at `/about`, `/contact`, etc. (`StaticPages` component). Still live: `agbModal`, `datenschutzModal`, `cookieInfoModal`, `welcomeModal`, `eatModal` — the AGB and Datenschutz modals specifically are kept because the welcome-modal signup flow (`wmAgbTrigger`, `wmDatenschutzTrigger` in `auth.min.js`) opens them inline so users don't lose their registration state.

## Phase B migration (legacy → React) — in progress

Remaining raw-HTML chunks in `app/[locale]/(spa)/spa-content.ts`:
- Musts-page shell (album container)
- Map-page shell (search, filter chips, nearby grid, spot overlay)
- Profile-page shell (~180 lines)
- News-article template (empty, filled by `app.min.js`)
- Live modals (AGB, CookieInfo, Welcome, Eat), site-footer `<template>` (stamped by app.min.js into every non-map page)

Goal end state: delete `spa-content.ts`, `app.min.js`, `map-init.min.js`, `cms.min.js`, `i18n.min.js`, both locale/domready shims; replace with React components. When all `data-i18n-html` callsites are gone, `i18n.min.js` can be dropped immediately — next-intl covers everything else.
