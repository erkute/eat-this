# Home / Discovery Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the home page (`/` DE, `/en` EN) into one cohesive, "aus einem Guss" discovery surface in the locked design language: continuous white, ink type, yellow as the single accent, FF Providence Sans + Silkscreen, borderless photo-forward sections, app-like rails.

**Architecture:** The home is composed by `app/components/HubSection.tsx` (server component) which today holds several sections inline plus a few sub-components. We (1) add design tokens + the Providence font variable, (2) add a small reusable home element vocabulary (CSS), then (3) rebuild each section to that vocabulary, consolidating ~12 sections into ~8 and deleting the dead pack components. Styling lives in `css/style.css` (global tokens/primitives) and per-component `.module.css` files; build with `npm run build:css`.

**Tech Stack:** Next.js App Router, React server + client components, next-intl v4 (DE default, `/en`), CSS modules + a single bundled `css/style.css` (esbuild), vitest + Testing Library, Sanity content via `getHomeData`.

**Design source of truth:** [`docs/specs/2026-06-29-home-discovery-redesign-design.md`](../specs/2026-06-29-home-discovery-redesign-design.md) and the approved chat mockups (desktop `eat_this_borderless_airy`, mobile `eat_this_mobile`).

---

## Conventions & guardrails (read once before starting)

- **CSS build:** after editing `css/style.css`, run `npm run build:css` (writes `public/css/style.min.css`). Per-component `.module.css` are compiled by Next automatically.
- **Cache-bust:** after any `css/style.css` change, bump `?v=NN` on the stylesheet `<link>` in `app/[locale]/(spa)/layout.tsx` (final task does the last bump).
- **Don't** run `npm run build` while `next dev` is alive (overwrites `.next`). Use `npm run build:css` during dev. Final verification task runs the full build with dev stopped.
- **Tests:** run a single file with `npx vitest run app/components/<File>.test.tsx`. Full suite: `npm test`.
- **Visual checks:** use the `run` skill (or `npm run dev` + open `/` and `/en`) to confirm each section visually against the mockup, desktop and mobile widths. This is an explicit step per section — visual tuning of spacing/sizes happens here, against the spec token table.
- **Motion rule:** entry/exit motion uses translate, never opacity fades (see CLAUDE.md "Animation — no opacity fades"). Hover/state tint via opacity is fine.
- **Git hygiene:** stage only files you changed in this task (never `git add .`). You are on `staging` (direct push allowed) — but this plan only commits; pushing is a separate, user-initiated step.
- **Aggressive cleanup is OK** (repo rule): when a component stops being used by the home, delete it entirely if nothing else imports it.

---

## Design tokens (used throughout — defined in Task 1)

| Token               | Value                                                                      | Use                                     |
| ------------------- | -------------------------------------------------------------------------- | --------------------------------------- |
| `--home-paper`      | `#FFFFFF`                                                                  | page background                         |
| `--home-ink`        | `#15120E`                                                                  | type, hairlines, dark fills             |
| `--home-accent`     | `#FFC600`                                                                  | the one accent (button, ▪ marker, Remy) |
| `--home-photo-rest` | `#ECEAE6`                                                                  | image placeholder/rest                  |
| `--home-quiet`      | `#F2F1EF`                                                                  | search field / quiet chips              |
| `--home-rule`       | `#E4E1DC`                                                                  | list hairlines                          |
| `--home-muted`      | `#8A857D`                                                                  | muted captions/meta                     |
| `--font-providence` | `"ff-providence-sans-web-pro-1","ff-providence-sans-web-pro-2",sans-serif` | headlines + UI + body on the home       |
| Silkscreen          | existing `'Silkscreen'` @font-face                                         | wordmark + micro-labels only            |

Radius: photos `10px`, buttons `7px`. Headlines: Providence 700, `text-transform:uppercase`, `letter-spacing:-.02em`, `line-height:.92`. Only Providence weights 400 & 700 exist — never specify 500/600/800/900.

---

## Task 1: Home design tokens + Providence font variable

**Files:**

- Modify: `nextjs/css/style.css` (`:root` token block near line 88; add a home tokens block)

- [ ] **Step 1: Add the Providence font variable and home tokens to `:root`**

In `css/style.css`, inside the existing `:root { … }` that defines `--font` (around line 88), add:

```css
--font-providence: 'ff-providence-sans-web-pro-1', 'ff-providence-sans-web-pro-2', sans-serif;

--home-paper: #ffffff;
--home-ink: #15120e;
--home-accent: #ffc600;
--home-photo-rest: #eceae6;
--home-quiet: #f2f1ef;
--home-rule: #e4e1dc;
--home-muted: #8a857d;
--home-radius-photo: 10px;
--home-radius-btn: 7px;
```

- [ ] **Step 2: Build CSS**

Run: `cd nextjs && npm run build:css`
Expected: no error; `public/css/style.min.css` rewritten.

- [ ] **Step 3: Verify the variable resolves**

Run: `cd nextjs && grep -c "ff-providence-sans-web-pro" public/css/style.min.css`
Expected: `1` (the token made it into the bundle).

- [ ] **Step 4: Commit**

```bash
cd nextjs && git add css/style.css public/css/style.min.css
git commit -m "feat(home): add Providence font variable + home design tokens"
```

---

## Task 2: Shared home element vocabulary (CSS primitives)

Create the reusable classes every section uses so the page is literally "from one mould". These live in a dedicated block in `css/style.css` under a clear comment header, scoped by a `.homeV2` wrapper class so they can't leak into other surfaces.

**Files:**

