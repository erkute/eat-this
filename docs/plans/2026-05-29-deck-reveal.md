# Deck-Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a freshly-signed-in user an active reveal path in the profile deck — Sanity-flagged teaser cards idle-shake, and tapping one flips it and permanently unlocks the must-eat (on the deck *and* on the map).

**Architecture:** Purely client-side in the profile deck — no `/api/map-data` change. The album query gains two fields (`revealedForAnon`, `restaurantId`); `ProfileDeck` resolves each grid slot into one of three states (revealed → existing `FlipSlot`; teaser → new `TeaserSlot` that flips + calls `unlock()`; locked → static `BackSlot`). `unlock()` writes to `users/{uid}/unlockedMustEats/*`, the same collection the map snapshots, so a deck reveal surfaces on the map automatically.

**Tech Stack:** Next.js (App Router) + TypeScript, React client components, framer-motion, CSS Modules, Sanity GROQ, Firebase Firestore, Vitest.

**Epic:** GitHub issue #18. Branch: `feat/deck-reveal` (base `staging`). Spec: `docs/specs/2026-05-29-deck-reveal-design.md`.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `nextjs/lib/queries.ts` | GROQ projections | Add `revealedForAnon` + `restaurantId` to `allMustEatsAlbumQuery` |
| `nextjs/lib/types.ts` | Shared types | Add two optional fields to `MustEatAlbumCard` |
| `nextjs/lib/profile/teasers.ts` | Pure teaser-selection helper | **Create** `selectTeaserOrders` |
| `nextjs/lib/profile/__tests__/teasers.test.ts` | Helper unit tests | **Create** |
| `nextjs/app/components/profile/ProfileShell.tsx` | Profile data + tab host | Pass `unlock` down to the deck |
| `nextjs/app/components/profile/ProfileDeck.tsx` | Deck grid + slot states | 3-state slot resolution, `TeaserSlot`, first-visit hint, drop BackSlot on-click shake |
| `nextjs/app/components/profile/ProfileDeck.module.css` | Deck styles | idle-shake keyframes, teaser style, hint caption; remove dead one-shot shake |

> CSS lives in a **CSS Module** (`ProfileDeck.module.css`), compiled by Next — NOT the `nextjs/css/` → `public/css` pipeline. No `npm run build:css` and no `?v=NN` cache-bump are needed for this work.

---

## Task 1: Data layer — query + type

**Files:**
- Modify: `nextjs/lib/queries.ts:361-372`
- Modify: `nextjs/lib/types.ts:98-107`

- [ ] **Step 1: Extend the album query projection**

In `nextjs/lib/queries.ts`, replace the `allMustEatsAlbumQuery` definition with:

```ts
// Must Eat album grid — matches legacy window.CMS.fetchMustEats projection,
// plus the teaser fields the profile deck needs to make cards revealable.
export const allMustEatsAlbumQuery = `
  *[_type == "mustEat"] | order(order asc) {
    _id,
    dish,
    restaurant,
    district,
    price,
    "imageUrl": image.asset->url + "?w=600&auto=format&q=80",
    "restaurantSlug": restaurantRef->slug.current,
    "restaurantId": restaurantRef->_id,
    revealedForAnon,
    order
  }
`
```

- [ ] **Step 2: Extend the `MustEatAlbumCard` type**

In `nextjs/lib/types.ts`, replace the `MustEatAlbumCard` interface with:

```ts
export interface MustEatAlbumCard {
  _id: string
  dish: string
  restaurant: string
  district?: string
  price?: string
  imageUrl: string
  restaurantSlug?: string
  restaurantId?: string
  revealedForAnon?: boolean
  order?: number
}
```

- [ ] **Step 3: Typecheck**

Run: `cd nextjs && npx tsc --noEmit`
Expected: no new errors (the new fields are optional; existing consumers compile unchanged).

- [ ] **Step 4: Commit**

