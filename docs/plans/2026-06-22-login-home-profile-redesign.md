# Login-Home & Profil Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the logged-in Home a lean discovery launcher and the Profile a collector cockpit (progress hero + Panini sticker album), with location-driven personalization and a separate avatar-picker layer.

**Architecture:** Two independently shippable phases. Phase 1 trims `HubDeineWelt` to a launcher, reorders `HubSection`, and gates the editorial "Spot des Tages" to logged-out only. Phase 2 rebuilds the profile around two pure helpers (deterministic card numbering + collector rank) and three view pieces (dark hero, Panini `ProfileAlbum`, `AvatarPickerModal`). Pure logic is unit-tested with vitest (TDD); layout is verified visually in the running app.

**Tech Stack:** Next.js App Router, React client components, CSS Modules, next-intl v4, vitest. Adobe-Fonts `moonblossom` (display) + DM Sans (body) are already loaded app-wide.

**Spec:** `docs/specs/2026-06-22-login-home-profile-redesign-design.md`

**Execution target:** the live working tree at `/Users/ersane/Downloads/Projekte/Eat This Neu` on branch `staging` (where the current login/hub work already lives and the dev server runs). Run all commands from `nextjs/`. Branch protection blocks `main`; `staging` auto-deploys on push.

**Conventions (read first):**

- DE-default i18n: strings in `lib/i18n/translations.ts` (EN block + DE override block). Add keys to BOTH.
- Face-up resolution is centralized in `resolveUnlockedMustEatIds` (`lib/map/unlockedMustEats.ts`); reuse it, do not re-derive.
- Pre-paint auth visibility uses `html[data-auth="1"]` with `[data-auth-only]` (shown only when signed-in) and `[data-guest-only]` (shown only when signed-out) — see `app/globals.css`.
- Never animate `opacity` for entry/exit motion (brand rule). Use translate/clip.
- Verify CSS visually via the running dev server (`:3000`). To preview a signed-in section without auth: temporarily neutralize the auth gate (`if (!loading && !user && false) return null`), set `localStorage._authHint` + `document.documentElement.dataset.auth='1'`, screenshot, then REVERT the gate.

---

## File Structure

**Phase 1 — Home launcher**

- Modify `app/components/HubDeineWelt.tsx` — strip stats/progress + district picker; add location chip; keep greeting/title/Map-CTA + the 2 picks.
- Modify `app/components/HubDeineWelt.module.css` — launcher layout; remove stat/picker styles.
- Modify `app/components/HubSection.tsx` — module order; mark `HubHero` guest-only.
- Modify `app/components/HubHero.tsx` — add `data-guest-only` wrapper attribute.
- Modify `lib/i18n/translations.ts` — launcher strings (location chip states).

**Phase 2 — Profile collector**

- Create `lib/profile/collectorRank.ts` — pure rank/level resolver.
- Create `lib/profile/collectorRank.test.ts` — vitest.
- Create `lib/profile/mustEatAlbum.ts` — pure deterministic numbering + category grouping.
- Create `lib/profile/mustEatAlbum.test.ts` — vitest.
- Create `app/components/profile/ProfileAlbum.tsx` (+ `.module.css`) — Panini album (replaces the `ProfileMustEats` grid).
- Create `app/components/profile/AvatarPickerModal.tsx` (+ `.module.css`) — portal modal.
- Modify `app/components/profile/ProfileShell.tsx` — dark hero (avatar + "Ändern", name, member-since, progress, rank, actions), mount album + modal.
- Modify `app/components/profile/ProfileSlim.module.css` — hero restyle.
- Modify `lib/i18n/translations.ts` — rank labels + profile hero/album strings.

---

# PHASE 1 — Home Launcher

_Shippable on its own: logged-in Home becomes a launcher; logged-out Home unchanged._

## Task 1.1: Gate "Spot des Tages" to logged-out users

**Files:**

- Modify: `app/components/HubHero.tsx`
- Modify: `app/components/HubSection.tsx`

- [ ] **Step 1: Add `data-guest-only` to the HubHero root**

In `app/components/HubHero.tsx`, add the attribute to the outermost rendered element (e.g. the `<section>`):

```tsx
<section className={styles.hero} data-guest-only="">
```

This reuses the global rule `html[data-auth="1"] [data-guest-only] { display: none }` — the editorial hero is hidden for signed-in visitors pre-paint (no flash), and `HubDeineWelt` (`data-auth-only`) leads instead.

