# Hearts (loved-by-N count) — Design

**Date:** 2026-06-09
**Epic:** [Roadmap → Hearts](../product/roadmap.md#hearts-loved-by-n-count)
**Decision (with user):** **Merge with favorites.** A heart *is* a saved spot.
There is no second private-bookmark concept — the existing "save to my map"
(`users/{uid}/favorites`) is the heart, and its aggregate is the public count.

---

## Goal

Show **"geherzt von N Leuten" / "loved by N people"** on the restaurant
detail surfaces, and let a logged-in user heart a spot from the SEO restaurant
page too (today hearting only exists in the map detail sheet).

- Only logged-in users can heart (anon → login). *No* anonymous hearts — too
  easy to spam, no per-user state. (Roadmap open question, resolved.)
- The count surfaces on: the **map detail sheet** and the **SEO restaurant
  page** (`/restaurant/[slug]`). Map *list rows* stay countless for v1.
- No ratings, no dislike, no comments — positive signal only.

## Data model

Reuse the existing per-user collection; add one denormalised public counter.

```
users/{uid}/favorites/{restaurantId}     ← unchanged. The heart. (Sanity _id key)
restaurants/{restaurantId}               ← NEW public doc
  heartCount: number                     ← maintained server-side only
  heartCountUpdatedAt: timestamp
```

`restaurantId` is the **Sanity `_id`** (same key favorites already use), so the
counter lines up with `MapRestaurant._id` and the SEO page's `r._id`.

Restaurants themselves live in **Sanity**, not Firestore — so the counter
cannot ride on the restaurant doc. The `restaurants/{id}` Firestore doc holds
*only* the aggregate, nothing editorial.

## Counter maintenance (`/api/heart`)

> **Architecture update (2026-06-14).** The original design maintained the
> counter with two gen-2 Firestore triggers in `functions/index.js`. The whole
> `functions/` Cloud Functions layer was removed in the clean-architecture
> reset on `staging`, and server work now lives in Next.js API routes backed by
> the Admin SDK (e.g. `/api/must-eat-reveal`, `/api/referral/confirm`). Hearts
> follows that pattern.

`POST /api/heart` (`app/api/heart/route.ts`) is the **single writer** of both
the per-user heart and the public counter. It verifies the Firebase ID token
(`Bearer`, like the other routes), light per-uid rate-limits via
`checkRateLimit('heart:{uid}')`, then runs **one Firestore transaction**:

- `action: 'add'` — if `users/{uid}/favorites/{restaurantId}` doesn't exist:
  create it **and** `restaurants/{restaurantId}.heartCount += 1`. If it already
  exists: no-op (idempotent).
- `action: 'remove'` — if it exists: delete it **and** `heartCount -= 1`. If
  not: no-op.

Both writes share the transaction, gated on the favorite's existence, so the
count tracks exactly the distinct (user, restaurant) hearts: **one account
contributes at most +1**, and a retried/duplicate toggle can't drift the
counter. Uses `FieldValue.increment(±1)` (atomic). Display still clamps at
`Math.max(0, count)` so a legacy favorite removed without a matching prior
increment (internal-test data) can never surface a negative.

## Security rules

`firestore.rules` — public read, **no** client write (counter is server-only):

```
match /restaurants/{restaurantId} {
  allow read: if true;
  allow write: if false;
}
```

The per-user `users/{uid}/favorites/**` rule is already correct (owner-only
read/write) and stays untouched.

## Client

> **UI update (2026-06-15).** The public count is shown as a **frosted-glass
> badge in the corner of the hero photo** (Airbnb "Guest favorite" placement),
> not as a caption under the action buttons — researched against how venue apps
> surface social proof (Maps/Yelp near the title, Airbnb on the photo). The
> count is **live** (onSnapshot), and it's kept **separate** from the personal
> save/heart toggle.

- `lib/map/useHeartCount.ts` — subscribes to `restaurants/{id}.heartCount` with
  `onSnapshot` (live; updates everywhere the moment `/api/heart` lands). Public
  doc, so it works for anon visitors too. SDK is code-split (dynamic import).
- `lib/map/heartLabel.ts` — pure, unit-tested: `heartLabel(count, locale)` (full
  phrase for the accessible label, `null` below 1) and `heartCountShort(count,
  locale)` (compact `142` / `1,2k` shown in the badge).
- `app/components/HeartCount.tsx` — the read-only **glass badge** (`♥ 142`).
  Rendered in the hero of **both** the map detail sheet (`.rdHeartBadge`) and the
  SEO restaurant page (`.heroHeartBadge`); the host positions it via `className`.
  Renders nothing below 1 (no "geherzt von 0").
- `app/components/HeartButton.tsx` — the personal **heart toggle** on the SEO
  page (no count — that's the badge's job). Wires `useAuth` →
  `useFavorites().toggle`. Anon tap → `/login`.
- `icons.tsx` — `HeartIcon` (outline → filled). The map detail save toggle uses
  it so the icon matches the "geherzt" wording.

## Deployment notes

- **No Cloud Functions.** The counter is an API route bundled with the Next.js
  app, so it ships automatically with the normal App Hosting deploy on push to
  `main` — nothing extra to deploy for the server side.
- **Firestore rules must be deployed manually** (there's no rules deploy
  workflow): `firebase deploy --only firestore:rules --project eat-this-8a13b`.
  This ships the new public-read `restaurants/{id}` rule. Until it's live the
  client read of the public counter is denied (the count just shows nothing);
  hearting itself still works. So: **deploy rules before/with the merge to
  main.**
- **Env (optional):** `HEART_LIMIT_PER_MIN` (default 30) and
  `HEART_LIMIT_PER_DAY` (default 300) tune the per-uid rate limit. Defaults are
  generous enough that no config is required.

## Out of scope / follow-ups

- **Backfill:** existing favorites (internal testing) aren't counted until
  re-toggled — the counter only moves on a write through `/api/heart`.
  Near-zero users, so we skip a backfill script for now. If a real count is
  wanted later: one-off Admin SDK pass aggregating `users/*/favorites`.
- **Buddy chat card & profile** still show the bookmark icon / "save to my map"
  wording for the same underlying action. Left as-is for v1 to keep the change
  on the detail surfaces; unify the icon+copy in a follow-up if we want one
  visual language everywhere.
- **Map list rows** count badge — deferred.
