# Project Rules

## Aggressive cleanup is OK (no live traffic yet)

This project has **no production users yet**. When you touch any area that contains legacy or dead code, **rip it out entirely** — don't leave compatibility shims, don't preserve "in case someone migrates", don't add deprecation paths. Examples:

- Password-based auth methods (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `sendPasswordResetEmail`) → remove, only Magic Link + Google are used
- Legacy `/reset-password*` URLs → no need for redirects, Firebase Console will be repointed
- `window._sendPasswordReset` and similar globals from BridgeAuth → remove
- Old translation keys that are no longer referenced → remove
- Old static HTML at root (`reset-password.html`, etc.) → delete

The user prefers a smaller, cleaner codebase over backwards compatibility for a userbase that doesn't exist. Re-confirm only if the change crosses obvious module boundaries.

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

## Pre-push hook (DO NOT bypass)

`.git/hooks/pre-push` runs the **full** `npm run build` (~30–60 s) before any push that touches `nextjs/`. Mirrors Firebase App Hosting's build step exactly. If it exits non-zero, the push is aborted.

Reason: a parallel session once shipped broken JSX (`<a href="/">` in `reset-password/page.tsx`) that compiled locally but failed Next.js's lint step → four Firebase rollouts in a row failed → no deploys for either session for hours. The hook makes that impossible.

- **Never** run `git push --no-verify` without an explicit user request, even if the hook complains.
- If the hook reports a build failure, fix the underlying code. The full log is at `/tmp/eat-this-prepush-build.log`.
- Hook lives in `.git/hooks/pre-push` (shared across worktrees because they all use the same `.git` common dir).

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

6. **Do not reintroduce dead modals.** The raw-HTML modals for About/Contact/Press/Impressum were removed in Phase B; the burger menu links directly to the full React pages at `/about`, `/contact`, etc. (`StaticPages` component). Still live: `agbModal`, `datenschutzModal`, `cookieInfoModal`, `welcomeModal`, `eatModal` — all now React components. The AGB and Datenschutz modals are specifically kept because the welcome-modal signup flow (`wmAgbTrigger`, `wmDatenschutzTrigger` in `auth.min.js`) opens them inline so users don't lose their registration state.

## Phase B migration — COMPLETE (commit aee4bc0)

`spa-content.ts` is deleted. All HTML migrated to React components:

| Component | File |
|---|---|
| MustsSection | `app/components/MustsSection.tsx` |
| MapSection | `app/components/MapSection.tsx` |
| NewsSection | `app/components/NewsSection.tsx` |
| NewsArticleShell | `app/components/NewsArticleShell.tsx` |
| ProfileSection | `app/components/ProfileSection.tsx` |
| StaticPages | `app/components/StaticPages.tsx` |
| EatModal | `app/components/EatModal.tsx` |
| SearchOverlay | `app/components/SearchOverlay.tsx` |
| CookieConsent (+AGB/Datenschutz/CookieInfo modals) | `app/components/CookieConsent.tsx` |
| WelcomeModal | `app/components/WelcomeModal.tsx` |

Onboarding moved out of the SPA shell entirely — it now lives at `/onboarding` (`app/[locale]/onboarding/OnboardingFlow.tsx`) as its own route. The legacy inline `#onboardingOverlay` overlay and its `_obGoTo`/`showOnboarding` globals were removed from `app.min.js` in Phase C PR1 (2026-05-05).

SiteFooter rendered by each page component directly (MustsSection, NewsSection, ProfileSection, StaticPages, NewsArticleShell). Map page excluded — no footer by design.

Note: `CookieConsent.tsx` AGB/Datenschutz/cookie modal bodies are now React-rendered via `MODAL_BODIES` in `lib/i18n/translations.ts`. No more `data-i18n-html` attributes.

## Phase C — progress

Goal: drop all minified legacy bundles (`app.min.js`, `map-init.min.js`, `cms.min.js`, `i18n.min.js`, `auth.min.js`) and the two shims.

Status:
1. **i18n.min.js** — ✅ DROPPED. `BridgeI18n` covers `window.i18n`. All `data-i18n*` attributes removed.
2. **auth.min.js** — ✅ DROPPED. `WelcomeModal.tsx` handles auth UI. `BridgeAuth` covers all `window._*` globals and auth-state side effects. `firebase-init.min.js` bridges CDN SDK for remaining legacy scripts (favourites/packs/profile). `openLoginModal` / `openWelcomeModal` both open `#welcomeModal`.
3. **cms.min.js** — ⏸ BLOCKED. `app.min.js` still calls `window.CMS.*` (fetchMustEats, fetchRestaurants, fetchHeroSettings). Must drop after app.min.js.
4. **app.min.js** — in progress. 42373 → 41131 B after PR1 (commit `1db7f15`, 2026-05-05) ripped the dead onboarding overlay block (`_obGoTo`/`showOnboarding`/`obStep*`/`obNext*`/`obSkip*`/`obOpenPackBtn` — superseded by the `/onboarding` route). Audit findings for the remaining content:
   - **Pure dead, safe to rip:** `.hero-slide` slideshow block (~453 B) — DOM never rendered by React.
   - **Dead inner forEach but live scroll handler:** `.start-img-wrap` parallax IIFE binds scroll on `.app-page[data-page="start"]` (live) but iterates over `.start-img-wrap` nodes (none rendered). Surgical rip possible (~800 B).
   - **NOT dead, looked dead:** `_startScrollHandler` and `.start-scroll-content` are bound to live React-rendered DOM in SPAShell. `hero-desktop-tagline` is rendered by HeroSection.tsx.
   - **Bigger than first audit suggested:** `_bindNewsCards` is not just click-binding — it couples to the article-rendering pipeline (`Ne()`/`De()`/`de(slug)`/`ne(card)`/`_pendingArticleSlug`) that fills NewsArticleShell's empty DOM slots after CMS fetch. Migrating it requires moving article-body rendering to RSC/React, not just porting a click handler.
   - **Bridges live external callers:** `_showSpotDetail`/`_allSpots` are read by `favourites.min.js` even though MapSection is React. Need a React-side bridge before ripping.
5. **map-init.min.js** — ✅ REPLACED. `MapSection.tsx` is now a full react-map-gl + MapLibre implementation (Carto Positron/Dark Matter tiles, dark-mode detect, restaurant + Must-Eat layers, GPS-based viewport list, Firestore-persisted 200 m Must-Eat unlocks). No `<Script>` tag loads map-init.min.js — it was only fetched dynamically by `app.min.js`, so the file stays on disk until app.min.js is gone too. Hooks/components live under `lib/map/` and `app/components/map/`.
6. Shims drop automatically once app.min.js is gone.