- [ ] **Step 2: Verify in the running app**

Dev server on `:3000`. Logged-out `/`: "Spot des Tages" hero shows. Then in DevTools console set `document.documentElement.dataset.auth='1'` → the hero disappears, leaving the personalized dock as the lead. Revert with `delete document.documentElement.dataset.auth`.
Expected: hero visible for guests, hidden when `data-auth="1"`.

- [ ] **Step 3: Commit**

```bash
git add app/components/HubHero.tsx
git commit -m "feat(hub): gate Spot-des-Tages hero to logged-out (data-guest-only)"
```

## Task 1.2: Reorder hub modules

**Files:**

- Modify: `app/components/HubSection.tsx`

- [ ] **Step 1: Reorder the JSX children**

Target order after `HubDeineWelt` (the launcher dock) and the guest-only `HubHero`:

```tsx
<HubDeineWelt initialMapData={initialMapData} />
{spot ? <HubHero spot={spot} today={today} /> : <h1>Eat This</h1>}
<HubNearby initialMapData={initialMapData} />
<HubNewOnMap cards={initialData.newOnMap} />
<HubFragRemy />
<HubMustEatsTeaser initialMapData={initialMapData} />
<HubMagazine articles={initialData.magazine} />
<HubCategories categories={initialData.categories} />
<HubBezirke districts={initialData.districts} />
<HubPacks categoryNames={initialData.categoryNames} />
<HubAllBerlin />
<HubFaq locale={locale} />
<SiteFooter />
```

(Only the relative order of `HubNearby`, `HubNewOnMap`, `HubFragRemy`, `HubMustEatsTeaser` changes vs. today; the editorial hero stays in the tree but is CSS-hidden for signed-in users from Task 1.1.)

- [ ] **Step 2: Verify build + visual order**

Run: `npm run build:css` is not needed (CSS Modules). Just check `:3000` `/` scroll order for both guest and (simulated) signed-in.
Expected: guest order leads with Spot des Tages; signed-in leads with the dock → Nearby → New → Frag Rémy → Must Eats → browse modules.

- [ ] **Step 3: Commit**

```bash
git add app/components/HubSection.tsx
git commit -m "feat(hub): reorder modules — discovery-first dramaturgy"
```

## Task 1.3: Launcher strings (location chip)

**Files:**

- Modify: `lib/i18n/translations.ts`

- [ ] **Step 1: Add keys under `hub.deineWelt` in BOTH the EN block and the DE override block**

EN block:

```ts
locationDetected: "📍 {bezirk}",
locationEnable: "📍 Enable location",
```

DE override block:

```ts
locationDetected: "📍 {bezirk}",
locationEnable: "📍 Standort aktivieren",
```

(The greeting/title keys `dockHello`, `dockHelloName`, `dockQuestion` already exist and are reused. `dockProgress`, district-picker keys, and any `collection*` keys used only by the old dock can be removed in Task 1.4 once unreferenced.)

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (translation shape derives from the EN block; DE keys must mirror).

- [ ] **Step 3: Commit**

```bash
git add lib/i18n/translations.ts
git commit -m "i18n(hub): launcher location-chip strings"
```

## Task 1.4: Trim HubDeineWelt to a launcher + location chip

**Files:**

- Modify: `app/components/HubDeineWelt.tsx`
- Modify: `app/components/HubDeineWelt.module.css`

- [ ] **Step 1: Remove stats/progress + district picker from the component**

In `HubDeineWelt.tsx`:

- Delete the collection-progress computation (`collected`, `collectPct`, `dataMustEats`/`faceUp` blocks) and the `dockProgress` line — progress now lives in the profile.
- Delete the entire `districtPicker` UI (`districtOpen`, `selectedDistrict`, `districtMenuRef`, the menu effect, the `<div className={styles.districtPicker}>` block).
- Keep: greeting (`dockHello`/`dockHelloName`), `dockQuestion` title, the Map CTA (`MapIntentLink href="/map"`), the profile link, and the two picks (`spotPick`/`mustPick`) blocks unchanged.

- [ ] **Step 2: Add the location chip (replaces the district picker)**

Use the existing location context. Near the other hooks:

```tsx
import { useUserLocationContext } from '@/lib/map/UserLocationContext';
// ...
const { location, request } = useUserLocationContext();
// geoBezirk fetch already exists below; reuse it for the label.
```

