# Plan 1 — Infra Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a second App Hosting backend on a `staging` branch with env-isolated Stripe (test mode) and Resend (disabled), Basic-Auth-gated and `noindex`-protected, plus the GitHub Issues + Project Board ticket workflow that drives Plans 2-4.

**Architecture:** Code changes are env-gated by `NEXT_PUBLIC_ENV` (`production` | `staging`). A small `lib/env.ts` helper centralises the check so every gated file imports a typed boolean rather than reading the env string raw. Manual infra steps (Firebase backend creation, Stripe webhook registration, GitHub Project setup) are runbook-driven — exact commands documented, executed by the human operator.

**Tech Stack:** Next.js 15 / next-intl v4 / Firebase App Hosting / Vitest / GitHub CLI (`gh`)

**Spec:** [`docs/specs/2026-05-27-staging-and-migration-design.md`](../specs/2026-05-27-staging-and-migration-design.md)

---

## File Structure

### New files
- `nextjs/lib/env.ts` — central env-gate helper (`isStaging`, `isProduction`)
- `nextjs/lib/__tests__/env.test.ts` — tests for env helper
- `nextjs/app/components/StagingBanner.tsx` — coral "STAGING — not production" banner
- `nextjs/app/components/StagingBanner.module.css` — banner styles
- `nextjs/__tests__/app/components/StagingBanner.test.tsx` — tests for banner
- `nextjs/__tests__/middleware.test.ts` — tests for Basic Auth + X-Robots-Tag
- `nextjs/__tests__/app/robots.test.ts` — tests for env-gated robots
- `nextjs/__tests__/app/sitemap-staging.test.ts` — tests for empty-on-staging sitemap
- `.github/ISSUE_TEMPLATE/bug.yml`
- `.github/ISSUE_TEMPLATE/feature.yml`
- `.github/ISSUE_TEMPLATE/migration-task.yml`
- `scripts/setup-gh-labels.sh` — one-shot to create label palette
- `docs/runbooks/2026-05-27-staging-backend-setup.md` — human operator runbook

### Modified files
- `nextjs/apphosting.yaml` — add `NEXT_PUBLIC_ENV=production`
- `nextjs/app/robots.ts` — env-gate
- `nextjs/app/sitemap.ts` — empty on staging
- `nextjs/middleware.ts` — Basic Auth + X-Robots-Tag on staging
- `nextjs/app/[locale]/layout.tsx` — render StagingBanner when staging

### Not in this plan (deferred to Plans 2-4)
- Sanity schema changes
- `welcomePack` cleanup
- `/api/map-data` refactor
- Referral system

---

## Task 1: Env helper + tests

**Files:**
- Create: `nextjs/lib/env.ts`
- Test: `nextjs/lib/__tests__/env.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// nextjs/lib/__tests__/env.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('env helpers', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_ENV

  afterEach(() => {
    process.env.NEXT_PUBLIC_ENV = ORIGINAL
  })

  it('isStaging is true when NEXT_PUBLIC_ENV=staging', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    vi.resetModules()
    const { isStaging, isProduction } = await import('@/lib/env')
    expect(isStaging).toBe(true)
    expect(isProduction).toBe(false)
  })

  it('isProduction is true when NEXT_PUBLIC_ENV is unset or "production"', async () => {
    process.env.NEXT_PUBLIC_ENV = 'production'
    vi.resetModules()
    const a = await import('@/lib/env')
    expect(a.isProduction).toBe(true)
    expect(a.isStaging).toBe(false)

    delete process.env.NEXT_PUBLIC_ENV
    vi.resetModules()
    const b = await import('@/lib/env')
    expect(b.isProduction).toBe(true)
    expect(b.isStaging).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd nextjs && npx vitest run lib/__tests__/env.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/env'`

- [ ] **Step 3: Implement env.ts**

```ts
// nextjs/lib/env.ts

// Single source of truth for environment gating. Reads NEXT_PUBLIC_ENV at
// module-load time; bundlers inline it into client code, server SSR sees
// the runtime value. Defaults to 'production' so missing config is safe.
const RAW = process.env.NEXT_PUBLIC_ENV ?? 'production'

export const isStaging    = RAW === 'staging'
export const isProduction = !isStaging
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd nextjs && npx vitest run lib/__tests__/env.test.ts
```

Expected: PASS (all 2 tests)

- [ ] **Step 5: Commit**

```bash
git add nextjs/lib/env.ts nextjs/lib/__tests__/env.test.ts
git commit -m "infra(env): add NEXT_PUBLIC_ENV gate helper"
```

---

## Task 2: Set NEXT_PUBLIC_ENV=production in apphosting.yaml

**Files:**
- Modify: `nextjs/apphosting.yaml`

