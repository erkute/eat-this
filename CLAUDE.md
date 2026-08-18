# Project Rules

## Repo layout

Fresh repo since 2026-06 (legacy vanilla-JS SPA and one-off migration scripts were removed; the old project lives on locally as archive in `../Eat This`).

- `nextjs/` — the live app (Next.js App Router, deployed via Firebase App Hosting)
- `studio/` — Sanity Studio (deployed manually via `sanity deploy`)

**This file is the source of truth.** `AGENTS.md` holds reference detail that would bloat this file — the design system (tokens, type scale, layout), code conventions (naming, server/client split, GROQ loader pattern, TypeScript/error rules), the Sanity document model, the Stripe fulfillment path, and brand voice. Read it when working in those areas. **On any contradiction, this file wins** and `AGENTS.md` gets corrected. Anything in `docs/` is historical: plans, specs and runbooks record what was decided then, not what is true now.

## Aggressive cleanup is OK (very early stage)

The project has essentially no live users yet — Stripe is in live mode but only for internal testing. When you touch legacy or dead code, **rip it out entirely**: no compatibility shims, no "in case someone migrates" preservation, no deprecation paths. Backwards compatibility for a userbase that doesn't exist is just clutter.

Re-confirm only if the change crosses obvious module boundaries.

## Git Hygiene (parallel sessions)

This repo is occasionally worked on in **multiple agent sessions simultaneously**. The working tree and git index are shared between them, which means one session's staged changes can accidentally be committed by another.

**Before any `git commit`:**

1. Run `git status` and read it fully.
2. If there are staged changes you did not make yourself in this session, **stop and ask the user** — they may belong to another parallel session.
3. Only commit files you explicitly edited in this session. Never use `git add .`, `git add -A`, or `git add -u`. Always stage specific paths.
4. If the user confirms unknown staged files are unrelated, unstage them with `git restore --staged <path>` before committing.

**Before any `git push` to `main`:**

- Confirm the commit range only contains your intended changes (`git log origin/main..HEAD --stat`).
- If anything looks foreign, ask before pushing — `main` auto-deploys to Firebase App Hosting.

## Pre-push hook (DO NOT bypass)

`.githooks/pre-push` runs the **full** build (`npm run build:isolated`, ~30–60 s) before any push that touches `nextjs/`. Same `next build` Firebase App Hosting runs — same config, same errors caught — but it writes to `.next-verify/` instead of `.next/`, so it's safe to push while a local `next dev` is running. If it exits non-zero, the push is aborted.

- **Never** run `git push --no-verify` without an explicit user request, even if the hook complains.
- If the hook reports a build failure, fix the underlying code. The full log is at `/tmp/eat-this-prepush-build.log`.
- **Source of truth is `.githooks/pre-push` (versioned).** Activate it once per clone:
  ```
  git config core.hooksPath .githooks
  ```
  Without that, git only looks in `.git/hooks/`, which is not versioned — the fix
  below would then be missing on a fresh clone.
- Inspect the skip/build decision without paying for a build: `PREPUSH_DRY_RUN=1`.
- **The hook used to skip the build on the first push of every new branch.** On a
  branch the remote does not have yet, `remote_sha` is all-zero and the old code
  fell back to `git diff --name-only <local_sha>` — which compares against the
  _working tree_, identical right after committing, so it always reported "no
  nextjs/ changes". Since the workflow is feature branch → PR into staging, that
  was the push that mattered most. It now lists the commits the push actually
  introduces (`git log --name-only <tip> --not --remotes`).
- Sanity CDN can occasionally time out during static export — retry the push once if the failure is `UND_ERR_CONNECT_TIMEOUT`.

## Deployment

