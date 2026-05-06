# Project Rules

## Aggressive cleanup is OK (no live traffic yet)

This project has **no production users yet**. When you touch any area that contains legacy or dead code, **rip it out entirely** — don't leave compatibility shims, don't preserve "in case someone migrates", don't add deprecation paths. Examples:

- Password-based auth methods (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `sendPasswordResetEmail`) → remove, only Magic Link + Google are used
- Legacy `/reset-password*` URLs → no need for redirects, Firebase Console will be repointed
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

- **Never** run `git push --no-verify` without an explicit user request, even if the hook complains.
- If the hook reports a build failure, fix the underlying code. The full log is at `/tmp/eat-this-prepush-build.log`.
- Hook lives in `.git/hooks/pre-push` (shared across worktrees because they all use the same `.git` common dir).
- Sanity CDN can occasionally time out during static export — retry the push once if the failure is `UND_ERR_CONNECT_TIMEOUT`.

## Deployment

- `nextjs/` is the live app. Push to `main` → Firebase App Hosting auto-builds and deploys.
- Service worker cache bump (`nextjs/public/sw.js` `CACHE_VERSION`) is required when shipping breaking asset changes.
- CSS source lives in `nextjs/css/`, minified output in `nextjs/public/css/`. Never edit the minified file directly.
- Build CSS with `npm run build:css` before testing changes — dev doesn't auto-rebuild.
- Stylesheet cache-bust is the `?v=NN` on the `<link rel="stylesheet">` in `app/[locale]/(spa)/layout.tsx`. Bump on any `style.css` change.

## Routing & i18n (next-intl v4)

- **DE at `/`, EN at `/en/...`.** `i18n/routing.ts`: locales `['de','en']`, default `'de'`, `localePrefix: 'as-needed'`, `localeDetection: false` (a NEXT_LOCALE cookie or Accept-Language header doesn't auto-redirect — `/` is always DE).
- Route tree: `app/[locale]/(spa)/{page,[...slug],news/[slug]}` for all SPA routes, `app/[locale]/{restaurant,bezirk,kategorie,profile,login,onboarding}/...` for the rest. App-root exceptions: `welcome/`, `robots.ts`, `sitemap.ts`, `news-sitemap.xml/`.
- `i18n/request.ts` imports `lib/i18n/translations.ts` as messages — single source of truth.
- `i18n/navigation.ts` exports the locale-aware `Link`, `useRouter`, `usePathname`, `redirect`, `getPathname` from `createNavigation(routing)`. **Use the intl `Link` for all internal nav** — it handles the `/en` prefix automatically.
- `middleware.ts`: handles apex→www 308 redirect and `?lang=de/?lang=en` legacy redirects (sets `NEXT_LOCALE` cookie + strips param). Matcher excludes `/api`, `/_next`, static assets, `/welcome`, `/reset-password`.
- `app/[locale]/layout.tsx` owns the `<html>`/`<body>` and the `CRITICAL_BOOTSTRAP` inline script that runs synchronously in `<head>` before hydration. The bootstrap sets:
  - `data-theme` on `<html>` (light/dark, from localStorage / prefers-color-scheme)
  - `data-active-page` on `<html>` (start/news/map/profile/news-article/about/...) — read by CSS selectors like `[data-active-page="start"] .navbar:not(.scrolled)`
  - `history.scrollRestoration = 'manual'`
  - `screen.orientation.lock('portrait')` on mobile
  - Pre-hydration login button state from `localStorage._authHint`
- `useTranslation()` in `lib/i18n/I18nContext.tsx` wraps next-intl, exposes `{ lang, t, setLang, applyTranslations }`. `setLang` does a full-page reload (`window.location.assign`) — kept that way for now because some legacy `<a class="lang-btn">` clicks rely on a fresh DOM.

## Modals

Live React modals: `agbModal`, `datenschutzModal` (rendered by `CookieConsent.tsx` via `MODAL_BODIES` in `lib/i18n/translations.ts`), `welcomeModal` (`WelcomeModal.tsx`). Login modal lives in `BridgeAuth.tsx` as a portal — opened from anywhere via `window.openLoginModal()`. AGB/Datenschutz are kept because the welcome-modal signup flow opens them inline so users don't lose their state mid-registration.

## Gotchas

1. **FOUC of overlay elements.** `.map-spot-overlay`, `.search-overlay`, `.burger-drawer` default to visible because their hide rule lives in `style.min.css` (loaded via `<link>` and may arrive after first paint). The inline-critical hide rule is in `app/globals.css` (Next.js ships it in the app layout CSS bundle). Any new toggle overlay: add `:not(.active) { display: none }` there too.

2. **Mobile rubber-band flash.** `html` has explicit `background-color` per theme in `globals.css`, otherwise iOS Safari bounce exposes the browser default. Body bg is also theme-aware. If you change either, test rubber-band overscroll at top and bottom in both light and dark.

3. **Restaurant + Bezirk pages have no per-locale fields in Sanity yet.** Their EN URL canonical points to the DE URL (see `app/[locale]/restaurant/[slug]/page.tsx`) and the sitemap drops the EN alternate (`deOnly` helper in `app/sitemap.ts`). Do not "fix" by re-adding EN canonical/hreflang until the schema actually has translated content — Google previously flagged 6 EN restaurant URLs as duplicates and chose its own canonical, that's what we worked around.

4. **`StaticPages.tsx` renders only the active page.** It used to render all six (about/contact/press/impressum/datenschutz/agb) on every route, which made the SSR'd HTML almost identical across URLs and Google refused to index them. If you bring it back to "render all", you'll re-introduce the duplicate-content trap.

5. **Don't run `npm run build` while `npm run dev` is alive.** The build overwrites `.next/` chunks and the dev server then 500s on missing module IDs. Stop dev first, or only run `npm run build:css` (safe) during a dev session.

6. **`app/favicon.ico` and `public/favicon.ico` collide.** If both exist, the dev server 500s on `/favicon.ico`. Keep only `public/favicon.ico`.