Render the chip in the action row in place of the old picker:

```tsx
{
  location && geoBezirk ? (
    <span className={styles.locChip} aria-live="polite">
      {t('locationDetected', { bezirk: geoBezirk })}
    </span>
  ) : (
    <button type="button" className={styles.locChip} onClick={() => void request()}>
      {t('locationEnable')}
    </button>
  );
}
```

(The existing `geoBezirk` `useEffect` that calls `/api/bezirk` stays; it now feeds the chip label instead of the dropdown.)

- [ ] **Step 3: Update CSS — launcher layout + chip; drop dead rules**

In `HubDeineWelt.module.css`:

- Remove the `.collect*`, `.bar*`, `.districtPicker`, `.districtSelect`, `.districtMenu`, `.districtOption` rule blocks (and their dark/light variants) — now unreferenced.
- Add a `.locChip` rule mirroring the old `.districtSelect` look (chip: `min-height:46px; border-radius:8px; padding:8px 14px; border:1px solid var(--dock-line); background:var(--dock-panel); font-family:var(--font-poster); text-transform:uppercase` ), non-interactive when it's a `<span>`.
- Keep `.inner` two-column (copy | recommendations) layout and the pick-card styles as-is.

- [ ] **Step 4: Verify visually (signed-in simulation)**

Temporarily set the gate to `if (!loading && !user && false) return null` in `HubDeineWelt.tsx`, load `/`, run in console `localStorage.setItem('_authHint', JSON.stringify({n:'Erkan',a:2})); document.documentElement.dataset.auth='1'`, reload, screenshot.
Expected: greeting + "Was essen wir heute?" + red "Map öffnen" + location chip; the two picks on the right; NO stats line, NO district dropdown. **Revert the gate edit afterward.**

- [ ] **Step 5: Typecheck + tests + commit**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. Note: `HubDeineWelt.test.tsx` asserts old dock behavior — update those assertions to the launcher (no progress text, no picker; greeting + question + picks present) as part of this step.

```bash
git add app/components/HubDeineWelt.tsx app/components/HubDeineWelt.module.css app/components/HubDeineWelt.test.tsx
git commit -m "feat(hub): trim Deine-Welt dock to a location-driven launcher"
```

---

# PHASE 2 — Profile Collector

_Shippable on its own: profile becomes the collector cockpit. Depends on Phase 1 only conceptually (stats moved here), not technically._

## Task 2.1: Collector rank helper (pure, TDD)

**Files:**

- Create: `lib/profile/collectorRank.ts`
- Create: `lib/profile/collectorRank.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { resolveRank, RANKS } from './collectorRank';

describe('resolveRank', () => {
  it('is Frischling at zero', () => {
    expect(resolveRank(0, 29).key).toBe('frischling');
  });
  it('is Entdecker after the first reveal', () => {
    expect(resolveRank(1, 29).key).toBe('entdecker');
  });
  it('is Kenner at >=25%', () => {
    expect(resolveRank(8, 29).key).toBe('kenner'); // 27.5%
  });
  it('is Local at >=50%', () => {
    expect(resolveRank(15, 29).key).toBe('local'); // 51.7%
  });
  it('is Stadtbekannt at >=80%', () => {
    expect(resolveRank(24, 29).key).toBe('stadtbekannt'); // 82.7%
  });
  it('is Komplett at 100%', () => {
    expect(resolveRank(29, 29).key).toBe('komplett');
  });
  it('level is the 1-based rank index', () => {
    expect(resolveRank(0, 29).level).toBe(1);
    expect(resolveRank(29, 29).level).toBe(RANKS.length);
  });
  it('handles total=0 safely', () => {
    expect(resolveRank(0, 0).key).toBe('frischling');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- collectorRank`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// lib/profile/collectorRank.ts
// Collector rank derived purely from how many Must-Eats are revealed.
// Thresholds are fractions of the total catalogue so they scale with it.
export interface Rank {
  key: string;
  minFraction: number;
}

export const RANKS: Rank[] = [
  { key: 'frischling', minFraction: 0 },
  { key: 'entdecker', minFraction: Number.EPSILON }, // any > 0
  { key: 'kenner', minFraction: 0.25 },
  { key: 'local', minFraction: 0.5 },
  { key: 'stadtbekannt', minFraction: 0.8 },
  { key: 'komplett', minFraction: 1 },
];