- `nextjs/` is the live app. Push to `main` → Firebase App Hosting auto-builds and deploys.
- CSS source lives in `nextjs/css/`, minified output in `nextjs/public/css/`. Never edit the minified file directly.
- Build CSS with `npm run build:css` before testing changes — dev doesn't auto-rebuild.
- Stylesheet cache-bust is `CSS_VERSION` in `lib/constants.ts`. Nine call sites render it as `?v=` on their `<link rel="stylesheet">` — the `(spa)`, `restaurant`, `bezirk`, `kategorie`, `pack`, `packs`, `profile` and `login` layouts plus `NotFoundAppFrame`. Bump the constant on any `style.css` change; never hand-edit the layouts.

## Tests

154 test files, Vitest. The pre-push hook only *builds* — it does not run tests, so run them yourself before pushing.

**CI does gate this repo** (`.github/workflows/quality.yml`): `npm ci && npm run lint && npm test && npm run build` on every PR into `main` or `staging`, and on every direct push to `staging`. A red test blocks the PR, so a green local `npm test` is the cheap way to find out first. `.github/workflows/lighthouse.yml` additionally runs on `main`.

```bash
npm test --prefix nextjs                 # vitest run
npm run test:watch --prefix nextjs
npm run test:rules --prefix nextjs       # Firestore + Storage rules, needs the Firebase emulators
npm run lint --prefix nextjs
cd nextjs && npx tsc --noEmit
```

`test:rules` boots `firebase emulators:exec` against the throwaway project `eat-this-rules-test`; it is the only test command that needs the emulators. Three `*.styles.test.ts` files parse the stylesheets with PostCSS and assert architectural contracts rather than behaviour: `app/CssArchitecture.styles.test.ts`, `app/components/map/MapArchitecture.styles.test.ts` and `app/components/map/MapDetails.styles.test.ts`. The first asserts four contracts: `!important` only for the documented reduced-motion override, the critical first-paint / mobile-Safari / footer rules, navigation state staying local (no generated-class substring selectors), and the consolidated login states. If it fails after a stylesheet change, that is the intended alarm, not a flake.

## Local agent tooling (`.claude/`)

`.gitignore` excludes `.claude/*` and re-includes exactly two paths: `launch.json` and the `deploy-verify` skill. Everything else below lives **on this machine only** — a fresh clone has none of it.

To share another path, re-include the whole directory chain, not just the file: `!.claude/skills/`, then `.claude/skills/*`, then `!.claude/skills/<name>/`. Git never descends into an excluded directory, so a lone `!.claude/skills/<name>/SKILL.md` is silently ignored and the file stays invisible.

- `settings.json` wires two hooks:
  - **PreToolUse** `hooks/protect-sensitive.sh` — turns edits to `.env*` and `firestore.rules` into an explicit confirmation prompt. It never blocks, it only asks.
  - **PostToolUse** `hooks/format-lint.sh` — runs Prettier `--write` and (for JS/TS under `nextjs/`) ESLint `--fix` on the edited file. Always exits 0, skips `studio/`, `node_modules/` and minified output. **Don't hand-format edited files**; the hook already did.
- `agents/security-reviewer.md` — review agent for diffs touching auth, Stripe, `firestore.rules`, API routes or Cloud Functions.
- `skills/deploy-verify/SKILL.md` **(tracked)** — how to confirm an App Hosting rollout actually landed without being fooled by the CDN edge cache. It also carries the production/staging project pairing, which is the fact most easily got wrong.
- `launch.json` **(tracked)** — dev-server config for the preview pane, `npm run dev` with `autoPort`.

## Restaurant imports

- Restaurant imports are local CLI workflows, not public API routes or Studio browser tools. Secrets must stay in `nextjs/.env.local`.
- Basic draft import: from `nextjs/`, run `npx tsx scripts/import-from-url.ts <google-maps-url>`.
- Enriched auto-publish import: from `nextjs/`, run `npm run import:restaurant -- <google-maps-url>`.
- The enriched importer generates DE/EN descriptions and SEO fields, but deliberately does not publish AI-generated insider tips.

## Staging branch workflow