- Modify: `nextjs/css/style.css` (append a `/* HOME V2 — element vocabulary */` block)

- [ ] **Step 1: Append the vocabulary block to `css/style.css`**

```css
/* ============================================
   HOME V2 — element vocabulary (scoped to .homeV2)
   ============================================ */
.homeV2 {
  background: var(--home-paper);
  color: var(--home-ink);
  font-family: var(--font-providence);
}
.homeV2 .hv-wrap {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 24px;
}
.homeV2 .hv-section {
  margin-top: 56px;
}
.homeV2 .hv-kicker {
  font-family: 'Silkscreen';
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--home-ink);
}
.homeV2 .hv-mk {
  display: inline-block;
  width: 9px;
  height: 9px;
  background: var(--home-accent);
  margin-right: 8px;
  vertical-align: 1px;
}
.homeV2 .hv-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16px;
}
.homeV2 .hv-title {
  font-family: var(--font-providence);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.02em;
  line-height: 0.92;
  font-size: clamp(22px, 3vw, 30px);
}
.homeV2 .hv-link {
  font-family: 'Silkscreen';
  font-weight: 700;
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--home-ink);
}
.homeV2 .hv-rail {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 4px;
}
.homeV2 .hv-rail::-webkit-scrollbar {
  display: none;
}
.homeV2 .hv-rail > * {
  scroll-snap-align: start;
  flex: 0 0 auto;
}
.homeV2 .hv-photo {
  background: var(--home-photo-rest);
  border-radius: var(--home-radius-photo);
  overflow: hidden;
  position: relative;
  display: block;
}
.homeV2 .hv-cap {
  font-family: var(--font-providence);
  font-weight: 700;
  font-size: 13px;
  margin-top: 7px;
  color: var(--home-ink);
}
.homeV2 .hv-sub {
  font-family: var(--font-providence);
  font-weight: 400;
  font-size: 11px;
  color: var(--home-muted);
}
.homeV2 .hv-btn {
  font-family: var(--font-providence);
  font-weight: 700;
  font-size: 13px;
  padding: 11px 18px;
  border-radius: var(--home-radius-btn);
  display: inline-block;
  background: var(--home-ink);
  color: #fff;
  border: none;
  cursor: pointer;
}
.homeV2 .hv-btn--accent {
  background: var(--home-accent);
  color: var(--home-ink);
}
.homeV2 .hv-link-underline {
  font-weight: 700;
  font-size: 13px;
  color: var(--home-ink);
  border-bottom: 2px solid var(--home-accent);
  padding-bottom: 2px;
}
.homeV2 .hv-chip {
  font-family: var(--font-providence);
  font-weight: 700;
  font-size: 12px;
  padding: 9px 15px;
  border-radius: 7px;
  background: var(--home-quiet);
  color: var(--home-ink);
  border: none;
  cursor: pointer;
}
@media (max-width: 760px) {
  .homeV2 .hv-wrap {
    padding: 0 16px;
  }
  .homeV2 .hv-section {
    margin-top: 40px;
  }
}
```

- [ ] **Step 2: Build CSS**

Run: `cd nextjs && npm run build:css`
Expected: no error.

- [ ] **Step 3: Verify primitives present in bundle**

Run: `cd nextjs && grep -c "hv-rail" public/css/style.min.css`
Expected: `≥1`.

- [ ] **Step 4: Commit**

```bash
cd nextjs && git add css/style.css public/css/style.min.css
git commit -m "feat(home): add shared element vocabulary (.homeV2 primitives)"
```

---

## Task 3: Rebuild HubSection skeleton + hero (logged-out)

Replace the inline hero/latest/index/districts/magazine markup in `HubSection.tsx` with the new ordered skeleton. This task lands the wrapper + hero; later tasks fill the remaining sections. Keep `HomeData`/`InitialMapData` props unchanged.

**Files:**

- Modify: `nextjs/app/components/HubSection.tsx`
- Test: `nextjs/app/components/HubSection.test.tsx` (create if missing)

- [ ] **Step 1: Write/extend the test for the new skeleton + hero**

Create `nextjs/app/components/HubSection.test.tsx` (mock child client components that need browser APIs):