- [ ] **Step 1: Read current apphosting.yaml env block to find a sensible insertion point**

```bash
grep -n "^env:" nextjs/apphosting.yaml | head -3
```

Expected: prints the line number of the `env:` block start.

- [ ] **Step 2: Insert NEXT_PUBLIC_ENV at the top of the env: list**

Open `nextjs/apphosting.yaml`. Under the existing `env:` line, add the following two lines as the FIRST env entry (before `SANITY_REVALIDATE_SECRET`):

```yaml
  - variable: NEXT_PUBLIC_ENV
    value: production
    availability:
      - BUILD
      - RUNTIME
```

Note: `BUILD` availability is required so Next.js inlines the value into client bundles at build time. Without it, browser-side code reads `undefined`.

- [ ] **Step 3: Verify no syntax errors**

```bash
cd nextjs && npx js-yaml apphosting.yaml > /dev/null && echo "yaml ok"
```

Expected: `yaml ok`

(If `js-yaml` CLI isn't installed: `node -e "require('js-yaml').load(require('fs').readFileSync('apphosting.yaml','utf8'))" && echo ok`)

- [ ] **Step 4: Commit**

```bash
git add nextjs/apphosting.yaml
git commit -m "infra(env): set NEXT_PUBLIC_ENV=production on prod backend"
```

---

## Task 3: Env-gate robots.ts

**Files:**
- Modify: `nextjs/app/robots.ts`
- Test: `nextjs/__tests__/app/robots.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// nextjs/__tests__/app/robots.test.ts
import { describe, it, expect, afterEach, vi } from 'vitest'

describe('robots.ts', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_ENV
  afterEach(() => { process.env.NEXT_PUBLIC_ENV = ORIGINAL })

  it('production: allow / and reference sitemap', async () => {
    process.env.NEXT_PUBLIC_ENV = 'production'
    vi.resetModules()
    const mod = await import('@/app/robots')
    const result = mod.default()
    expect(result.rules).toEqual({ userAgent: '*', allow: '/' })
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/)
  })

  it('staging: disallow all, no sitemap reference', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    vi.resetModules()
    const mod = await import('@/app/robots')
    const result = mod.default()
    expect(result.rules).toEqual({ userAgent: '*', disallow: '/' })
    expect(result.sitemap).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd nextjs && npx vitest run __tests__/app/robots.test.ts
```

Expected: FAIL on the staging-case (current code always returns `allow: /` + sitemap)

- [ ] **Step 3: Update robots.ts**

```ts
// nextjs/app/robots.ts
import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'
import { isStaging } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  if (isStaging) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd nextjs && npx vitest run __tests__/app/robots.test.ts
```

Expected: PASS (both 2 tests)

- [ ] **Step 5: Commit**

```bash
git add nextjs/app/robots.ts nextjs/__tests__/app/robots.test.ts
git commit -m "infra(robots): disallow all on staging, allow on prod"
```

---

## Task 4: Empty sitemap on staging

**Files:**
- Modify: `nextjs/app/sitemap.ts`
- Test: `nextjs/__tests__/app/sitemap-staging.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// nextjs/__tests__/app/sitemap-staging.test.ts
import { describe, it, expect, afterEach, vi } from 'vitest'

describe('sitemap.ts staging gate', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_ENV
  afterEach(() => { process.env.NEXT_PUBLIC_ENV = ORIGINAL })

  it('staging: returns empty array without hitting Sanity', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    vi.resetModules()
    // Mock the Sanity client so we'd notice if it were called
    vi.doMock('@/lib/sanity', () => ({
      client: { fetch: vi.fn().mockRejectedValue(new Error('should not call sanity')) },
    }))
    const mod = await import('@/app/sitemap')
    const result = await mod.default()
    expect(result).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd nextjs && npx vitest run __tests__/app/sitemap-staging.test.ts
```

Expected: FAIL — current sitemap.ts calls Sanity unconditionally

- [ ] **Step 3: Update sitemap.ts**

Find the `export default async function sitemap()` declaration in `nextjs/app/sitemap.ts`. Add an early-return at the very top of the function body:

```ts
// nextjs/app/sitemap.ts (top of the default export)
import { isStaging } from '@/lib/env'
// ... existing imports below

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isStaging) return []
  // ... existing implementation continues unchanged
```

Place the `import { isStaging } from '@/lib/env'` line alongside the other top-of-file imports.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd nextjs && npx vitest run __tests__/app/sitemap-staging.test.ts
```

Expected: PASS

- [ ] **Step 5: Run the existing sitemap tests (if any) to verify no regression**

```bash
cd nextjs && npx vitest run __tests__/app/ -t sitemap
```

Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add nextjs/app/sitemap.ts nextjs/__tests__/app/sitemap-staging.test.ts
git commit -m "infra(sitemap): empty on staging, skip Sanity fetch"
```

---

## Task 5: Basic Auth + X-Robots-Tag middleware

**Files:**
- Modify: `nextjs/middleware.ts`
- Test: `nextjs/__tests__/middleware.test.ts`

This task adds two staging-only behaviors to the existing middleware:
1. `Authorization: Basic <base64>` check against `STAGING_BASIC_AUTH_USER` / `STAGING_BASIC_AUTH_PASS` — 401 with `WWW-Authenticate` if missing/wrong.
2. `X-Robots-Tag: noindex, nofollow` on all responses.

Exempt paths: `/api/stripe/webhook` (Stripe can't send Basic Auth headers).

- [ ] **Step 1: Write the failing test**

```ts
// nextjs/__tests__/middleware.test.ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

function makeReq(pathname: string, headers: Record<string, string> = {}): NextRequest {
  const url = `https://staging.example.com${pathname}`
  return new NextRequest(url, { headers })
}

describe('middleware: Basic Auth + X-Robots-Tag', () => {
  const ORIGINAL_ENV = process.env.NEXT_PUBLIC_ENV
  const ORIGINAL_USER = process.env.STAGING_BASIC_AUTH_USER
  const ORIGINAL_PASS = process.env.STAGING_BASIC_AUTH_PASS

  afterEach(() => {
    process.env.NEXT_PUBLIC_ENV = ORIGINAL_ENV
    process.env.STAGING_BASIC_AUTH_USER = ORIGINAL_USER
    process.env.STAGING_BASIC_AUTH_PASS = ORIGINAL_PASS
    vi.resetModules()
  })

  it('production: no Basic Auth challenge, no X-Robots-Tag', async () => {
    process.env.NEXT_PUBLIC_ENV = 'production'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')
    const res = middleware(makeReq('/'))
    expect(res.status).not.toBe(401)
    expect(res.headers.get('x-robots-tag')).toBeNull()
  })

  it('staging: 401 with WWW-Authenticate when no Basic Auth header', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    process.env.STAGING_BASIC_AUTH_USER = 'tester'
    process.env.STAGING_BASIC_AUTH_PASS = 'secret'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')
    const res = middleware(makeReq('/'))
    expect(res.status).toBe(401)
    expect(res.headers.get('www-authenticate')).toMatch(/^Basic/i)
  })

  it('staging: passes through with valid Basic Auth, sets X-Robots-Tag', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    process.env.STAGING_BASIC_AUTH_USER = 'tester'
    process.env.STAGING_BASIC_AUTH_PASS = 'secret'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')
    const credentials = Buffer.from('tester:secret').toString('base64')
    const res = middleware(makeReq('/', { authorization: `Basic ${credentials}` }))
    expect(res.status).not.toBe(401)
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })

  it('staging: 401 with wrong credentials', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    process.env.STAGING_BASIC_AUTH_USER = 'tester'
    process.env.STAGING_BASIC_AUTH_PASS = 'secret'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')
    const credentials = Buffer.from('tester:wrong').toString('base64')
    const res = middleware(makeReq('/', { authorization: `Basic ${credentials}` }))
    expect(res.status).toBe(401)
  })

  it('staging: webhook path is exempt from Basic Auth', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    process.env.STAGING_BASIC_AUTH_USER = 'tester'
    process.env.STAGING_BASIC_AUTH_PASS = 'secret'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')
    const res = middleware(makeReq('/api/stripe/webhook'))
    // Webhook is not in the matcher anyway (api excluded), but middleware
    // should not 401 if invoked directly.
    expect(res.status).not.toBe(401)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd nextjs && npx vitest run __tests__/middleware.test.ts
```

Expected: FAIL — current middleware does no auth and sets no robots header

- [ ] **Step 3: Update middleware.ts**

Modify `nextjs/middleware.ts`. The existing apex-redirect + lang-redirect + intlMiddleware + cache-control logic stays. Add the staging gate at the **top** of the function (after the URL parsing line) and the X-Robots-Tag on the response just before the final `return res`:

```ts
// nextjs/middleware.ts
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { isStaging } from '@/lib/env';

const intlMiddleware = createMiddleware(routing);

function basicAuthChallenge(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Staging"' },
  });
}