This repo has a `staging` long-running branch that auto-deploys to its own
App Hosting backend. Feature work flows:

feature branch → PR into `staging` → smoke on staging URL → PR into `main`

**Staging is a separate Firebase project, not a second backend in the production one.** `lib/firebase/project-boundary.ts` actively rejects the production project ID on staging and fails closed; the old staging backend that used to live inside the production project was deleted.

| Branch | Firebase project | Backend | URL |
| --- | --- | --- | --- |
| `main` | `eat-this-8a13b` | `eat-this` | `https://www.eatthisdot.com` |
| `staging` | `eat-this-staging-8a13b` | `eat-this-staging` | `…--eat-this-staging-8a13b.us-central1.hosted.app` |

Always pass `--project` explicitly to any `firebase` command — a bare backend name resolves against whatever project happens to be active, and both projects have same-shaped backends.

- Never push directly to `main` — branch protection now blocks it
- `staging` allows direct push for solo-dev speed
- Staging URL is gated by Basic Auth + `noindex` — see
  `docs/runbooks/2026-05-27-staging-backend-setup.md` for credentials lookup
- Staging runs Stripe in test mode (price IDs differ), Resend is disabled
- Verify `NEXT_PUBLIC_ENV=staging` via the Basic Auth gate and the
  `X-Robots-Tag: noindex, nofollow` response header. There is no visible
  staging banner.

For the migration breakdown, see
`docs/specs/2026-05-27-staging-and-migration-design.md`.

### Name the deployment state exactly

A push is not a deploy. Use these words and don't upgrade one to the next without the evidence:

- `committed` — local only
- `pushed` — the remote ref moved
- `PR` — open, not merged
- `rollout succeeded` — the matching App Hosting backend reports it (see the `deploy-verify` skill; the CDN edge cache makes page polls lie)
- `smoke-tested` — target URL plus the negative security checks actually exercised

Report production as deployed only after `staging → main` merged, the rollout succeeded, and a live smoke passed.

### Standing constraints

- **CSP is `Content-Security-Policy-Report-Only` on purpose.** Don't describe it as enforced.
- **The Sanity CDN purge gate is still open.** It closes only once support confirms and all 23 confidentially stored original asset URLs return non-2xx anonymously. Until then: don't output the URL list, and don't start a substitute content migration.

## Animation — no opacity fades

**Never animate `opacity` for entry/exit motion on the landing or any brand-facing surface.** The user finds opacity fades weak — they read as "appearing" rather than as motion, and they wash out the punch of the brand presence. This preference has been repeated multiple times across the FanCards iterations.

- Entry: translate from off-screen (X or Y), optionally with rotate
- Exit: translate out, or scale-and-translate
- Reveals: clip-path, mask, or absolute repositioning
- If a motion feels "too strong", slow the translate or soften the easing — don't reach for opacity

**Exception:** State changes that aren't motion (button hover lightening, modal backdrop tint, etc.) are fine to drive with opacity. The rule is about _movement_ animations.

## Image assets — PNG → WebP before commit

Any image that ships to the browser (lands under `nextjs/public/`) **must be WebP before it's committed and pushed**. PNG bloats payload ~10× and decode-blocks the main thread on mobile — we've already paid that cost once on the FanCards (1-2 MB raw PNGs from Sanity CDN → ~60 KB WebP via `?auto=format`); don't re-introduce it from the asset side.

