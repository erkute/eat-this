# Eat This — Agent Instructions

This file is the operational source of truth for work in this repository.
Documents under `docs/specs/`, `docs/plans/`, and dated runbooks describe past
decisions and setup work; verify them against the current code before following
their commands.

## 1. Project overview

The repository was rebuilt in 2026-06. The retired vanilla-JS SPA and one-off
migration scripts are not part of this codebase; a local archive lives at
`../Eat This`.

- `nextjs/` — production application: Next.js 15 App Router, React 19,
  TypeScript, Firebase App Hosting
- `studio/` — Sanity Studio, deployed manually with `sanity deploy`
- `docs/` — historical specs, implementation plans, and operational runbooks
- `.github/workflows/` — GitHub quality and Lighthouse workflows

Runtime baseline:

- Node.js `20.19.6` from the root `.nvmrc`
- `package.json` engines: `>=20.19 <21`
- npm lockfiles are authoritative; use `npm ci` for clean installs

## 2. How to work

### Think before changing code

- State assumptions and tradeoffs before implementation.
- If multiple interpretations would materially change the result, present them
  or ask instead of silently choosing.
- Prefer the smallest solution that fully satisfies the request.
- Do not add speculative features, compatibility shims, configuration, or
  abstractions.
- For multi-step work, define a short plan with a verification step for each
  meaningful outcome.

### Keep changes surgical

- Touch only files required by the request.
- Match the existing style and architecture.
- Do not reformat or refactor unrelated code.
- Remove imports, variables, helpers, tests, and files made obsolete by your
  own change.
- Mention unrelated dead code instead of deleting it.

The project has essentially no public users yet. When the requested work
touches clearly dead or legacy code within the same module boundary, remove it
completely. Do not preserve migration paths for hypothetical users. Ask before
crossing an obvious module boundary.

### Work toward verifiable outcomes

- Bug fix: identify or add a reproduction, then prove it passes.
- Refactor: verify relevant behavior before and after.
- UI change: check the rendered DOM, computed styles, accessibility, responsive
  layout, and interactions.
- Deployment: verify the intended remote branch and Firebase backend. A local
  commit, GitHub push, PR, and Firebase rollout are four different states.

## 3. Local development and checks

From the repository root:

```bash
nvm use
npm run dev
npm run lint
npm test
npm run build
```

Equivalent app commands can be run from `nextjs/`. Useful explicit checks:

```bash
cd nextjs
npm run lint
npm test
npx tsc --noEmit
npm run build:isolated
```

- `npm run dev` first builds the legacy stylesheet, then starts Next.js on
  `localhost:3000`.
- Keep the dev server running across normal UI iterations and browser feedback.
- Do not stop it merely because QA is complete.
- A normal `npm run build` writes to `.next/` and can corrupt a running dev
  server. Stop dev first, or use `npm run build:isolated`, which writes to
  `.next-verify/` and is safe alongside dev.
- `npm run build:css` is safe while dev is running.

GitHub's `Quality` workflow runs `npm ci`, lint, tests, and the production build
for PRs into `main` or `staging`, and for pushes to `staging`.

## 4. Git hygiene in parallel sessions

The working tree and index may be shared by multiple Codex sessions.

Before every commit:

1. Run `git status` and read it completely.
2. Stop and ask if staged changes were not made in the current session.
3. Stage only explicit paths edited in this session.
4. Never use `git add .`, `git add -A`, or `git add -u`.
5. If the user confirms foreign staged changes are unrelated, unstage only
   those paths with `git restore --staged <path>`.

Before every push:

- Fetch the remote and inspect the exact outgoing commit range.
- Do not push unrelated work from another session.
- Never force-push shared long-running branches.
- Never push directly to `main`; branch protection requires a PR.

## 5. Pre-push hook

`.git/hooks/pre-push` runs `npm run build:isolated` when the outgoing range
touches `nextjs/`. It skips documentation-only pushes. The isolated build
mirrors Firebase App Hosting without overwriting the live dev server's `.next/`.

- Never bypass it with `--no-verify` unless the user explicitly requests that.
- If it fails, fix the cause. The complete log is at
  `/tmp/eat-this-prepush-build.log`.
- A Sanity CDN `UND_ERR_CONNECT_TIMEOUT` during static generation may be
  transient; retry once before changing code.

## 6. Branch and Firebase deployment workflow

There are two long-running branches and two App Hosting backends:

| Git branch | Firebase backend   | Environment                  | Public URL                                                        |
| ---------- | ------------------ | ---------------------------- | ----------------------------------------------------------------- |
| `staging`  | `eat-this-staging` | `NEXT_PUBLIC_ENV=staging`    | `https://eat-this-staging--eat-this-8a13b.us-central1.hosted.app` |
| `main`     | `eat-this`         | `NEXT_PUBLIC_ENV=production` | `https://www.eatthisdot.com`                                      |