function isValidBasicAuth(authHeader: string | null): boolean {
  if (!authHeader?.startsWith('Basic ')) return false;
  const expectedUser = process.env.STAGING_BASIC_AUTH_USER;
  const expectedPass = process.env.STAGING_BASIC_AUTH_PASS;
  if (!expectedUser || !expectedPass) return false;
  try {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
    const [user, ...passParts] = decoded.split(':');
    return user === expectedUser && passParts.join(':') === expectedPass;
  } catch {
    return false;
  }
}

export default function middleware(req: NextRequest) {
  const { searchParams, pathname } = req.nextUrl;

  // Staging gate — runs before any other logic. Webhook paths exempt so
  // Stripe (which can't send Basic Auth headers) can still deliver events.
  if (isStaging && !pathname.startsWith('/api/stripe/webhook')) {
    if (!isValidBasicAuth(req.headers.get('authorization'))) {
      return basicAuthChallenge();
    }
  }

  // [existing apex-redirect block stays unchanged]
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  if (host === 'eatthisdot.com') {
    const url = req.nextUrl.clone();
    url.host = 'www.eatthisdot.com';
    url.protocol = 'https:';
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  const legacyLang = searchParams.get('lang');

  // [existing legacyLang block stays unchanged]
  if (legacyLang === 'en' || legacyLang === 'de') {
    const url = req.nextUrl.clone();
    url.searchParams.delete('lang');
    if (legacyLang === 'en' && !pathname.startsWith('/en')) {
      url.pathname = `/en${pathname === '/' ? '' : pathname}`;
    } else if (legacyLang === 'de' && pathname.startsWith('/en')) {
      url.pathname = pathname.slice(3) || '/';
    }
    const res = NextResponse.redirect(url, 308);
    res.cookies.set('NEXT_LOCALE', legacyLang, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  const res = intlMiddleware(req);

  // [existing launch-page cache-control block stays unchanged]
  if (pathname === '/' || pathname === '/en' || pathname === '/en/') {
    res.headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
  }

  // Staging: tell every crawler to ignore everything, even if robots.txt
  // got bypassed.
  if (isStaging) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|css|js|pics|fonts|welcome|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd nextjs && npx vitest run __tests__/middleware.test.ts
```

Expected: PASS (all 5 tests)

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd nextjs && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add nextjs/middleware.ts nextjs/__tests__/middleware.test.ts
git commit -m "infra(middleware): staging Basic Auth + X-Robots-Tag"
```

---

## Task 6: StagingBanner component

**Files:**
- Create: `nextjs/app/components/StagingBanner.tsx`
- Create: `nextjs/app/components/StagingBanner.module.css`
- Test: `nextjs/__tests__/app/components/StagingBanner.test.tsx`

- [ ] **Step 1: Update vitest.config to use jsdom for component tests**

Check if the config already supports component tests. Read `nextjs/vitest.config.ts`. If `environment: 'node'` is still set, change it to `'jsdom'`, OR add a per-test-file directive. The simpler path is per-file directive — keeps non-component tests in node.

If keeping node default, the test file (created in Step 3 below) starts with the comment-directive:
```ts
// @vitest-environment jsdom
```

We'll use the per-file directive — no global change needed.

- [ ] **Step 2: Verify React Testing Library is available**

```bash
cd nextjs && grep -E '"@testing-library/react"|"jsdom"' package.json
```

If neither is installed: skip RTL and write a server-side test instead that renders the component to a string and checks output. Decision tree:

- If RTL+jsdom **are** installed → use them (preferred, more idiomatic)
- If neither installed → use `react-dom/server` `renderToStaticMarkup`

The test below uses the `react-dom/server` path — works without new dependencies.

- [ ] **Step 3: Write the failing test**

```tsx
// nextjs/__tests__/app/components/StagingBanner.test.tsx
import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

describe('StagingBanner', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_ENV
  afterEach(() => {
    process.env.NEXT_PUBLIC_ENV = ORIGINAL
    vi.resetModules()
  })

  it('renders nothing on production', async () => {
    process.env.NEXT_PUBLIC_ENV = 'production'
    vi.resetModules()
    const { StagingBanner } = await import('@/app/components/StagingBanner')
    const html = renderToStaticMarkup(<StagingBanner />)
    expect(html).toBe('')
  })

  it('renders a banner with "STAGING" text on staging', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    vi.resetModules()
    const { StagingBanner } = await import('@/app/components/StagingBanner')
    const html = renderToStaticMarkup(<StagingBanner />)
    expect(html).toContain('STAGING')
    expect(html.toLowerCase()).toContain('not production')
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd nextjs && npx vitest run __tests__/app/components/StagingBanner.test.tsx
```

Expected: FAIL — module does not exist

- [ ] **Step 5: Create the component**

```tsx
// nextjs/app/components/StagingBanner.tsx
import { isStaging } from '@/lib/env'
import styles from './StagingBanner.module.css'

export function StagingBanner() {
  if (!isStaging) return null
  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span className={styles.label}>STAGING</span>
      <span className={styles.sep}>—</span>
      <span className={styles.text}>not production</span>
      <a className={styles.prodLink} href="https://www.eatthisdot.com">go to prod →</a>
    </div>
  )
}
```

- [ ] **Step 6: Create the CSS module**

```css
/* nextjs/app/components/StagingBanner.module.css */
.banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 12px;
  background: #a02814;
  color: #fff;
  font-family: var(--font-saira-condensed), system-ui, sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.label { letter-spacing: 0.12em; }
.sep   { opacity: 0.6; }
.text  { opacity: 0.9; }

.prodLink {
  margin-left: 12px;
  color: #fff;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.prodLink:hover { opacity: 0.85; }
```

Notes on z-index: project memory says modals use ≥10000 to clear the legacy navbar at 9999. The staging banner sits at 100000 — above modals — because it's a meta-UI marker that should never be obscured.

- [ ] **Step 7: Run test to verify it passes**

```bash
cd nextjs && npx vitest run __tests__/app/components/StagingBanner.test.tsx
```

Expected: PASS (both 2 tests)

- [ ] **Step 8: Commit**

```bash
git add nextjs/app/components/StagingBanner.tsx \
        nextjs/app/components/StagingBanner.module.css \
        nextjs/__tests__/app/components/StagingBanner.test.tsx
git commit -m "infra(banner): StagingBanner component, env-gated"
```

---

## Task 7: Integrate StagingBanner into root layout

**Files:**
- Modify: `nextjs/app/[locale]/layout.tsx`

- [ ] **Step 1: Read the existing layout to find a placement point**

```bash
grep -n "<body" nextjs/app/[locale]/layout.tsx
```

Expected: prints the line where the `<body>` element opens. The banner should be the first child of `<body>` so it sits above all other UI.

- [ ] **Step 2: Add the import + render**

In `nextjs/app/[locale]/layout.tsx`:

```tsx
// Add this import near the existing component imports
import { StagingBanner } from '@/app/components/StagingBanner'
```

Then inside the `<body>` JSX, render `<StagingBanner />` as the very first child:

```tsx
<body /* existing props */>
  <StagingBanner />
  {/* existing body content */}
</body>
```

(The component returns `null` on production so it's a no-op there.)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd nextjs && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Verify dev build doesn't crash**

```bash
cd nextjs && NEXT_PUBLIC_ENV=staging npx next build 2>&1 | tail -20
```

Expected: build succeeds. (Don't run dev server — user runs that themselves per project rules.)

- [ ] **Step 5: Commit**

```bash
git add nextjs/app/[locale]/layout.tsx
git commit -m "infra(layout): render StagingBanner at top of body"
```

---

## Task 8: GitHub label setup script

**Files:**
- Create: `scripts/setup-gh-labels.sh`

- [ ] **Step 1: Create the script**

```bash
# scripts/setup-gh-labels.sh
#!/usr/bin/env bash
set -euo pipefail

# One-shot: create the label palette for the eat-this repo.
# Idempotent — gh label create errors on duplicate, the || true swallows it.
#
# Usage: ./scripts/setup-gh-labels.sh

create_label() {
  local name="$1"
  local color="$2"
  local desc="$3"
  gh label create "$name" --color "$color" --description "$desc" 2>/dev/null || \
    gh label edit "$name" --color "$color" --description "$desc"
}

# Domain labels
create_label migration  "8b5cf6" "Guest+20 rebuild"
create_label seo        "0e7afe" "SEO + sitemap + metadata"
create_label voice      "16a34a" "Restaurant description voice rewrites"
create_label bug        "dc2626" "Defects"
create_label infra      "6b7280" "Hosting, secrets, CI"
create_label design     "ec4899" "Visual/layout"
create_label content    "eab308" "Sanity data"
create_label chore      "9ca3af" "Cleanups"
create_label epic       "facc15" "Roadmap-level umbrella issue"

# Priority labels
create_label p0         "dc2626" "Blocker — now"
create_label p1         "ea580c" "This week"
create_label p2         "eab308" "This month"

echo "Labels created/updated."
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/setup-gh-labels.sh
```

- [ ] **Step 3: Run it (requires `gh auth login` already complete)**

```bash
./scripts/setup-gh-labels.sh
```

Expected: 12 lines of label create/edit confirmations, no errors.

- [ ] **Step 4: Verify labels exist**

```bash
gh label list | grep -E "^(migration|seo|voice|bug|infra|design|content|chore|epic|p0|p1|p2)\b"
```

Expected: 12 matching lines.

- [ ] **Step 5: Commit**

```bash
git add scripts/setup-gh-labels.sh
git commit -m "infra(gh): script to seed issue labels"
```

---

## Task 9: Issue templates

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug.yml`
- Create: `.github/ISSUE_TEMPLATE/feature.yml`
- Create: `.github/ISSUE_TEMPLATE/migration-task.yml`

- [ ] **Step 1: Create bug template**

```yaml
# .github/ISSUE_TEMPLATE/bug.yml
name: Bug
description: A defect — something behaves incorrectly.
labels: ["bug"]
body:
  - type: input
    id: where
    attributes:
      label: Where
      description: URL or file path where the bug shows up
      placeholder: "https://www.eatthisdot.com/restaurant/foo OR nextjs/lib/foo.ts"
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected behaviour
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: Actual behaviour
    validations:
      required: true
  - type: textarea
    id: repro
    attributes:
      label: Repro steps
      placeholder: "1. ...\n2. ...\n3. ..."
    validations:
      required: true
  - type: textarea
    id: screenshots
    attributes:
      label: Screenshots / logs (if relevant)
```

- [ ] **Step 2: Create feature template**

```yaml
# .github/ISSUE_TEMPLATE/feature.yml
name: Feature
description: A new capability — user-visible behavior to add.
labels: ["feature"]
body:
  - type: textarea
    id: story
    attributes:
      label: User story
      placeholder: "As a <role>, I want <action> so that <outcome>"
    validations:
      required: true
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance criteria
      description: Bullet list — what must be true for this to be done.
    validations:
      required: true
  - type: textarea
    id: files
    attributes:
      label: Likely files touched
      description: Best guess at the files involved — informs scope estimation.
```

- [ ] **Step 3: Create migration-task template**

```yaml
# .github/ISSUE_TEMPLATE/migration-task.yml
name: Migration task
description: A single step in the Guest+20 migration.
labels: ["migration"]
body:
  - type: textarea
    id: rip
    attributes:
      label: What rips out
      description: File paths + functions being deleted or replaced.
  - type: textarea
    id: adds
    attributes:
      label: What comes in
      description: New file paths + behaviour.
    validations:
      required: true
  - type: textarea
    id: testplan
    attributes:
      label: Test plan
      description: Vitest cases + manual smoke steps on staging URL.
    validations:
      required: true
  - type: textarea
    id: rollback
    attributes:
      label: Rollback path
      description: How to undo if the change breaks staging.
    validations:
      required: true
```

- [ ] **Step 4: Verify templates show up in GitHub UI**

```bash
gh issue create --web
```

Browser opens; the three templates should appear in the picker. (Cancel without filing — this is a smoke test.)

- [ ] **Step 5: Commit**

```bash
git add .github/ISSUE_TEMPLATE/
git commit -m "infra(gh): issue templates — bug, feature, migration-task"
```

---

## Task 10: Manual setup runbook

**Files:**
- Create: `docs/runbooks/2026-05-27-staging-backend-setup.md`

Plans don't run Firebase CLI commands themselves — those need a human at the keyboard. This task captures the exact commands so the operator can execute them sequentially without thinking.

- [ ] **Step 1: Write the runbook**

```markdown
<!-- docs/runbooks/2026-05-27-staging-backend-setup.md -->
# Runbook — Stand up the `eat-this-staging` backend

**Owner:** the human operator (you).
**Estimated time:** ~30 minutes hands-on + 10-15 minutes waiting for Firebase rollouts.

Run these in order. Each block ends with a sanity check you should verify before moving to the next.

## 1. Create the `staging` branch

```bash
cd /Users/ersane/Downloads/Projekte/Eat\ This
git checkout main
git pull
git checkout -b staging
git push -u origin staging
```

Verify on GitHub: branch `staging` exists at github.com/erkute/eat-this/branches.

## 2. Create the App Hosting backend

The Firebase Console flow is simpler than the CLI for first backend creation. Open:

  https://console.firebase.google.com/project/eat-this-8a13b/apphosting

Click **Create backend** → select repo `erkute/eat-this` → choose branch `staging` → name `eat-this-staging` → region `us-central1` (matches prod). Confirm.

Wait for the first rollout to complete (5-10 min). The URL will look like:

  https://eat-this-staging--eat-this-8a13b.us-central1.hosted.app

It will currently 500 — `STAGING_BASIC_AUTH_*` secrets aren't set yet. That's expected.

Verify: `firebase apphosting:backends:list` shows both `eat-this` and `eat-this-staging`.

## 3. Set secrets on the staging backend

```bash
cd nextjs

# NEXT_PUBLIC_ENV — must be plain env var, not secret, on staging
# Edit apphosting.yaml manually if a second yaml is used, OR add via console:
#   Firebase Console → eat-this-staging → Environment → Add variable
#   variable: NEXT_PUBLIC_ENV  value: staging  availability: BUILD,RUNTIME

# Basic Auth credentials
openssl rand -hex 8 | firebase apphosting:secrets:set STAGING_BASIC_AUTH_USER --data-file -
openssl rand -hex 16 | firebase apphosting:secrets:set STAGING_BASIC_AUTH_PASS --data-file -

firebase apphosting:secrets:grantaccess STAGING_BASIC_AUTH_USER --backend eat-this-staging
firebase apphosting:secrets:grantaccess STAGING_BASIC_AUTH_PASS --backend eat-this-staging

# Stripe test-mode keys — from dashboard.stripe.com → Developers → API keys → Test mode
firebase apphosting:secrets:set STRIPE_SECRET_KEY_STAGING
# (paste the test sk_test_... key when prompted)
firebase apphosting:secrets:grantaccess STRIPE_SECRET_KEY_STAGING --backend eat-this-staging
```

Then reference these in `apphosting.yaml` for the staging backend — see step 4.

## 4. Per-backend apphosting.yaml

The single `nextjs/apphosting.yaml` applies to all backends by default. To override per backend, App Hosting reads `apphosting.<backend-id>.yaml` if present. Create:

```bash
cp nextjs/apphosting.yaml nextjs/apphosting.eat-this-staging.yaml
```

Edit `nextjs/apphosting.eat-this-staging.yaml`:

- Change `NEXT_PUBLIC_ENV` value from `production` to `staging`
- Replace `secret: STRIPE_SECRET_KEY` with `secret: STRIPE_SECRET_KEY_STAGING` (test mode key)
- Add the two Basic Auth secret references:

  ```yaml
  - variable: STAGING_BASIC_AUTH_USER
    secret: STAGING_BASIC_AUTH_USER
    availability: [RUNTIME]
  - variable: STAGING_BASIC_AUTH_PASS
    secret: STAGING_BASIC_AUTH_PASS
    availability: [RUNTIME]
  ```

- Remove `RESEND_*` env entries entirely — staging doesn't send mail

Commit:

```bash
git add nextjs/apphosting.eat-this-staging.yaml
git commit -m "infra(apphosting): staging backend overrides"
git push origin staging
```

A new rollout fires automatically. Wait for it to complete.

## 5. Register the staging Stripe webhook

In the Stripe Dashboard (TEST mode toggled on, top-right):

  Developers → Webhooks → Add endpoint

- URL: `https://eat-this-staging--eat-this-8a13b.us-central1.hosted.app/api/stripe/webhook`
- Events: same set as the live webhook (copy from live config)
- After creating, click **Reveal signing secret** → copy the `whsec_...` value

Then:

```bash
firebase apphosting:secrets:set STRIPE_WEBHOOK_SECRET_STAGING --data-file=- <<<"whsec_..."
firebase apphosting:secrets:grantaccess STRIPE_WEBHOOK_SECRET_STAGING --backend eat-this-staging
```

Update `nextjs/apphosting.eat-this-staging.yaml` to reference `STRIPE_WEBHOOK_SECRET_STAGING` instead of `STRIPE_WEBHOOK_SECRET`. Commit + push staging → new rollout.

## 6. Smoke test the Basic Auth gate

Open in incognito:

  https://eat-this-staging--eat-this-8a13b.us-central1.hosted.app

Expected: browser prompts for username/password. Enter the values from step 3.

After successful auth, the staging banner ("STAGING — not production") should appear at the top of the page in coral.

If you see the homepage with no banner — Task 7 didn't deploy. Check the rollout log.

## 7. Create GitHub Project + Migration milestone

```bash
# Create the project
gh project create --owner erkute --title "Eat This"

# Note the project number from output (probably #1)
PROJECT_NUM=1

# Create the milestone
gh api -X POST repos/erkute/eat-this/milestones \
  -f title="Guest+20 Migration" \
  -f description="Tier-based access model + referrals" \
  -f due_on="2026-06-10T23:59:59Z"
```

Then in the GitHub UI for the project:
- Add columns: Backlog, Up Next, In Progress, In Review, Done
- Set the auto-add-to-project workflow: "When an issue is opened in erkute/eat-this → add to project"

## 8. Branch protection on `main`

```bash
gh api -X PUT repos/erkute/eat-this/branches/main/protection \
  -F required_pull_request_reviews.required_approving_review_count=0 \
  -F enforce_admins=false \
  -F required_status_checks=null \
  -F restrictions=null \
  -F allow_force_pushes=false \
  -F allow_deletions=false
```

This blocks direct pushes to `main` — all changes must come via PR (typically from `staging`).

## 9. Done

You now have:
- Two App Hosting backends (`eat-this` live on `main`, `eat-this-staging` on `staging`)
- Staging URL behind Basic Auth
- Staging Stripe in test mode with its own webhook
- GitHub Project board + Migration milestone wired up
- Branch protection on `main`

Next: Plan 2 takes over with Sanity schema changes + welcomePack cleanup.
```

- [ ] **Step 2: Commit**

```bash
git add docs/runbooks/2026-05-27-staging-backend-setup.md
git commit -m "infra(docs): staging backend setup runbook"
```

---

## Task 11: Update CLAUDE.md with staging workflow

**Files:**
- Modify: `CLAUDE.md`

The project's CLAUDE.md should reflect the new branching workflow so future sessions don't push directly to `main`.

- [ ] **Step 1: Add a "Staging workflow" section**

In `CLAUDE.md`, add a new section after the existing "Deployment" section:

```markdown
## Staging branch workflow

This repo has a `staging` long-running branch that auto-deploys to a second
App Hosting backend (`eat-this-staging`). Feature work flows:

  feature branch  →  PR into `staging`  →  smoke on staging URL  →  PR into `main`

- Never push directly to `main` — branch protection now blocks it
- `staging` allows direct push for solo-dev speed
- Staging URL is gated by Basic Auth + `noindex` — see
  `docs/runbooks/2026-05-27-staging-backend-setup.md` for credentials lookup
- Staging runs Stripe in test mode (price IDs differ), Resend is disabled
- The `StagingBanner` component renders only when `NEXT_PUBLIC_ENV=staging`
  is set — if you don't see it on the staging URL, the env var didn't deploy

For the migration breakdown, see
`docs/specs/2026-05-27-staging-and-migration-design.md`.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude-md): staging branch workflow"
```

---

## Task 12: Push the branch + verify

- [ ] **Step 1: Confirm all tests pass**

```bash
cd nextjs && npm run test
```

Expected: all green.

- [ ] **Step 2: Confirm the full build succeeds**

```bash
cd nextjs && npm run build
```

Expected: build passes. The pre-push hook will run this too.

- [ ] **Step 3: Push the worktree branch**

```bash
git push -u origin worktree-staging-migration-spec
```

The pre-push hook (`.git/hooks/pre-push`) will run `npm run build` again. Wait for it. If it fails: read `/tmp/eat-this-prepush-build.log` and fix.

- [ ] **Step 4: Open PR into `staging` (NOT main)**

```bash
gh pr create --base staging --title "Infra: staging backend setup (Plan 1)" --body "$(cat <<'EOF'
## Summary
- Env-gated robots/sitemap/middleware via `lib/env.ts`
- StagingBanner component renders only on staging
- Basic Auth + X-Robots-Tag enforced via middleware (webhook exempt)
- GitHub label palette + issue templates
- Manual setup runbook for backend creation + secrets + Stripe webhook

## Test plan
- [x] Vitest green (env, robots, sitemap, middleware, StagingBanner)
- [x] `npm run build` succeeds
- [ ] Operator runs `docs/runbooks/2026-05-27-staging-backend-setup.md` end-to-end
- [ ] Smoke test: staging URL prompts for Basic Auth → after auth, banner visible

Plan 1 of 4 from `docs/specs/2026-05-27-staging-and-migration-design.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Operator executes the runbook**

The PR is reviewable but the staging backend doesn't exist yet — operator follows `docs/runbooks/2026-05-27-staging-backend-setup.md` step-by-step.

After runbook completes + this PR is merged into `staging` → staging URL is live and gated.

- [ ] **Step 6: Validate end-to-end on staging URL**

Smoke checks (after merge + rollout):
- `https://eat-this-staging--…/robots.txt` returns `User-agent: *\nDisallow: /`
- `https://eat-this-staging--…/sitemap.xml` returns empty `<urlset/>`
- Visiting `https://eat-this-staging--…` prompts for Basic Auth
- After auth: top of page shows coral "STAGING — not production" banner
- Response headers include `X-Robots-Tag: noindex, nofollow`

If all five pass: Plan 1 is done.

---

## Open questions / known risks

- **`apphosting.<backend>.yaml` per-backend override:** Firebase App Hosting docs are
  thin on the exact filename convention. If `apphosting.eat-this-staging.yaml` is
  ignored, fall back to setting env vars + secrets via the Firebase Console UI per
  backend — more clicks, same end state. Verify during runbook execution.
- **GitHub Project v2 CLI:** `gh project create` is GA but the column + automation
  setup is still cleanest via the web UI as of brainstorm date. Runbook reflects
  that.
- **Branch protection at zero approving reviews:** Solo dev — no second reviewer
  available. The protection still blocks direct pushes and force-pushes, which is
  the actual goal.

---

## After this plan

When Plan 1 is merged + the runbook executed, the next plan (Plan 2 — Schema +
Cleanup) can start work on the `staging` branch. Each Plan 2-4 task becomes one
or more GitHub issues filed under the Migration milestone.