```tsx
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi } from 'vitest';
import HubSection from './HubSection';

vi.mock('./HubDeineWelt', () => ({ default: () => null }));
vi.mock('./HubNearby', () => ({ default: () => <div data-testid="nearby" /> }));
vi.mock('./HubMustEatsTeaser', () => ({ default: () => <div data-testid="musteats" /> }));
vi.mock('./HubFragRemy', () => ({ default: () => <div data-testid="remy" /> }));
vi.mock('./HubFaq', () => ({ default: () => <div data-testid="faq" /> }));
vi.mock('./SiteFooter', () => ({ default: () => <footer data-testid="footer" /> }));

const data = {
  spotOfDay: { name: 'Gazzo', slug: 'gazzo', image: '/x.webp', district: 'Prenzlberg' },
  newOnMap: [],
  categories: [],
  districts: [],
  magazine: [],
  categoryNames: { pizza: 'Pizza' },
} as any;
const map = { restaurants: [], mustEats: [], revealedMustEatIds: [] } as any;

function renderHome() {
  return render(
    <NextIntlClientProvider locale="de" messages={{}}>
      <HubSection initialData={data} initialMapData={map} locale="de" />
    </NextIntlClientProvider>
  );
}

describe('HubSection home', () => {
  it('renders the brand hero headline', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: /we tell you what to eat/i })).toBeInTheDocument();
  });
  it('hero links to the map', () => {
    renderHome();
    const cta = screen.getByRole('link', { name: /zur map/i });
    expect(cta).toHaveAttribute('href', expect.stringContaining('/map'));
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL**

Run: `cd nextjs && npx vitest run app/components/HubSection.test.tsx`
Expected: FAIL (no "we tell you what to eat" heading yet).

- [ ] **Step 3: Implement the skeleton + hero in `HubSection.tsx`**

Replace the returned JSX. Wrapper gets `className="homeV2"`. Hero markup (logged-out) — headline is the English brand line on both locales:

```tsx
return (
  <div className={`homeV2 ${styles.page}`} data-hub="" data-cassette-home="">
    <HubHashScroll />
    <HubDeineWelt initialMapData={initialMapData} />
    <section className={`hv-wrap ${styles.hero}`} aria-label={t.spotDay}>
      <div className={styles.heroGrid}>
        <div className={styles.heroCopy}>
          <span className="hv-kicker">
            {locale === 'en' ? 'Berlin — what to eat' : 'Berlin — was du essen sollst'}
          </span>
          <h1 className={styles.heroHeadline}>
            We tell you
            <br />
            what to eat
          </h1>
          <div className={styles.heroActions}>
            <MapIntentLink
              href={spot ? `/map?r=${spot.slug}` : '/map'}
              rel="nofollow"
              className="hv-btn"
            >
              {t.heroCta}
            </MapIntentLink>
            <MapIntentLink href="/map" rel="nofollow" className="hv-link-underline">
              {locale === 'en' ? "What's near me" : 'Was ist um mich'}
            </MapIntentLink>
          </div>
        </div>
        {spot && (
          <MapIntentLink
            href={`/map?r=${spot.slug}`}
            rel="nofollow"
            className={`hv-photo ${styles.heroPhoto}`}
            aria-label={`${normalizeName(spot.name)} — ${t.spotDay}`}
          >
            {spot.image && (
              <Image src={spot.image} alt="" fill priority sizes="(max-width:760px) 92vw, 46vw" />
            )}
            <span className={styles.heroPhotoTag}>
              <span className="hv-kicker">{t.spotDay}</span>
              <strong>{normalizeName(spot.name)}</strong>
            </span>
          </MapIntentLink>
        )}
      </div>
      {/* category quick-picker trigger — wired in Task 5 */}
      <CategoryQuickPick
        categoryNames={initialData.categoryNames}
        placeholder={locale === 'en' ? 'What are you craving?' : 'Worauf hast du Lust?'}
      />
    </section>
    {/* Task 6 */} <CategoriesRail categoryNames={initialData.categoryNames} locale={locale} />
    {/* Task 7 */} <HubNearby initialMapData={initialMapData} />
    {/* Task 8 */} <HubMustEatsTeaser initialMapData={initialMapData} />
    {/* Task 9 */} <HubFragRemy />
    {/* Task 10 */} <DistrictsList districts={initialData.districts} locale={locale} />
    {/* Task 11 */} <MagazineGrid articles={initialData.magazine} locale={locale} />
    <HubFaq locale={locale} />
    <SiteFooter />
  </div>
);
```

For this task only, comment out the not-yet-built `CategoryQuickPick`, `CategoriesRail`, `DistrictsList`, `MagazineGrid` references (they arrive in their own tasks) so the file compiles; leave `HubNearby`, `HubMustEatsTeaser`, `HubFragRemy`, `HubFaq`, `SiteFooter` in place. Add the hero CSS to `HubSection.module.css`:

```css
.hero {
  padding-top: 28px;
}
.heroGrid {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 24px;
  align-items: stretch;
}
.heroCopy {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.heroHeadline {
  font-family: var(--font-providence);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.02em;
  line-height: 0.9;
  font-size: clamp(40px, 6vw, 64px);
  margin: 12px 0 0;
}
.heroActions {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-top: 24px;
}
.heroPhoto {
  min-height: 300px;
}
.heroPhotoTag {
  position: absolute;
  left: 12px;
  bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: #fff;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.5);
}
.heroPhotoTag strong {
  font-family: var(--font-providence);
  font-weight: 700;
  font-size: 16px;
}
@media (max-width: 760px) {
  .heroGrid {
    grid-template-columns: 1fr;
  }
  .heroPhoto {
    min-height: 200px;
  }
}
```

- [ ] **Step 4: Build CSS + run test**

Run: `cd nextjs && npm run build:css && npx vitest run app/components/HubSection.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 5: Visual check**

Start dev (`npm run dev`), open `/` and `/en`. Confirm hero headline "WE TELL YOU WHAT TO EAT", Spot-des-Tages photo, ink "Zur Map" button + yellow-underlined "Was ist um mich", continuous white. Compare to mockup `eat_this_borderless_airy`. Tune `clamp()` sizes/spacing if needed.

- [ ] **Step 6: Commit**

```bash
cd nextjs && git add app/components/HubSection.tsx app/components/HubSection.module.css app/components/HubSection.test.tsx public/css/style.min.css
git commit -m "feat(home): new HubSection skeleton + brand hero (logged-out)"
```

---

## Task 4: Hero logged-in variant (merge HubDeineWelt purpose)

`HubDeineWelt` already renders the logged-in "your map" block above the hero. Restyle it into the `.homeV2` vocabulary and make it read as the logged-in hero (greeting kicker, "DEINE MAP WARTET", saved/Must-Eat shortcuts), so logged-in users get the personal hero and logged-out users get the brand hero (Task 3). Keep its existing auth/data logic untouched.

**Files:**

- Modify: `nextjs/app/components/HubDeineWelt.tsx` (markup classes only — no logic changes)
- Modify: `nextjs/app/components/HubDeineWelt.module.css`
- Test: `nextjs/app/components/HubDeineWelt.test.tsx` (exists)

- [ ] **Step 1: Update the test to assert the restyled hero copy**

In `HubDeineWelt.test.tsx`, assert that when a user is present the section shows the greeting kicker and "Deine Map wartet" (DE). Keep existing link assertions. (Reuse the file's current auth mock; only add/adjust the copy assertions.)

- [ ] **Step 2: Run — expect FAIL**

Run: `cd nextjs && npx vitest run app/components/HubDeineWelt.test.tsx`
Expected: FAIL on the new copy/structure assertion.

- [ ] **Step 3: Restyle markup to `.homeV2` classes**

Wrap the section content in the `hv-wrap` container; use `hv-kicker` for the greeting, `heroHeadline`-style title, `hv-btn`/`hv-link-underline` for the two actions, and `hv-rail` + `hv-photo` for the saved-spots / Must-Eat thumbs. Replace bespoke colors with the home tokens. Do not change the data hooks or the `if (!loading && !user) return null` guard.

- [ ] **Step 4: Build CSS + run test**

Run: `cd nextjs && npm run build:css && npx vitest run app/components/HubDeineWelt.test.tsx`
Expected: PASS.

- [ ] **Step 5: Visual check (logged-in)**

With a signed-in session (or set the `_authHint` localStorage to simulate), confirm the personal hero replaces the brand hero and matches the vocabulary. Confirm logged-out still shows the Task 3 brand hero.

- [ ] **Step 6: Commit**

```bash
cd nextjs && git add app/components/HubDeineWelt.tsx app/components/HubDeineWelt.module.css app/components/HubDeineWelt.test.tsx public/css/style.min.css
git commit -m "feat(home): restyle logged-in hero (Deine Welt) into homeV2"
```

---

## Task 5: Category quick-picker (hero search trigger → map)

A button styled like a search field ("Worauf hast du Lust?") that opens a quick-picker of the full category list; choosing one routes to `/map?cat=<slug>` via `MapIntentLink`.

**Files:**

- Create: `nextjs/app/components/CategoryQuickPick.tsx`
- Create: `nextjs/app/components/CategoryQuickPick.module.css`
- Create: `nextjs/app/components/CategoryQuickPick.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect } from 'vitest';
import CategoryQuickPick from './CategoryQuickPick';

const cats = { pizza: 'Pizza', doener: 'Döner', lunch: 'Lunch' };

function setup() {
  render(
    <NextIntlClientProvider locale="de" messages={{}}>
      <CategoryQuickPick categoryNames={cats} placeholder="Worauf hast du Lust?" />
    </NextIntlClientProvider>
  );
}

describe('CategoryQuickPick', () => {
  it('shows the placeholder trigger', () => {
    setup();
    expect(screen.getByRole('button', { name: /worauf hast du lust/i })).toBeInTheDocument();
  });
  it('reveals category links to the map on open', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /worauf hast du lust/i }));
    const pizza = screen.getByRole('link', { name: /pizza/i });
    expect(pizza).toHaveAttribute('href', expect.stringContaining('/map?cat=pizza'));
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd nextjs && npx vitest run app/components/CategoryQuickPick.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the component**

```tsx
'use client';
import { useState } from 'react';
import MapIntentLink from './MapIntentLink';
import styles from './CategoryQuickPick.module.css';

interface Props {
  categoryNames: Record<string, string>;
  placeholder: string;
}

export default function CategoryQuickPick({ categoryNames, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(categoryNames);
  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{placeholder}</span>
        <span className="hv-btn hv-btn--accent" aria-hidden="true">
          Map
        </span>
      </button>
      {open && (
        <div className={styles.grid} role="listbox">
          {entries.map(([slug, name]) => (
            <MapIntentLink key={slug} href={`/map?cat=${slug}`} rel="nofollow" className="hv-chip">
              {name}
            </MapIntentLink>
          ))}
        </div>
      )}
    </div>
  );
}
```

```css
.wrap {
  margin-top: 16px;
}
.trigger {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--home-quiet);
  border: none;
  border-radius: 8px;
  padding: 13px 16px;
  cursor: pointer;
  font-family: var(--font-providence);
}
.trigger > span:first-child {
  color: var(--home-muted);
  font-weight: 400;
  font-size: 14px;
}
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}
```

- [ ] **Step 4: Wire into the hero**

In `HubSection.tsx`, import `CategoryQuickPick` and un-comment the reference added in Task 3 (`<CategoryQuickPick categoryNames={initialData.categoryNames} placeholder={…} />`).

- [ ] **Step 5: Build CSS + run tests**

Run: `cd nextjs && npm run build:css && npx vitest run app/components/CategoryQuickPick.test.tsx app/components/HubSection.test.tsx`
Expected: PASS.

- [ ] **Step 6: Visual check + commit**

Confirm the field opens a chip grid that jumps to the map filtered by category.

```bash
cd nextjs && git add app/components/CategoryQuickPick.tsx app/components/CategoryQuickPick.module.css app/components/CategoryQuickPick.test.tsx app/components/HubSection.tsx public/css/style.min.css
git commit -m "feat(home): category quick-picker in hero -> map"
```

---

## Task 6: Kategorien rail (full category list)

A horizontal rail of category photo cards using the **full** category list, each linking to `/map?cat=<slug>`. Use `categoryArt(slug)` (already in repo, `lib/categoryArt`) for the imagery.

**Files:**

- Create: `nextjs/app/components/CategoriesRail.tsx`
- Create: `nextjs/app/components/CategoriesRail.module.css`
- Create: `nextjs/app/components/CategoriesRail.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CategoriesRail from './CategoriesRail';