A push to `staging` deploys only the staging backend. It does not deploy
production. Production starts only after the corresponding PR is merged into
`main`.

Normal promotion path:

```text
feature branch or local staging work
  -> PR/push to staging
  -> successful staging rollout
  -> staging smoke test
  -> PR from staging to main
  -> successful GitHub checks
  -> merge PR
  -> successful production rollout
  -> live-site smoke test
```

If the user asks to "push to Firebase", "deploy", "publish", or "make it
live", establish the intended environment. If production is clearly intended,
do not stop after pushing `staging` or opening the promotion PR. Complete the
merge and verify the production rollout unless the user explicitly asks for
only staging or only a PR.

Before merging a promotion PR:

1. Confirm the PR is exactly `staging -> main` and is mergeable.
2. Inspect `git log origin/main..origin/staging --stat` for foreign commits.
3. Wait for relevant GitHub checks to finish successfully.
4. Merge through the PR; never simulate the merge with a direct main push.

After pushing or merging, verify instead of assuming:

```bash
git fetch origin main staging
git rev-parse origin/staging
git rev-parse origin/main
gh pr view <number> --json state,mergedAt,mergeCommit,statusCheckRollup
firebase apphosting:backends:list --project eat-this-8a13b
curl -I https://www.eatthisdot.com/
```

Report deployment state precisely:

- "committed" — commit exists locally
- "pushed to staging" — `origin/staging` contains it
- "staging deployed" — the staging App Hosting rollout succeeded and smoke
  checks passed
- "merged to main" — the promotion PR was merged
- "production deployed" — the production backend rollout succeeded and the
  live URL was verified

Do not claim a Firebase deployment based only on `git push` output. App Hosting
rollouts are asynchronous and can take several minutes.

### Environment configuration

- `nextjs/apphosting.yaml` contains production defaults.
- `nextjs/apphosting.staging.yaml` overrides the staging environment.
- Staging is protected by Basic Auth and must return
  `X-Robots-Tag: noindex, nofollow`; its sitemap is empty and robots disallows
  crawling.
- Staging uses Stripe test-mode secrets and a separate webhook secret.
- Treat all `.env.local` values, Firebase secrets, Stripe credentials, and
  Basic Auth credentials as secrets. Never print or commit them.
- Before testing email on staging, verify that production Resend credentials
  are not available to the staging backend.

## 7. CSS and frontend architecture

- `nextjs/app/globals.css` contains critical, app-wide CSS that must be present
  before hydration.
- `nextjs/css/style.css` is the source for the manually linked SPA stylesheet.
- `nextjs/public/css/style.min.css` is generated output. Never edit it by hand.
- Run `npm run build:css` after changing `style.css`.
- Bump `CSS_VERSION` in `nextjs/lib/constants.ts` whenever `style.css` changes.
- Prefer CSS Modules for component-specific styles already using that pattern.
- The app is light-only. Do not add theme toggles, dark-mode branches, or
  `prefers-color-scheme` variants.

### Brand and interaction rules

- Never animate `opacity` for entry or exit motion on landing or brand-facing
  surfaces. Use translate, rotate, scale-and-translate, clip-path, mask, or
  absolute repositioning. Opacity remains acceptable for non-motion state
  changes such as a modal backdrop or hover tint.
- Do not add decorative rules, dividers, framed image boxes, grid lines, red
  strips, or underline-like bars to editorial and brand surfaces. Use spacing,
  type, scale, contrast, and solid surfaces.
- Buttons and CTAs use the Providence display language: compact size, strong
  weight, restrained letter spacing, and no forced uppercase unless an existing
  component establishes it.
- Do not use Moonblossom/Poster/marker display faces for buttons.
- Do not add strong cast, offset, sticker, or block shadows to button hover and
  active states. Prefer restrained color, translate, or scale feedback.
- Honor `prefers-reduced-motion` and preserve visible keyboard focus.

### Browser QA

- Prefer the in-app browser/Chrome control path for frontend verification.
- Use DOM snapshots, computed styles, accessibility state, layout measurements,
  interaction checks, network state, and console errors.
- Do not capture screenshots during normal iteration unless the user explicitly
  requests them.

## 8. Image assets

Browser-facing images should be WebP before commit:

- cutouts with alpha: WebP quality 80
- photos and map teasers: WebP quality 72
- Sanity uploads may remain raw; `lib/sanityImageLoader.ts` requests CDN output
  with `auto=format`

PNG is allowed where the consumer requires or benefits from it:

- favicons, Apple touch icons, and PWA manifest icons
- Open Graph and Twitter share images
- email assets under `nextjs/public/pics/email/`
- source/working files outside `nextjs/public/`

Use `cwebp -q 80 input.png -o output.webp` for local conversion. Do not add
large unoptimized browser assets to `nextjs/public/`.

## 9. Routing and internationalization