```bash
git add nextjs/lib/queries.ts nextjs/lib/types.ts
git commit -m "feat(deck-reveal): album query + type carry revealedForAnon + restaurantId

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `selectTeaserOrders` pure helper (TDD)

**Files:**
- Create: `nextjs/lib/profile/teasers.ts`
- Test: `nextjs/lib/profile/__tests__/teasers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `nextjs/lib/profile/__tests__/teasers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { selectTeaserOrders } from '@/lib/profile/teasers'
import type { MustEatAlbumCard } from '@/lib/types'

function mk(id: string, opts: Partial<MustEatAlbumCard> = {}): MustEatAlbumCard {
  return {
    _id: id,
    dish: `Dish ${id}`,
    restaurant: `R ${id}`,
    imageUrl: `/img/${id}.webp`,
    ...opts,
  }
}

describe('selectTeaserOrders', () => {
  it('includes flagged cards with restaurantId + order that are not unlocked', () => {
    const cards = [
      mk('a', { revealedForAnon: true, restaurantId: 'r1', order: 1 }),
      mk('b', { revealedForAnon: true, restaurantId: 'r2', order: 2 }),
    ]
    expect(selectTeaserOrders(cards, new Set())).toEqual(new Set([1, 2]))
  })

  it('excludes cards not flagged revealedForAnon', () => {
    const cards = [mk('a', { revealedForAnon: false, restaurantId: 'r1', order: 1 })]
    expect(selectTeaserOrders(cards, new Set())).toEqual(new Set())
  })

  it('excludes flagged cards without a restaurantId', () => {
    const cards = [mk('a', { revealedForAnon: true, order: 1 })]
    expect(selectTeaserOrders(cards, new Set())).toEqual(new Set())
  })

  it('excludes flagged cards without a numeric order', () => {
    const cards = [mk('a', { revealedForAnon: true, restaurantId: 'r1' })]
    expect(selectTeaserOrders(cards, new Set())).toEqual(new Set())
  })

  it('excludes already-unlocked cards', () => {
    const cards = [mk('a', { revealedForAnon: true, restaurantId: 'r1', order: 1 })]
    expect(selectTeaserOrders(cards, new Set(['a']))).toEqual(new Set())
  })

  it('returns an empty set for empty input', () => {
    expect(selectTeaserOrders([], new Set())).toEqual(new Set())
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd nextjs && npx vitest run lib/profile/__tests__/teasers.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/profile/teasers"` (module not created yet).

- [ ] **Step 3: Write the minimal implementation**

Create `nextjs/lib/profile/teasers.ts`:

```ts
import type { MustEatAlbumCard } from '@/lib/types'

/**
 * Orders of the deck slots that should render as tappable "teaser" cards.
 * A teaser is a Sanity-flagged `revealedForAnon` must-eat that has a resolved
 * `restaurantId` (required by `unlock()`), a numeric `order` (its grid slot),
 * and is not already in the user's unlocked set.
 *
 * Mirrors the map's `composeRevealedMustEats` trust in the `revealedForAnon`
 * flag — no hard cap here; Sanity curation is the source of truth.
 */
export function selectTeaserOrders(
  mustEats: MustEatAlbumCard[],
  unlockedIds: Set<string>,
): Set<number> {
  const orders = new Set<number>()
  for (const m of mustEats) {
    if (!m.revealedForAnon) continue
    if (!m.restaurantId) continue
    if (typeof m.order !== 'number') continue
    if (unlockedIds.has(m._id)) continue
    orders.add(m.order)
  }
  return orders
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd nextjs && npx vitest run lib/profile/__tests__/teasers.test.ts`
Expected: PASS — 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add nextjs/lib/profile/teasers.ts nextjs/lib/profile/__tests__/teasers.test.ts
git commit -m "feat(deck-reveal): selectTeaserOrders pure helper + tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: ProfileShell — pass `unlock` into the deck

**Files:**
- Modify: `nextjs/app/components/profile/ProfileShell.tsx:25,57-62`

- [ ] **Step 1: Destructure `unlock` from the hook**

In `nextjs/app/components/profile/ProfileShell.tsx`, change line 25 from:

```tsx
  const { unlockedIds: mapUnlockedIds } = useUnlockedMustEats(user?.uid ?? null);
```

to:

```tsx
  const { unlockedIds: mapUnlockedIds, unlock } = useUnlockedMustEats(user?.uid ?? null);
```

- [ ] **Step 2: Pass `unlock` to `ProfileDeck`**

In the same file, change the deck render (lines 57-62) from:

```tsx
        {tab === 'deck' && (
          <ProfileDeck
            mustEats={mustEats}
            mapUnlockedIds={mapUnlockedIds}
          />
        )}
```

to:

```tsx
        {tab === 'deck' && (
          <ProfileDeck
            mustEats={mustEats}
            mapUnlockedIds={mapUnlockedIds}
            unlock={unlock}
          />
        )}
```