export function resolveRank(collected: number, total: number): { key: string; level: number } {
  const fraction = total > 0 ? collected / total : 0;
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (fraction >= RANKS[i].minFraction) idx = i;
  }
  return { key: RANKS[idx].key, level: idx + 1 };
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `npm test -- collectorRank`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/profile/collectorRank.ts lib/profile/collectorRank.test.ts
git commit -m "feat(profile): collector rank helper"
```

## Task 2.2: Album numbering + category grouping (pure, TDD)

**Files:**

- Create: `lib/profile/mustEatAlbum.ts`
- Create: `lib/profile/mustEatAlbum.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildAlbum } from './mustEatAlbum';

const me = (id: string, cat: string, dish: string) =>
  ({
    _id: id,
    dish,
    image: `${id}.jpg`,
    restaurant: { name: 'R', slug: 'r', district: 'X', categories: [{ name: cat }] },
  }) as any;

const all = [
  me('b', 'Fast Food', 'Döner'),
  me('a', 'Frühstück', 'Croissant'),
  me('c', 'Fast Food', 'Burger'),
];

describe('buildAlbum', () => {
  it('groups into category pages, alphabetical by category', () => {
    const pages = buildAlbum(all, new Set());
    expect(pages.map((p) => p.category)).toEqual(['Fast Food', 'Frühstück']);
  });
  it('assigns stable global 1-based numbers in (category, id) order', () => {
    const pages = buildAlbum(all, new Set());
    const ff = pages[0].slots;
    expect(ff.map((s) => [s.no, s.id])).toEqual([
      [1, 'b'],
      [2, 'c'],
    ]);
    expect(pages[1].slots[0].no).toBe(3); // 'a'
  });
  it('reveals dish/image only for collected ids', () => {
    const pages = buildAlbum(all, new Set(['b']));
    const doener = pages[0].slots.find((s) => s.id === 'b')!;
    const burger = pages[0].slots.find((s) => s.id === 'c')!;
    expect(doener.collected).toBe(true);
    expect(doener.mustEat?.dish).toBe('Döner');
    expect(burger.collected).toBe(false);
    expect(burger.mustEat).toBeNull();
  });
  it('numbers are stable regardless of which are collected', () => {
    const a = buildAlbum(all, new Set());
    const b = buildAlbum(all, new Set(['b', 'c']));
    expect(a[0].slots.map((s) => s.no)).toEqual(b[0].slots.map((s) => s.no));
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- mustEatAlbum`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// lib/profile/mustEatAlbum.ts
import type { MustEatPreview } from '@/lib/sanity.server';

export interface AlbumSlot {
  no: number; // stable 1-based catalogue number
  id: string;
  collected: boolean;
  mustEat: MustEatPreview | null; // non-null only when collected (else hidden "?")
}
export interface AlbumPage {
  category: string;
  slots: AlbumSlot[];
}

const categoryOf = (m: MustEatPreview): string => m.restaurant?.categories?.[0]?.name ?? 'Sonstige';

// Deterministic: sort by (category, _id) so numbers never shift when the user
// reveals cards. Number globally 1..n in that order; group into category pages.
export function buildAlbum(all: MustEatPreview[], faceUpIds: Set<string>): AlbumPage[] {
  const sorted = [...all].sort((a, b) => {
    const c = categoryOf(a).localeCompare(categoryOf(b), 'de');
    return c !== 0 ? c : a._id.localeCompare(b._id);
  });
  const pages: AlbumPage[] = [];
  sorted.forEach((m, i) => {
    const cat = categoryOf(m);
    const collected = faceUpIds.has(m._id);
    const slot: AlbumSlot = { no: i + 1, id: m._id, collected, mustEat: collected ? m : null };
    const page = pages[pages.length - 1];
    if (page && page.category === cat) page.slots.push(slot);
    else pages.push({ category: cat, slots: [slot] });
  });
  return pages;
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `npm test -- mustEatAlbum`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/profile/mustEatAlbum.ts lib/profile/mustEatAlbum.test.ts
git commit -m "feat(profile): Panini album numbering + category grouping"
```

## Task 2.3: Rank + profile strings (i18n)

**Files:**

- Modify: `lib/i18n/translations.ts`

- [ ] **Step 1: Add rank labels + hero/album strings under `profile` in BOTH blocks**

EN:

```ts
ranks: { frischling: 'Newcomer', entdecker: 'Explorer', kenner: 'Connoisseur', local: 'Local', stadtbekannt: 'City-famous', komplett: 'Completionist' },
levelChip: 'Level {level} · {rank}',
revealedLabel: 'Must Eats revealed',
albumHeading: 'Your collection',
albumStuck: '{collected} / {total} stuck in',
changeAvatar: '✎ Change',
avatarModalTitle: 'Choose your character',
avatarModalSub: 'Who are you on the map?',
avatarApply: 'Apply',
```

DE:

```ts
ranks: { frischling: 'Frischling', entdecker: 'Entdecker', kenner: 'Kenner', local: 'Local', stadtbekannt: 'Stadtbekannt', komplett: 'Komplett' },
levelChip: 'Level {level} · {rank}',
revealedLabel: 'Must-Eats aufgedeckt',
albumHeading: 'Deine Sammlung',
albumStuck: '{collected} / {total} eingeklebt',
changeAvatar: '✎ Ändern',
avatarModalTitle: 'Charakter wählen',
avatarModalSub: 'Wer bist du auf der Map?',
avatarApply: 'Übernehmen',
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add lib/i18n/translations.ts
git commit -m "i18n(profile): rank labels + collector hero/album strings"
```

## Task 2.4: AvatarPickerModal (separate layer)

**Files:**

- Create: `app/components/profile/AvatarPickerModal.tsx`
- Create: `app/components/profile/AvatarPickerModal.module.css`

- [ ] **Step 1: Implement the modal (portal, scroll-lock, Escape, no opacity entry)**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { AvatarChoice } from '@/lib/firebase/useUserProfile';
import styles from './AvatarPickerModal.module.css';

const CHOICES = [1, 2, 3] as const;

interface Props {
  current: AvatarChoice;
  onApply: (choice: AvatarChoice) => Promise<void> | void;
  onClose: () => void;
}

export default function AvatarPickerModal({ current, onApply, onClose }: Props) {
  const t = useTranslations('profile');
  const [sel, setSel] = useState<AvatarChoice>(current);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className={styles.scrim} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={t('avatarModalTitle')}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.x}
          aria-label={t('avatarModalTitle')}
          onClick={onClose}
        >
          ×
        </button>
        <h3 className={styles.title}>{t('avatarModalTitle')}</h3>
        <p className={styles.sub}>{t('avatarModalSub')}</p>
        <div className={styles.chars} role="radiogroup">
          {CHOICES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={sel === c}
              className={`${styles.char} ${sel === c ? styles.charOn : ''}`}
              onClick={() => setSel(c)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/pics/avatar/${c}.webp?v=2`} alt="" />
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.apply}
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onApply(sel);
            } finally {
              setSaving(false);
              onClose();
            }
          }}
        >
          {t('avatarApply')}
        </button>
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: Styles (dark sticker modal; backdrop tint via opacity is allowed — it's state, not motion)**

`AvatarPickerModal.module.css`: `.scrim { position:fixed; inset:0; z-index:80; background:rgba(10,8,6,.62); backdrop-filter:blur(6px); display:grid; place-items:center }`, `.modal { width:min(440px,92vw); background:#1b1916; border:1px solid rgba(241,241,236,.16); border-radius:18px; padding:26px 24px 22px; text-align:center }`, `.title { font-family:var(--font-display); text-transform:uppercase; font-size:30px }`, `.chars { display:grid; grid-template-columns:repeat(3,1fr); gap:14px }`, `.char { aspect-ratio:1; border-radius:16px; border:1px solid rgba(241,241,236,.16); overflow:hidden }`, `.charOn { border-color:var(--et-red); box-shadow:0 0 0 3px var(--et-red) }`, `.apply { width:100%; font-family:var(--font-display); text-transform:uppercase; font-size:22px; padding:14px; border:0; border-radius:12px; background:var(--et-red); color:#fff }`. If the modal needs an entry motion, translate it up (`transform: translateY(12px)` → `0`), never fade.

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add app/components/profile/AvatarPickerModal.tsx app/components/profile/AvatarPickerModal.module.css
git commit -m "feat(profile): avatar picker as a separate modal layer"
```

## Task 2.5: ProfileAlbum (Panini album)

**Files:**

- Create: `app/components/profile/ProfileAlbum.tsx`
- Create: `app/components/profile/ProfileAlbum.module.css`

- [ ] **Step 1: Implement the album component**

```tsx
'use client';
import Image from 'next/image';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { normalizeName } from '@/lib/normalizeName';
import { buildAlbum } from '@/lib/profile/mustEatAlbum';
import type { MustEatPreview } from '@/lib/sanity.server';
import styles from './ProfileAlbum.module.css';

interface Props {
  mustEats: MustEatPreview[];
  faceUpIds: Set<string>;
}

const pad = (n: number) => String(n).padStart(3, '0');

export default function ProfileAlbum({ mustEats, faceUpIds }: Props) {
  const t = useTranslations('profile');
  const router = useRouter();
  const pages = useMemo(() => buildAlbum(mustEats, faceUpIds), [mustEats, faceUpIds]);
  const total = mustEats.length;
  const collected = pages.reduce((n, p) => n + p.slots.filter((s) => s.collected).length, 0);

  return (
    <section className={styles.wrap}>
      <header className={styles.head}>
        <h2 className={styles.h2}>{t('albumHeading')}</h2>
        <span className={styles.count}>{t('albumStuck', { collected, total })}</span>
      </header>
      {pages.map((page, pi) => (
        <div key={page.category} className={styles.album}>
          <p className={styles.pageHead}>
            {page.category} · {pi + 1} / {pages.length}
          </p>
          <div className={styles.grid}>
            {page.slots.map((slot) =>
              slot.collected && slot.mustEat ? (
                <button
                  key={slot.id}
                  type="button"
                  className={`${styles.slot} ${styles.filled}`}
                  onClick={() => router.push(`/map?me=${slot.id}`)}
                  aria-label={normalizeName(slot.mustEat.dish ?? '')}
                >
                  <span className={styles.no}>{pad(slot.no)}</span>
                  <span className={`${styles.corner} ${styles.tl}`} />
                  <span className={`${styles.corner} ${styles.tr}`} />
                  <span className={`${styles.corner} ${styles.bl}`} />
                  <span className={`${styles.corner} ${styles.br}`} />
                  <Image
                    src={slot.mustEat.image}
                    alt=""
                    fill
                    sizes="200px"
                    className={styles.img}
                  />
                </button>
              ) : (
                <div key={slot.id} className={`${styles.slot} ${styles.empty}`} aria-hidden="true">
                  <span className={styles.no}>{pad(slot.no)}</span>
                  <span className={styles.q}>?</span>
                </div>
              )
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 2: Styles — port the validated mockup**

`ProfileAlbum.module.css`: reproduce the validated Panini look (mockup `redesign-album`): `.album` cream ruled-paper card with inset top highlight + center binding pseudo-spine; `.grid { display:grid; grid-template-columns:repeat(5,1fr); gap:16px 18px }` (mobile `@media (max-width:520px) { repeat(3,1fr) }`); `.slot { aspect-ratio:5/7; border-radius:9px }`; `.empty` recessed dashed pocket (`inset box-shadow`, dashed border, faint `.no` top-left + big faint `.q`); `.filled` card via `<Image fill>` `object-fit:cover` + red `.no` badge + four `.corner` photo-mounts (tl/tr/bl/br). Dark-mode variants: keep the album cream in both themes (it's a "paper" surface) OR add `html[data-theme="dark"]` darker-paper variant — match `ProfileSlim` section background. Use `var(--font-display)` for headings.

- [ ] **Step 3: Verify visually**

Mount it temporarily in `ProfileShell` (Task 2.6) or render on `/profile` once wired. With the signed-in preview technique, screenshot `/profile`.
Expected: numbered slots, filled cards mounted with corners + red number, empty "?" pockets, grouped by category page.

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit`

```bash
git add app/components/profile/ProfileAlbum.tsx app/components/profile/ProfileAlbum.module.css
git commit -m "feat(profile): Panini sticker-album for collected Must-Eats"
```

## Task 2.6: ProfileShell — collector hero + wire album/modal

**Files:**

- Modify: `app/components/profile/ProfileShell.tsx`
- Modify: `app/components/profile/ProfileSlim.module.css`

- [ ] **Step 1: Replace the header + character section with the dark collector hero**

In `ProfileShell.tsx`:

- Import `resolveRank` (`@/lib/profile/collectorRank`), `ProfileAlbum`, `AvatarPickerModal`.
- Add `const [pickerOpen, setPickerOpen] = useState(false)`.
- Compute `const total = mustEats.length; const collected = discoveredCount; const rank = resolveRank(collected, total)`.
- Replace the existing `<header>` + `<section className={styles.character}>` with the dark hero:
  - avatar (`/pics/avatar/${avatarIdx}.webp`) in a tilted frame with a `styles.editBtn` (`onClick={() => setPickerOpen(true)}`, label `t('changeAvatar')`),
  - `member-since` kicker, `t('heroTitle')` or the user's first name as `name`,
  - progress: big `{collected}/{total}` + `t('revealedLabel')` + rank chip `t('levelChip', { level: rank.level, rank: t(\`ranks.${rank.key}\`) })`, progress bar (`width: ${total ? (collected/total)\*100 : 0}%`),
  - quick actions: existing `toMap` + `packsCta` links.
- Replace `<ProfileMustEats .../>` usage with `<ProfileAlbum mustEats={mustEats} faceUpIds={unlockedIds} />`.
- Keep `ProfileSpots` and `ProfilePacks` sections and the logout button.
- At the end, conditionally render the modal:

```tsx
{
  pickerOpen && (
    <AvatarPickerModal
      current={avatarIdx}
      onApply={handleAvatarChange}
      onClose={() => setPickerOpen(false)}
    />
  );
}
```

(`handleAvatarChange` already exists; it calls `setAvatar`. The old inline avatar picker + its state/`avatarSaving`/`avatarError` UI is removed — saving feedback now lives in the modal's `disabled` state.)

- [ ] **Step 2: Style the dark hero in `ProfileSlim.module.css`**

Add `.heroDark` (dark gradient: `radial-gradient(ellipse at 82% 30%, rgba(239,53,40,.26), transparent 40%), linear-gradient(135deg,#171A17,#211b17 58%,#2a1612)`), avatar frame (`transform:rotate(-4deg); border-radius:20px`), `.editBtn` (red pill on the avatar corner, `font-family:var(--font-display)`), `.progNum` (`font-family:var(--font-display); font-size:64px`, red numerator), `.rankChip` (red pill), `.bar`/`.barFill` (cream border, red fill), action buttons reusing existing `.quickAction` styling but on dark. Collection sections below stay on the existing cream `.page`. Remove the now-unused `.character`/`.avatarPicker`/`.avatarChoice` rules.

- [ ] **Step 3: Verify visually (signed-in preview) — both states**

Screenshot `/profile`: dark hero with single avatar + "Ändern", progress `n/total` + "Level X · Rang" + bar, then the cream Panini album, saved spots, packs, logout. Click "Ändern" → modal layer opens over a dimmed profile; pick an avatar → "Übernehmen" closes it and the hero avatar updates.
Expected: matches mockups `redesign-profile-hero` (closed) and `redesign-profile-v2` (modal open). Real `moonblossom` font renders.

- [ ] **Step 4: Typecheck + tests + commit**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. Delete or update `ProfileMustEats` if fully replaced; remove its import. Update any profile test that referenced the old header/picker.

```bash
git add app/components/profile/ProfileShell.tsx app/components/profile/ProfileSlim.module.css
git commit -m "feat(profile): collector hero (progress + rank) + album + avatar modal"
```

## Task 2.7: Remove dead code

**Files:**

- Delete (if now unused): `app/components/profile/ProfileMustEats.tsx` (+ its `.module.css`, test)

- [ ] **Step 1: Confirm no references**

Run: `grep -rn "ProfileMustEats" app lib` — expect no hits after Task 2.6.

- [ ] **Step 2: Delete + verify build**

Run: `git rm app/components/profile/ProfileMustEats.tsx` (and related files if present), then `npm test && npx tsc --noEmit`.
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(profile): remove superseded ProfileMustEats grid"
```

---

## Final verification (before pushing to staging)

- [ ] `npm test` — all green.
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm run build` — succeeds (mirrors the pre-push hook; do NOT run while `npm run dev` is alive — stop dev first).
- [ ] Visual pass on `:3000`: logged-out Home (Spot des Tages leads, unchanged); signed-in Home (launcher + reordered modules); `/profile` (collector hero, Panini album, avatar modal) — light AND dark theme, desktop AND mobile.
- [ ] Push: `git push origin staging` (pre-push build hook runs; staging auto-deploys). Confirm on the staging URL.

## Notes / open points carried from the spec

- Final rank names are working titles (§9) — confirm copy before launch; they live only in `lib/i18n/translations.ts`.
- Album category = restaurant primary category (`buildAlbum`'s `categoryOf`). Curated chapter grouping is a later refinement, not in this plan.