The app uses `next-intl` v4:

- locales: `de`, `en`
- default locale: `de`
- German URLs are unprefixed (`/`, `/map`)
- English URLs use `/en` (`/en`, `/en/map`)
- locale detection is disabled; `/` is always German

Key files:

- `nextjs/i18n/routing.ts` — locale and prefix policy
- `nextjs/i18n/navigation.ts` — locale-aware `Link`, `useRouter`, and
  `usePathname`
- `nextjs/i18n/request.ts` — request configuration and messages
- `nextjs/lib/i18n/translations.ts` — translation source of truth
- `nextjs/lib/i18n/I18nContext.tsx` — compatibility wrapper exposing
  `{ lang, t, setLang }`

Use the locale-aware `Link` and router from `@/i18n/navigation` for internal
navigation. Do not hand-build `/en` prefixes or force document reloads. Locale
switching stores `NEXT_LOCALE` and performs a soft `router.replace`.

The route tree under `app/[locale]/` contains the SPA hub routes plus separate
restaurant, district, category, pack, checkout, profile, badge, and login
surfaces. App-root exceptions include APIs, `welcome/`, `robots.ts`,
`sitemap.ts`, `news-sitemap.xml`, and `llms.txt`.

`middleware.ts` owns:

- staging Basic Auth and noindex headers for matched page routes
- apex to `www` redirect
- legacy `?lang=` redirects
- referral-cookie capture
- legacy URL redirects and 410 responses
- internal German locale rewrites

`app/[locale]/layout.tsx` owns the `<html>` and `<body>` plus the synchronous
`CRITICAL_BOOTSTRAP`. That script sets `data-active-page`, attempts portrait
orientation lock on mobile, removes known extension hydration attributes, and
restores the pre-hydration auth hint.

`app/components/ScrollRestorer.tsx` exclusively owns manual back/forward scroll
restoration. Do not add competing `popstate` or `history.scrollRestoration`
logic to the bootstrap.

## 10. Auth, modals, and SEO invariants

- Auth state lives under `nextjs/lib/auth/`.
- `LoginModalProvider` owns login modal state; `BridgeAuth.tsx` renders the
  portal and synchronizes the pre-hydration auth hint.
- Open the login modal through `useLoginModal()`, not a global window function.
- Cookie information expands inside `CookieConsent.tsx`. AGB and privacy links
  navigate to their pages; their former inline modals no longer exist.
- `StaticPages.tsx` renders only the active static page. Rendering every static
  page on every route recreates duplicate SSR content and must not return.
- Restaurant and district English canonicals/alternates are content-aware.
  `hasEnContent` and the sitemap's `deOnly` path intentionally omit EN
  alternates when Sanity has no real English copy. Do not force EN hreflang for
  untranslated documents.

## 11. Known frontend gotchas

1. Overlay FOUC: critical closed-state guards for map/search overlays and the
   burger drawer live in `app/globals.css`. New deferred overlays need a
   pre-paint hidden/non-interactive state there.
2. iOS rubber-band: explicit light backgrounds on `html` and `body` prevent the
   browser default from flashing during overscroll. Test top and bottom bounce
   after changing page surfaces.
3. Stylesheet loading: profile/login and several route groups link the generated
   stylesheet separately through the shared `CSS_VERSION`; do not introduce
   per-layout cache-bust values.
4. Manual production build: `npm run build` and a running dev server share
   `.next/`. Stop dev or use `build:isolated`.
5. Favicons: `app/favicon.ico` and `public/favicon.ico` collide in dev. Keep only
   `nextjs/public/favicon.ico`.
6. Static content: preserving route-specific SSR output is an SEO requirement,
   not an optional rendering optimization.

## 12. Restaurant imports and Sanity Studio

Restaurant imports are local CLI workflows, not public API or Studio browser
features. Secrets stay in `nextjs/.env.local`.

From `nextjs/`:

```bash
npx tsx scripts/import-from-url.ts <google-maps-url>
npm run import:restaurant -- <google-maps-url>
```

The basic importer creates a draft. The enriched importer generates DE/EN
descriptions and SEO fields and can publish, but deliberately leaves AI-created
insider tips unpublished.

Sanity Studio is independent of App Hosting. Changes under `studio/` are not
deployed by merging the Next.js app; deploy Studio manually only when the user
requests it.

## 13. Completion checklist

Before reporting code work complete:

- requested behavior is implemented
- relevant lint, type, test, build, and browser checks pass
- generated CSS and cache-bust are updated when required
- no new unused imports, dead compatibility code, secrets, or oversized image
  assets were introduced
- `git status` contains only understood changes

Before reporting deployment complete:

- the intended commit is on the intended remote branch
- the matching Firebase backend rollout succeeded
- the target URL responds successfully
- staging security headers are present when testing staging
- production work is merged into `main`, not merely present on `staging`