it('renders a category card linking to the map', () => {
  render(<CategoriesRail categoryNames={{ pizza: 'Pizza' }} locale="de" />);
  const link = screen.getByRole('link', { name: /pizza/i });
  expect(link).toHaveAttribute('href', expect.stringContaining('/map?cat=pizza'));
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd nextjs && npx vitest run app/components/CategoriesRail.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```tsx
import Image from 'next/image';
import { categoryArt } from '@/lib/categoryArt';
import MapIntentLink from './MapIntentLink';
import styles from './CategoriesRail.module.css';

interface Props {
  categoryNames: Record<string, string>;
  locale: 'de' | 'en';
}

export default function CategoriesRail({ categoryNames, locale }: Props) {
  const entries = Object.entries(categoryNames);
  if (!entries.length) return null;
  return (
    <section
      className="homeV2 hv-section hv-wrap"
      aria-label={locale === 'en' ? 'Categories' : 'Kategorien'}
    >
      <div className="hv-head">
        <h2 className="hv-title">
          <span className="hv-mk" aria-hidden="true" />
          {locale === 'en' ? 'What are you craving?' : 'Worauf hast du Lust?'}
        </h2>
        <span className="hv-link">{locale === 'en' ? 'Categories' : 'Kategorien'} →</span>
      </div>
      <div className="hv-rail">
        {entries.map(([slug, name]) => {
          const art = categoryArt(slug);
          return (
            <MapIntentLink
              key={slug}
              href={`/map?cat=${slug}`}
              rel="nofollow"
              className={styles.card}
            >
              <span className={`hv-photo ${styles.photo}`}>
                {art && <Image src={art} alt="" fill sizes="120px" />}
              </span>
              <span className="hv-cap">{name}</span>
            </MapIntentLink>
          );
        })}
      </div>
    </section>
  );
}
```

```css
.card {
  display: block;
  flex: 0 0 120px;
}
.photo {
  height: 128px;
}
@media (max-width: 760px) {
  .card {
    flex-basis: 108px;
  }
  .photo {
    height: 112px;
  }
}
```

- [ ] **Step 4: Wire into `HubSection.tsx`** (un-comment the `<CategoriesRail … />` reference; add the import).

- [ ] **Step 5: Build CSS + run tests**

Run: `cd nextjs && npm run build:css && npx vitest run app/components/CategoriesRail.test.tsx app/components/HubSection.test.tsx`
Expected: PASS.

- [ ] **Step 6: Visual check + commit**

```bash
cd nextjs && git add app/components/CategoriesRail.tsx app/components/CategoriesRail.module.css app/components/CategoriesRail.test.tsx app/components/HubSection.tsx public/css/style.min.css
git commit -m "feat(home): categories rail (full list) -> map"
```

---

## Task 7: Nearby — restyle `HubNearby`, absorb "Neu auf der Map"

`HubNearby` already exists (live-location nearest spots). Restyle it to the rail vocabulary and ensure it is the single "around you / new" discovery rail (the old standalone "Neu auf der Map" grid in `HubSection` is already removed by the Task 3 skeleton).

**Files:**

- Modify: `nextjs/app/components/HubNearby.tsx` (markup classes only)
- Modify: `nextjs/app/components/HubNearby.module.css`
- Test: `nextjs/app/components/HubNearby.tsx` has no test today — create `HubNearby.test.tsx`

- [ ] **Step 1: Write a minimal test** asserting it renders a section header "Um dich herum" and that spot links target `/map?r=`. Mock `@/lib/map`, `@/lib/auth`, and `@/lib/map/UserLocationContext` to supply one restaurant with a slug + photo (follow the mocking style in `HubMustEatsTeaser` tests / existing hub tests).

- [ ] **Step 2: Run — expect FAIL** (`npx vitest run app/components/HubNearby.test.tsx`).

- [ ] **Step 3: Restyle markup** to use `homeV2 hv-section hv-wrap`, `hv-head`/`hv-title`/`hv-mk`/`hv-link`, `hv-rail`, `hv-photo` + `hv-cap`/`hv-sub` (distance/category meta). Keep all geolocation logic and the SSR/anon fallback untouched.

- [ ] **Step 4: Build CSS + run test** → PASS.

- [ ] **Step 5: Visual check** (allow location → cards reorder by distance; deny → Mitte fallback).

- [ ] **Step 6: Commit**

```bash
cd nextjs && git add app/components/HubNearby.tsx app/components/HubNearby.module.css app/components/HubNearby.test.tsx public/css/style.min.css
git commit -m "feat(home): restyle Nearby rail into homeV2"
```

---

## Task 8: Must Eats — consolidate teaser + All Berlin CTA, drop pack sections

Restyle `HubMustEatsTeaser` into the vocabulary and add the single commerce CTA "All Berlin freischalten" → `/pack/all-berlin`. The separate `HubAllBerlin`, `HubPacks`, `HubWelcomePack` are **not** rendered on the home anymore (already absent from the Task 3 skeleton).

**Files:**

- Modify: `nextjs/app/components/HubMustEatsTeaser.tsx`
- Modify: `nextjs/app/components/HubMustEatsTeaser.module.css`
- Test: `nextjs/app/components/HubMustEatsTeaser.test.tsx` (exists)

- [ ] **Step 1: Update the test** to assert (a) the section header "Must Eats", (b) a CTA link to `/pack/all-berlin`, (c) face-up cards still link to `/map?me=` and locked cards to the unlock path (keep existing assertions for the face-up logic).

- [ ] **Step 2: Run — expect FAIL** (`npx vitest run app/components/HubMustEatsTeaser.test.tsx`).

- [ ] **Step 3: Restyle markup** to `homeV2 hv-section hv-wrap` + header pattern; render the teaser cards in a row (locked = ink fill `--home-ink`, open = `hv-photo` with image); add:

```tsx
<MapIntentLink href="/pack/all-berlin" rel="nofollow" className="hv-btn hv-btn--accent">
  {locale === 'en' ? 'Unlock all Berlin →' : 'All Berlin freischalten →'}
</MapIntentLink>
```

Keep the face-up resolution logic (`resolveUnlockedMustEatIds`, mount swap) unchanged.

- [ ] **Step 4: Build CSS + run test** → PASS.

- [ ] **Step 5: Visual check** (anon: ~10 face-up + locked; CTA jumps to the All-Berlin pack page).

- [ ] **Step 6: Commit**

```bash
cd nextjs && git add app/components/HubMustEatsTeaser.tsx app/components/HubMustEatsTeaser.module.css app/components/HubMustEatsTeaser.test.tsx public/css/style.min.css
git commit -m "feat(home): consolidate Must Eats + All Berlin CTA into homeV2"
```

---

## Task 9: Frag Remy — restyle into homeV2 (yellow as accent, not a band)

Re-skin `HubFragRemy` from the full yellow band to the white vocabulary: section header + Remy avatar (yellow circle) + quiet quick-ask chips. Behaviour unchanged (chips/input dispatch via `dispatchBuddyAsk`).

**Files:**

- Modify: `nextjs/app/components/HubFragRemy.tsx` (markup/classes only)
- Modify: `nextjs/app/components/HubFragRemy.module.css`
- Test: `nextjs/app/components/HubFragRemy.test.tsx` (exists)

- [ ] **Step 1: Update the test** to assert the header "Frag Remy" / "Keine Idee?" renders and quick-ask chips are present and clickable (keep the existing `dispatchBuddyAsk` spy assertions).

- [ ] **Step 2: Run — expect FAIL** (`npx vitest run app/components/HubFragRemy.test.tsx`).

- [ ] **Step 3: Restyle markup** to `homeV2 hv-section hv-wrap` + header; Remy avatar = 74px circle `background:var(--home-accent)`; chips = `hv-chip`. Remove the yellow full-bleed band background. Keep the IntersectionObserver "talk" effect and dispatch logic.

- [ ] **Step 4: Build CSS + run test** → PASS.

- [ ] **Step 5: Visual check** (chips open the buddy widget).

- [ ] **Step 6: Commit**

```bash
cd nextjs && git add app/components/HubFragRemy.tsx app/components/HubFragRemy.module.css app/components/HubFragRemy.test.tsx public/css/style.min.css
git commit -m "feat(home): restyle Frag Remy into homeV2 (yellow as accent)"
```

---

## Task 10: Bezirke list

A hairline list (district name UPPERCASE + count "→") linking to `/map?bezirk=<slug>`. Source: `initialData.districts`.

**Files:**

- Create: `nextjs/app/components/DistrictsList.tsx`
- Create: `nextjs/app/components/DistrictsList.module.css`
- Create: `nextjs/app/components/DistrictsList.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DistrictsList from './DistrictsList';

const districts = [{ name: 'Kreuzberg', slug: 'kreuzberg', count: 12, spots: [] }] as any;

it('renders a district row linking to the map', () => {
  render(<DistrictsList districts={districts} locale="de" />);
  const link = screen.getByRole('link', { name: /kreuzberg/i });
  expect(link).toHaveAttribute('href', expect.stringContaining('/map?bezirk=kreuzberg'));
});
```

- [ ] **Step 2: Run — expect FAIL** (`npx vitest run app/components/DistrictsList.test.tsx`).

- [ ] **Step 3: Implement**

```tsx
import { normalizeName } from '@/lib/normalizeName';
import MapIntentLink from './MapIntentLink';
import type { HubDistrict } from '@/lib/home/getHomeData';
import styles from './DistrictsList.module.css';

interface Props {
  districts: HubDistrict[];
  locale: 'de' | 'en';
}

export default function DistrictsList({ districts, locale }: Props) {
  if (!districts.length) return null;
  return (
    <section
      className="homeV2 hv-section hv-wrap"
      aria-label={locale === 'en' ? 'By district' : 'Nach Bezirk'}
    >
      <div className="hv-head">
        <h2 className="hv-title">
          <span className="hv-mk" aria-hidden="true" />
          {locale === 'en' ? 'By district' : 'Nach Bezirk'}
        </h2>
        <span className="hv-link">{locale === 'en' ? 'All' : 'Alle'} →</span>
      </div>
      <div className={styles.rows}>
        {districts.map((d) => (
          <MapIntentLink
            key={d.slug}
            href={`/map?bezirk=${d.slug}`}
            rel="nofollow"
            className={styles.row}
          >
            <span className={styles.name}>{normalizeName(d.name)}</span>
            <span className="hv-sub">
              {d.count} {locale === 'en' ? 'spots' : 'Spots'} →
            </span>
          </MapIntentLink>
        ))}
      </div>
    </section>
  );
}
```

```css
.rows {
  display: flex;
  flex-direction: column;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid var(--home-rule);
}
.row:last-child {
  border-bottom: 1px solid var(--home-rule);
}
.name {
  font-family: var(--font-providence);
  font-weight: 700;
  font-size: clamp(15px, 2vw, 17px);
  text-transform: uppercase;
  color: var(--home-ink);
}
```

- [ ] **Step 4: Wire into `HubSection.tsx`** (un-comment `<DistrictsList … />`, add import).

- [ ] **Step 5: Build CSS + run tests** → PASS (`DistrictsList.test.tsx` + `HubSection.test.tsx`).

- [ ] **Step 6: Visual check + commit**

```bash
cd nextjs && git add app/components/DistrictsList.tsx app/components/DistrictsList.module.css app/components/DistrictsList.test.tsx app/components/HubSection.tsx public/css/style.min.css
git commit -m "feat(home): bezirke hairline list -> map"
```

---

## Task 11: Magazin grid ("Auf den Teller")

Lead story + two secondary photo cards linking to `/news/<slug>`. Source: `initialData.magazine`.

**Files:**

- Create: `nextjs/app/components/MagazineGrid.tsx`
- Create: `nextjs/app/components/MagazineGrid.module.css`
- Create: `nextjs/app/components/MagazineGrid.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MagazineGrid from './MagazineGrid';

const articles = [
  { title: 'Beste Pizza 2026', slug: 'beste-pizza', image: '/a.webp', kicker: 'Guide' },
  { title: 'Neukölln Guide', slug: 'nk-guide', image: '/b.webp', kicker: 'Guide' },
] as any;

it('links articles to the news route', () => {
  render(<MagazineGrid articles={articles} locale="de" />);
  expect(screen.getByRole('link', { name: /beste pizza 2026/i })).toHaveAttribute(
    'href',
    expect.stringContaining('/news/beste-pizza')
  );
});
```

- [ ] **Step 2: Run — expect FAIL** (`npx vitest run app/components/MagazineGrid.test.tsx`).

- [ ] **Step 3: Implement** a server component using `Link` from `@/i18n/navigation`, `hv-head` header ("Auf den Teller" / "On the plate"), a CSS grid: first article = lead (large `hv-photo`), the rest = stacked secondary cards. Each card: `hv-photo` + `hv-cap` (title) + optional `hv-sub` (kicker). Return null if empty.

```css
.grid {
  display: grid;
  grid-template-columns: 1.7fr 1fr;
  gap: 14px;
}
.lead .leadPhoto {
  height: 260px;
}
.secondary {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.secondary .secPhoto {
  height: 122px;
}
@media (max-width: 760px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Wire into `HubSection.tsx`** (un-comment `<MagazineGrid … />`, add import). At this point every commented reference from Task 3 is live; remove any leftover comment markers.

- [ ] **Step 5: Build CSS + run tests** → PASS (`MagazineGrid.test.tsx` + `HubSection.test.tsx`).

- [ ] **Step 6: Visual check + commit**

```bash
cd nextjs && git add app/components/MagazineGrid.tsx app/components/MagazineGrid.module.css app/components/MagazineGrid.test.tsx app/components/HubSection.tsx public/css/style.min.css
git commit -m "feat(home): magazine grid -> news"
```

---

## Task 12: FAQ restyle + footer alignment

Restyle `HubFaq` into the vocabulary (it stays just above the footer for the FAQPage schema/SEO — the JSON-LD in `page.tsx` must keep matching DOM content). Confirm `SiteFooter` reads correctly on white.

**Files:**

- Modify: `nextjs/app/components/HubFaq.tsx` / `HubFaq.module.css`
- Modify (if needed): `nextjs/app/components/SiteFooter.tsx` / its CSS
- Test: `nextjs/app/components/HubFaq.test.tsx` (exists)

- [ ] **Step 1: Update the test** to assert the FAQ questions still render (same source `getLandingFaqs`) under the new header. Keep existing assertions.

- [ ] **Step 2: Run — expect FAIL** if structure changed (`npx vitest run app/components/HubFaq.test.tsx`).

- [ ] **Step 3: Restyle markup** to `homeV2 hv-section hv-wrap` + header; questions as a hairline accordion/list using `--home-rule`. Do not change the FAQ data source (keeps JSON-LD ↔ DOM parity).

- [ ] **Step 4: Build CSS + run test** → PASS.

- [ ] **Step 5: Visual check** (FAQ + footer read on white; footer wordmark/legal links present).

- [ ] **Step 6: Commit**

```bash
cd nextjs && git add app/components/HubFaq.tsx app/components/HubFaq.module.css public/css/style.min.css
git commit -m "feat(home): restyle FAQ into homeV2"
```

---

## Task 13: Floating Remy button (persistent)

Ensure a persistent yellow floating Remy button is present on the home (bottom-right) that opens the buddy widget. If a floating buddy entry point already exists in `app/components/buddy/`, restyle it to the yellow circular treatment; otherwise add a small client button on the home that calls the same `dispatchBuddyAsk`/open path used by `HubFragRemy`.

**Files:**

- Inspect first: `nextjs/app/components/buddy/` (find the existing widget + open mechanism)
- Create or modify: a `FloatingRemy` entry (component + module CSS) OR the existing buddy launcher styles
- Test: `FloatingRemy.test.tsx` if a new component is created

- [ ] **Step 1: Inspect** `app/components/buddy/` and `lib/buddy/homeStage.ts` to find the existing open mechanism. Decide: restyle existing launcher vs. add a thin home-only launcher.

- [ ] **Step 2: Write a test** (if new component) asserting the button renders with an accessible label ("Frag Remy") and triggers the buddy-open call (spy on the dispatch).

- [ ] **Step 3: Implement** the 52px yellow circle, fixed bottom-right (respect the `position: fixed` is fine here — this is a real fixed launcher, not a mockup). Ensure it does not overlap the cookie banner / system bars (z-index + safe-area-inset-bottom).

- [ ] **Step 4: Build CSS + run test** → PASS.

- [ ] **Step 5: Visual check** desktop + mobile (button floats, opens Remy, doesn't cover the footer legal links on mobile).

- [ ] **Step 6: Commit**

```bash
cd nextjs && git add app/components/<files> public/css/style.min.css
git commit -m "feat(home): persistent floating Remy launcher"
```

---

## Task 14: Mobile responsive pass

Verify and tune every section at mobile widths (360 / 390 / 414). Most rules are already mobile-first; this task is the dedicated audit against the `eat_this_mobile` mockup.

**Files:**

- Modify as needed: `css/style.css` (`.homeV2` media block) + any section `.module.css`

- [ ] **Step 1: Audit** at 360px: hero stacks (kicker → headline → photo → quick-pick), rails scroll with a bleeding partial card, bezirke full-width rows, Remy floats clear of the footer. Note each deviation from the mockup.

- [ ] **Step 2: Tune** the `@media (max-width:760px)` rules (headline `clamp`, section `margin-top`, rail card widths, hero photo height). Keep changes in the scoped `.homeV2` block / section modules.

- [ ] **Step 3: Build CSS** (`npm run build:css`) and re-check at 360/390/414 in dev (responsive mode).

- [ ] **Step 4: Run full suite**

Run: `cd nextjs && npm test`
Expected: PASS (all home component tests green).

- [ ] **Step 5: Commit**

```bash
cd nextjs && git add css/style.css app/components/*.module.css public/css/style.min.css
git commit -m "feat(home): mobile responsive pass"
```

---

## Task 15: Cleanup dead components, cache-bust, final build verify

**Files:**

- Delete (if unused anywhere else): `nextjs/app/components/HubPacks.tsx` (+`.module.css`,`.test.tsx`), `HubAllBerlin.tsx` (+`.module.css`,`.test.tsx`), `HubWelcomePack.tsx`. Also the now-unused inline-hero CSS in `HubSection.module.css` and the legacy `HubHero.tsx`/`HubHero.module.css`/`HubHero.test.tsx` if confirmed unreferenced.
- Modify: `nextjs/app/[locale]/(spa)/layout.tsx` (bump `?v=NN`)

- [ ] **Step 1: Confirm no remaining imports**

Run:

```bash
cd nextjs && grep -rn "HubPacks\|HubAllBerlin\|HubWelcomePack\|HubHero" app/ --include "*.tsx" | grep -v ".test.tsx"
```

Expected: no matches outside the files themselves. Anything that still imports them must be cleaned first.

- [ ] **Step 2: Delete the dead files** (only those with zero remaining imports).

```bash
cd nextjs && git rm app/components/HubPacks.tsx app/components/HubPacks.module.css app/components/HubPacks.test.tsx app/components/HubAllBerlin.tsx app/components/HubAllBerlin.module.css app/components/HubAllBerlin.test.tsx app/components/HubWelcomePack.tsx
# add HubHero.* only if Step 1 confirmed it is unreferenced
```

- [ ] **Step 3: Bump the stylesheet cache-bust** — increment the `?v=NN` on the `<link rel="stylesheet">` in `app/[locale]/(spa)/layout.tsx`.

- [ ] **Step 4: Remove dead CSS** from `HubSection.module.css` (old `.latest`, `.indexBlock`, `.foodStrip`, `.districtSection`, `.magSection`, `.redPanel`, etc. that the new skeleton no longer uses).

- [ ] **Step 5: Stop dev, run the full build** (mirrors Firebase + the pre-push hook)

Run: `cd nextjs && npm run build`
Expected: build succeeds with no type errors and no missing-module errors.

- [ ] **Step 6: Run the full test suite**

Run: `cd nextjs && npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd nextjs && git add -- app/components app/'[locale]'/'(spa)'/layout.tsx css/style.css public/css/style.min.css
git commit -m "chore(home): remove dead pack/hero components, bump CSS cache-bust"
```

---

## Self-review (done while writing — recorded for the executor)

- **Spec coverage:** hero brand statement (T3) + logged-in variant (T4); white/ink/yellow tokens + Providence/Silkscreen (T1–T2); borderless photo-forward rails (T2 + every section); category quick-picker → map (T5); full-list categories rail (T6); nearby (T7); Must Eats consolidated incl. All Berlin, packs dropped (T8, T15); Remy restyle + floating launcher (T9, T13); bezirke (T10); magazin (T11); FAQ kept+restyled with JSON-LD parity (T12); mobile (T14); cleanup + cache-bust + build (T15). All §3 sections and §5 implementation notes mapped.
- **Red removed:** no task introduces `#D9382A` on the home. ✓
- **Type/name consistency:** shared classes (`hv-*`, `homeV2`) defined once in T2 and reused verbatim; new components `CategoryQuickPick`, `CategoriesRail`, `DistrictsList`, `MagazineGrid` are referenced in T3's skeleton and built in their own tasks with matching prop names (`categoryNames`, `districts`, `articles`, `locale`).
- **Known iteration point:** exact spacing/sizes are tuned at each "Visual check" step against the spec token table + mockups; the CSS given is the correct starting structure, not a frozen pixel spec.