(`unlock` is a no-op when uid is null, but the deck only renders when `user` is truthy — the `if (loading || !user)` guard above returns the placeholder otherwise.)

- [ ] **Step 3: Typecheck (will fail until Task 4 adds the prop)**

Run: `cd nextjs && npx tsc --noEmit`
Expected: FAIL — `ProfileDeck` does not yet accept an `unlock` prop. This is resolved in Task 4. Do **not** commit yet; proceed to Task 4 and commit them together.

---

## Task 4: ProfileDeck — three slot states + TeaserSlot

**Files:**
- Modify: `nextjs/app/components/profile/ProfileDeck.tsx`

This task replaces the two-state slot resolution with three states, adds the `TeaserSlot` component, and removes the now-dead on-click shake from `BackSlot`. The first-visit hint is added in Task 5; the CSS classes referenced here (`slotTeaser`, `slotIdleShake`) are added in Task 6.

- [ ] **Step 1: Import the helper and the type**

At the top of `nextjs/app/components/profile/ProfileDeck.tsx`, add to the imports (the `MustEatAlbumCard` type import already exists on line 11):

```tsx
import { selectTeaserOrders } from '@/lib/profile/teasers';
```

- [ ] **Step 2: Extend `Props` with `unlock`**

Replace the `Props` interface (lines 19-22):

```tsx
interface Props {
  mustEats:       MustEatAlbumCard[];
  mapUnlockedIds: Set<string>;
  unlock:         (mustEatId: string, restaurantId: string, dish: string) => Promise<void>;
}
```

And update the component signature (line 30):

```tsx
export default function ProfileDeck({ mustEats, mapUnlockedIds, unlock }: Props) {
```

- [ ] **Step 3: Add a full `cardByOrder` map + the teaser set + reveal handler**

Immediately after the existing `mapUnlockedByOrder` `useMemo` block (ends line 40), add:

```tsx
  // Every card keyed by its grid slot — superset of mapUnlockedByOrder, used
  // to render teaser slots (which are NOT yet unlocked) at their slot.
  const cardByOrder = useMemo(() => {
    const map = new Map<number, MustEatAlbumCard>();
    for (const c of mustEats) {
      if (typeof c.order === 'number') map.set(c.order, c);
    }
    return map;
  }, [mustEats]);

  // Slot orders that should render as tappable teaser cards.
  const teaserOrders = useMemo(
    () => selectTeaserOrders(mustEats, mapUnlockedIds),
    [mustEats, mapUnlockedIds],
  );
```

- [ ] **Step 4: Add the reveal handler**

After the `closeExpanded` `useCallback` (ends line 73), add:

```tsx
  // Teaser tap → persist the unlock. The hook updates mapUnlockedIds, which
  // recomputes mapUnlockedByOrder, and the effect above promotes the order
  // into `revealed` — so the slot re-renders as a face-up FlipSlot. We let
  // the promise reject on failure so the TeaserSlot can roll its flip back.
  const handleReveal = useCallback(async (card: MustEatAlbumCard) => {
    if (!card.restaurantId) return;
    await unlock(card._id, card.restaurantId, card.dish);
  }, [unlock]);
```

- [ ] **Step 5: Update the slot-render loop to three states**

Replace the grid render loop (lines 91-112) with:

```tsx
        {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
          const order = i + 1;
          const card  = cardByOrder.get(order);
          const isRevealed = revealed.has(order);

          if (card && isRevealed) {
            return (
              <FlipSlot
                key={order}
                order={order}
                card={card}
                flipped={isRevealed}
                hideCardFace={hiddenSlotOrder === order}
                onExpand={(rect) => {
                  setHiddenSlotOrder(order);
                  setExpanded({ card, rect, order });
                }}
              />
            );
          }
          if (card && teaserOrders.has(order)) {
            return (
              <TeaserSlot
                key={order}
                order={order}
                card={card}
                onReveal={handleReveal}
              />
            );
          }
          return <BackSlot key={order} />;
        })}
```

- [ ] **Step 6: Add the `TeaserSlot` component**

Add this component just above the existing `BackSlot` function (before line 345):