- Cutouts with alpha → WebP at `q 80` (keeps edge crispness, see [freigestellte Bilder](#))
- Photographic screenshots / map teasers → WebP at `q 72`
- Source/working files outside `nextjs/public/` (local working dirs, not committed) can stay PNG — they don't ship
- Sanity uploads stay raw; the CDN serves WebP via `lib/sanityImageLoader.ts` (`?auto=format`)

**Keep as PNG (platform requires it):**

- `favicon.ico`, `apple-touch-icon.png`, PWA manifest icons
- OG / Twitter share images (some social previewers still don't decode WebP)

CLI: `cwebp -q 80 in.png -o out.webp` (`brew install webp` once).

## Routing & i18n (next-intl v4)

- **DE at `/`, EN at `/en/...`.** `i18n/routing.ts`: locales `['de','en']`, default `'de'`, `localePrefix: 'as-needed'`, `localeDetection: false` (a NEXT_LOCALE cookie or Accept-Language header doesn't auto-redirect — `/` is always DE).
- Route tree: `app/[locale]/(spa)/{page,[...slug],news/[slug],guides/[slug],map,must-eats}` for the SPA routes, `app/[locale]/{restaurant,bezirk,kategorie,pack,packs,badge,checkout,profile,login,@modal}/...` for the rest. App-root exceptions: `welcome/`, `robots.ts`, `sitemap.ts`, `llms.txt`, `news-sitemap.xml`, `not-found.tsx`, `global-error.tsx`.
- `i18n/request.ts` imports `lib/i18n/translations.ts` as messages — single source of truth.
- `i18n/navigation.ts` exports the locale-aware `Link`, `useRouter`, `usePathname`, `redirect`, `getPathname` from `createNavigation(routing)`. **Use the intl `Link` for all internal nav** — it handles the `/en` prefix automatically.
- `middleware.ts` does more than locale routing. In order: Basic-Auth gate (staging only), apex→www 308, `/api` early-return, `/de`-prefix normalisation, `?lang=de|en` legacy redirects (sets `NEXT_LOCALE` cookie + strips the param), the referral-uid cookie, `NEWS_REDIRECTS`, and a **410 Gone** for permanently closed spots (`GONE_SLUGS` in `lib/seo/legacyRedirects.ts`, inline HTML because CSP forbids inline CSS).
  The matcher excludes `_next`, `_vercel`, `__` (the Firebase Auth proxy), `css`, `js`, `pics`, `fonts`, `welcome`, and anything containing a dot. **`/api` is _not_ excluded by the matcher** — it is skipped by an early return inside the function, so a new `/api` behaviour has to be added there, not to the matcher.
- `app/[locale]/layout.tsx` owns the `<html>`/`<body>` and the `CRITICAL_BOOTSTRAP` inline script that runs synchronously in `<head>` before hydration. The bootstrap sets:
  - `data-active-page` on `<html>` (start/news/map/profile/news-article/about/...) — read by CSS selectors like `[data-active-page="start"] .navbar:not(.scrolled)`
  - `screen.orientation.lock('portrait')` on mobile
  - Pre-hydration login button state from `localStorage._authHint`
- `app/components/ScrollRestorer.tsx` owns back/forward scroll restoration (App Router soft-nav popstate clamps the browser's native restore — see the component header). It sets `history.scrollRestoration = 'manual'` client-side; don't re-add that to the bootstrap or fight it with own popstate scroll code.
- `useTranslation()` in `lib/i18n/I18nContext.tsx` wraps next-intl, exposes `{ lang, t, setLang }`. `setLang` sets the NEXT_LOCALE cookie and soft-navigates via the intl router (`router.replace(pathname, { locale })`).

## Login modal & consent

- **The login modal is the only modal left.** Its state lives in `lib/auth/LoginModalContext.tsx`; open it from anywhere with `const { open } = useLoginModal()` and a mode of `'starter' | 'signin'` (re-exported from `lib/auth`). `app/[locale]/(spa)/BridgeAuth.tsx` renders the portal and syncs auth state — it only *consumes* the context, it does not own the open/close state. Current consumers: `BurgerDrawer`, `MustEatDetail`, `RestaurantDetail`, `RestaurantList`, `lib/map/useFavorites.ts`.
- **AGB and Datenschutz are pages, not modals.** They are Sanity `staticPage` docs served at `/agb` and `/datenschutz` via `app/[locale]/(spa)/[...slug]/page.tsx` → `StaticPages.tsx`; `LoginPanel` links to them with a plain `<a href>`. The old `agbModal` / `datenschutzModal` / `welcomeModal` machinery and the `MODAL_BODIES` table were deleted in 2026-06 — don't reintroduce them.
- **Cookie consent is a banner, not a modal.** `CookieConsent.tsx` renders a fixed bar with an inline expandable info section. The answer lives in a **cookie** (`lib/consent.ts`), not localStorage, so the pre-paint bootstrap can read it, set `html[data-consent="pending"]` and reserve the bar's height (`--consent-bar-h`) before first paint. Changing that storage reintroduces the CLS the cookie was added to fix.

## Gotchas

1. **FOUC of overlay elements.** `.map-spot-overlay`, `.search-overlay`, `.burger-drawer` default to visible because their hide rule lives in `style.min.css` (loaded via `<link>` and may arrive after first paint). The inline-critical hide rule is in `app/globals.css` (Next.js ships it in the app layout CSS bundle). Any new toggle overlay: add `:not(.active) { display: none }` there too.

2. **Mobile rubber-band flash.** `html` has an explicit `background-color` in `globals.css`, otherwise iOS Safari bounce exposes the browser default. Body bg is set too. If you change either, test rubber-band overscroll at top and bottom.

   **The app is light-only, and that is settled (2026-07-30) — dark mode is not coming.** Don't add a `prefers-color-scheme` block, a `data-theme` attribute or a `--dark-*` token, not even "just for this one surface". There is nothing to clean up either: no such rule, attribute, class or flag exists anywhere in `app/`, `css/` or `lib/`.

   What does exist and **must stay** is `color-scheme: light` (twice in `globals.css`). That is not a leftover — it tells the browser the page is light so it stops applying its own dark heuristics to form controls and scrollbars. Removing it lets dark rendering back in sideways.

   Consequences to keep in mind: "theme-aware" backgrounds and testing "in both light and dark" describe something that does not exist, and the map hardcodes CartoDB Positron (`LIGHT_STYLE` in `MapCanvas.tsx`) to match. Sizing, if it is ever re-litigated: 564 hardcoded hex values across 53 CSS files, 18 more in TSX, a dark basemap, and a paper-white sheet that no longer fits over it.

3. **Restaurant + Bezirk EN pages are gated per document by `hasEnContent` (= non-empty `descriptionEn`, see `lib/i18n/pickLocale.ts`).** The schema HAS the EN fields and the enriched importer fills them — as of 2026-06 all restaurants and bezirke have EN content, so their EN canonicals/hreflang/sitemap alternates are live. The gate exists because Google previously flagged EN restaurant URLs without real translations as duplicates and chose its own canonical. If a future doc lacks `descriptionEn`, its EN URL correctly falls back to the DE canonical — don't bypass `hasEnContent`, fill the field instead.

4. **`StaticPages.tsx` renders exactly one page.** It takes a single `StaticPageDoc` and renders that. An earlier version rendered all six static pages (about/contact/press/impressum/datenschutz/agb) on every route, which made the SSR'd HTML nearly identical across URLs and Google refused to index them. Keep the one-doc signature — anything that renders a list of static pages walks back into the duplicate-content trap.

5. **Building while `npm run dev` is alive → use `npm run build:isolated`.** Plain `npm run build` writes to `.next/`, which the dev server is also using — it would overwrite the dev chunks and the server then 500s on missing module IDs. `npm run build:isolated` runs the identical `next build` into `.next-verify/` (via `NEXT_DIST_DIR`, see `next.config.ts`), so it can run concurrently with dev. Use it whenever you need to validate a build without stopping dev (the pre-push hook already does). Plain `npm run build` stays reserved for Firebase App Hosting and clean local builds. `npm run build:css` remains safe during a dev session.

6. **`app/favicon.ico` and `public/favicon.ico` collide.** If both exist, the dev server 500s on `/favicon.ico`. Keep only `public/favicon.ico`.