```tsx
interface TeaserSlotProps {
  order:    number;
  card:     MustEatAlbumCard;
  onReveal: (card: MustEatAlbumCard) => Promise<void>;
}

// Sanity-flagged teaser: idle-shakes to invite a tap, then flips face-up and
// persists the unlock. On reveal success the parent re-renders this slot as a
// FlipSlot (already flipped, same image — seamless). On failure we flip back.
function TeaserSlot({ order, card, onReveal }: TeaserSlotProps) {
  const [flipped, setFlipped] = useState(false);
  const [busy,    setBusy]    = useState(false);

  const reveal = async () => {
    if (busy || flipped) return;
    setBusy(true);
    setFlipped(true);            // optimistic flip
    try {
      await onReveal(card);
    } catch {
      setFlipped(false);         // rollback — unlock failed
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`${styles.slot} ${styles.slotTeaser}${flipped ? '' : ` ${styles.slotIdleShake}`}`}
      data-order={order}
      role="button"
      tabIndex={0}
      aria-label={`Karte aufdecken: ${card.dish}`}
      onClick={reveal}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reveal(); }
      }}
    >
      <motion.div
        className={styles.flipper}
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: FLIP_DURATION_S, ease: [0.4, 0.0, 0.2, 1] }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pics/card-back.webp"
          alt=""
          className={`${styles.face} ${styles.faceBack}`}
          loading="lazy"
          aria-hidden="true"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.imageUrl}
          alt={card.dish}
          className={`${styles.face} ${styles.faceFront}`}
          loading="lazy"
        />
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 7: Replace `BackSlot` — remove the on-click shake**

Replace the entire `BackSlot` function (lines 345-368) with a static, non-interactive slot:

```tsx
function BackSlot() {
  return (
    <div className={`${styles.slot} ${styles.slotBack}`}>
      <div className={styles.flipper}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pics/card-back.webp"
          alt=""
          className={`${styles.face} ${styles.faceBack}`}
          loading="lazy"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
```

(`useState` is still imported and used elsewhere in the file — no import change needed.)

- [ ] **Step 8: Typecheck**

Run: `cd nextjs && npx tsc --noEmit`
Expected: PASS — no errors (Task 3's `unlock` prop is now satisfied).

- [ ] **Step 9: Commit Tasks 3 + 4 together**

```bash
git add nextjs/app/components/profile/ProfileShell.tsx nextjs/app/components/profile/ProfileDeck.tsx
git commit -m "feat(deck-reveal): teaser slots flip + unlock in the profile deck

Three slot states: revealed (FlipSlot), teaser (idle-shake → flip → unlock),
locked (static BackSlot). BackSlot no longer shakes on click. Reveals write to
unlockedMustEats so they surface on the map too.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: First-visit hint

**Files:**
- Modify: `nextjs/app/components/profile/ProfileDeck.tsx`

- [ ] **Step 1: Add hint visibility state + first-visit effect**

After the `teaserOrders` `useMemo` (added in Task 4 Step 3), add:

```tsx
  // Subtle one-time hint inviting the first tap. Shows only on the first visit
  // that has teaser slots, then persists a localStorage flag so it never shows
  // again. Also hidden the moment the user reveals their first card.
  const [hintVisible, setHintVisible] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('deckRevealHintSeen') === '1') return;
    if (teaserOrders.size === 0) return;
    setHintVisible(true);
    localStorage.setItem('deckRevealHintSeen', '1');
  }, [teaserOrders]);
```

- [ ] **Step 2: Hide the hint on first reveal**

Update the `handleReveal` callback (added in Task 4 Step 4) to dismiss the hint after a successful unlock:

```tsx
  const handleReveal = useCallback(async (card: MustEatAlbumCard) => {
    if (!card.restaurantId) return;
    await unlock(card._id, card.restaurantId, card.dish);
    setHintVisible(false);
  }, [unlock]);
```

- [ ] **Step 3: Render the hint between the header and the grid**

In the JSX, between `<ProfileDeckHeader ... />` (line 88) and `<div className={styles.albumGrid}>` (line 90), add:

```tsx
      {hintVisible && (
        <motion.p
          className={styles.revealHint}
          initial={{ y: -10 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          Tipp die wackelnden Karten an.
        </motion.p>
      )}
```

(Translate-in only — no opacity fade, per the brand rule. Copy is qualitative, no counts.)

- [ ] **Step 4: Typecheck**

Run: `cd nextjs && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add nextjs/app/components/profile/ProfileDeck.tsx
git commit -m "feat(deck-reveal): subtle one-time first-visit hint (translate-in)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: CSS — idle-shake, teaser style, hint caption

**Files:**
- Modify: `nextjs/app/components/profile/ProfileDeck.module.css`

- [ ] **Step 1: Replace the dead one-shot shake with an idle (looping) shake**

In `ProfileDeck.module.css`, the old `@keyframes slotShake` + `.slotShake` (lines 68-79) were only used by the now-static `BackSlot`. Replace that block (lines 57-79, from the `.slotBack` comment through `.slotShake`) with:

```css
/* Locked back slots are inert — not tappable, no shake. */
.slotBack {
  cursor: default;
}

/* Teaser slots invite a tap. */
.slotTeaser {
  cursor: pointer;
}

/* Idle-shake: a brief subtle wobble every few seconds (most of the cycle is
 * still) to invite a tap without nagging. Lives on .slot (not .flipper) so it
 * never conflicts with the flipper's rotateY flip animation. */
@keyframes idleShake {
  0%, 86%, 100% { transform: translate(0, 0) rotate(0deg); }
  88%            { transform: translate(-2px, 0) rotate(-1.2deg); }
  91%            { transform: translate(2px, 0) rotate(1.2deg); }
  94%            { transform: translate(-1.5px, 0) rotate(-0.8deg); }
  97%            { transform: translate(1px, 0) rotate(0.5deg); }
}

.slotIdleShake {
  animation: idleShake 3.4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .slotIdleShake { animation: none; }
}
```

- [ ] **Step 2: Add the hint caption style**

After the `.slotIdleShake` block, add:

```css
/* First-visit reveal hint — quiet inline caption near the deck header. */
.revealHint {
  margin: 2px 8px 12px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: rgba(10, 10, 10, 0.55);
}

```

- [ ] **Step 3: Verify no other reference to the removed `slotShake` class remains**

Run: `cd nextjs && grep -rn "slotShake" app/ lib/`
Expected: no matches (the only user was `BackSlot`, replaced in Task 4 Step 7).

- [ ] **Step 4: Commit**

```bash
git add nextjs/app/components/profile/ProfileDeck.module.css
git commit -m "feat(deck-reveal): idle-shake keyframes, teaser + hint styles

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Verification

**Files:** none (verification only)

- [ ] **Step 1: Full unit suite**

Run: `cd nextjs && npm run test`
Expected: all suites green, including the 6 new `selectTeaserOrders` cases.

- [ ] **Step 2: Lint**

Run: `cd nextjs && npm run lint`
Expected: no new errors/warnings in `ProfileDeck.tsx`, `ProfileShell.tsx`, `teasers.ts`.

- [ ] **Step 3: Typecheck**

Run: `cd nextjs && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Manual visual smoke (dev server already running — the user starts it; do NOT run `npm run dev`)**

Use Playwright-MCP (or the user's open browser) against `/profile` as a signed-in user with at least one `revealedForAnon` must-eat. Verify, in **light and dark**:
- Teaser slots idle-shake (brief wobble every ~3.4s); locked slots do **not** shake and are not tappable.
- Tapping a teaser flips it face-up; after the flip it stays revealed (becomes a FlipSlot — tapping again opens the lightbox).
- Navigate to the map → the just-revealed must-eat is unlocked there too.
- First-visit hint slides in (translate, no fade) near the header on first load with teasers, and is gone after the first reveal; reloading the page does not show it again (`localStorage.deckRevealHintSeen === '1'`).
- Reduced-motion: with OS "reduce motion" on, teasers do not idle-shake.

- [ ] **Step 5: Push (triggers the pre-push full build — do NOT bypass)**

```bash
git push -u origin feat/deck-reveal
```

Expected: pre-push `npm run build` passes; branch pushed. Then open a PR into `staging` with body `Closes #18`.

---

## Self-Review Notes

- **Spec coverage:** §5.1 → Task 1; §5.3 teaser-helper → Task 2; §5.2 → Task 3; §5.3 slot states / TeaserSlot / BackSlot shake removal → Task 4; §5.4 hint → Tasks 5–6; §6 CSS → Task 6; §7 testing → Tasks 2 & 7. All covered.
- **Type consistency:** `selectTeaserOrders(mustEats, unlockedIds): Set<number>` defined in Task 2 and called identically in Task 4. `unlock(mustEatId, restaurantId, dish): Promise<void>` matches the hook signature (`useUnlockedMustEats.ts:8`) and the `Props` type. `handleReveal(card)` signature matches `TeaserSlot`'s `onReveal` prop.
- **No placeholders:** every code step shows full content; line numbers reference the pre-change file.
