# Plan 4 — Referrals (Design Spec)

**Date:** 2026-05-28
**Status:** Design approved, pre-implementation
**Migration context:** This is Plan 4 of the staging+migration breakdown
(`docs/specs/2026-05-27-staging-and-migration-design.md` §5). Plans 1–3 are
live in prod. The tier model (anon 20 / signed +20 / booster / all-berlin)
is in place; referral bonuses *stack* on top of a user's visible set.

---

## 1. Goal

Unlimited referrals. When a friend signs up through an inviter's share link,
**both** the inviter and the friend gain a persisted bonus of additional map
spots (random-but-stable picks they didn't already have). The bonus is written
once, is immutable, and stacks with every tier the user already qualifies for.

Qualitative framing only in all UI copy — **never** name concrete spot counts
(see `feedback_no_spot_counts`). Internally the bonus size is a constant.

---

## 2. Architecture Overview

```
Share link click  →  middleware strips ?ref, sets HttpOnly cookie
       │
   (anon browses, eventually signs up — Google OAuth or Magic-Link)
       │
   authed app load  →  ReferralToastListener fires POST /api/referral/confirm
       │                       (cookie travels automatically, same-origin)
       ▼
/api/referral/confirm  (Admin SDK)
   ├─ validate (new-account gate, self-referral, idempotency, inviter exists)
   ├─ compute pools from Sanity catalog
   ├─ write inviter bonus doc (source: 'invited')      ── unless pool empty
   ├─ write friend  bonus doc (source: 'invited-by')
   └─ clear cookie (definitive outcomes) / keep cookie (transient failure)
       │
   ┌───┴─────────────────────────────────────────────┐
   ▼                                                   ▼
MapSection 2nd onSnapshot(referralBonuses)      ReferralToastListener onSnapshot
   → refetch /api/map-data → more spots unlock     → toast on NEW 'invited' doc
```

### Trigger location (decided)

`confirm` is **not** called from `app/welcome/page.tsx`. It is orchestrated
from a single app-mounted component, `ReferralToastListener`, which fires the
POST once per authed app load. This:

- covers both Google-OAuth and Magic-Link signups (both end up authed in-app)
- gives a **real retry** path for transient failures — every authed load
  re-attempts until the cookie is consumed
- keeps confirm-orchestration and toast-listening in one place

The client cannot read the HttpOnly cookie, so it fires `confirm`
unconditionally on authed load. With no `pending_referrer` cookie the endpoint
returns 200 immediately **without touching Firestore or Sanity** — a cheap
no-op. Work only happens when the cookie is present; after a definitive
outcome the cookie is cleared, so subsequent loads are no-ops. A
`sessionStorage` guard prevents re-firing on hard reloads within one session.

---

## 3. Data Model

### Cookie

- Name: `pending_referrer`
- `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age` = 30 days
- Value: the inviter's Firebase uid (validated against a shape regex)

### Bonus document

Path: `users/{uid}/referralBonuses/{autoId}`

```ts
{
  restaurantIds: string[],          // the sampled bonus picks
  source: 'invited' | 'invited-by', // 'invited' = inviter; 'invited-by' = friend
  partnerUid: string,               // the other party's uid
  createdAt: serverTimestamp,
}
```

Immutable once written.

- **Inviter** doc: `source: 'invited'` (they invited someone) → triggers toast
- **Friend** doc: `source: 'invited-by'` (they were invited) → no toast; their
  extra spots simply appear on the map via the MapSection refetch

### Share link

- Domain: `www.eatthisdot.com` (direct www, **not** apex — avoids the
  apex→www 308 in middleware on click)
- Form: `https://www.eatthisdot.com/?ref=<inviterUid>`

---

## 4. Components & Files

```
nextjs/
  middleware.ts                                   (extend — ?ref strip 308 + cookie set)
  app/api/referral/confirm/route.ts               (NEW)
  app/components/ReferralToastListener.tsx         (NEW — orchestrates confirm + toast)
  app/[locale]/layout.tsx                          (extend — mount ReferralToastListener)
  app/components/MapSection.tsx                    (extend — 2nd onSnapshot on referralBonuses)
  app/components/profile/ProfileReferralCard.tsx   (NEW — share UI, top of deck tab)
  app/components/profile/ProfileDeck.tsx           (extend — render card above FlipSlot grid)
  lib/referral/constants.ts                        (NEW — cookie name, bonus size, max-age, regex)
  lib/referral/pools.ts                            (NEW — computeReferralPools, sampleN)
  lib/referral/__tests__/pools.test.ts             (NEW)
  lib/firebase/entitlements.ts                     (extend — bonuses union + read referralBonuses)
  lib/firebase/useReferralBonuses.ts               (NEW — client hook, optional for card state)
  __tests__/lib/firebase/entitlements.test.ts      (extend — bonus union case)
  __tests__/app/api/referral-confirm.test.ts       (NEW — full edge-case table)
  __tests__/middleware.test.ts                     (extend — ?ref strip + cookie + garbage reject)
```

### Component responsibilities

- **`middleware.ts`** — on any request with `?ref=<value>`: if value matches
  `/^[a-zA-Z0-9]{20,40}$/`, issue a 308 redirect to the same URL with `ref`
  stripped and set the `pending_referrer` cookie (pattern mirrors the existing
  `?lang=` handling). Garbage `ref` → no cookie, but still strip the param.

- **`lib/referral/constants.ts`** — `REFERRER_COOKIE = 'pending_referrer'`,
  `REFERRAL_BONUS_SIZE` (the constant N), `COOKIE_MAX_AGE` (30d in seconds),
  `UID_SHAPE = /^[a-zA-Z0-9]{20,40}$/`.

- **`lib/referral/pools.ts`** — pure, fully unit-tested:
  - `computeReferralPools({ all, anonSet, signedSet, inviterEntitledIds })`
    → `{ inviterPool, friendPool }`
    - `inviterPool = all \ (anonSet ∪ signedSet ∪ inviterEntitledIds)`
    - `friendPool  = all \ (anonSet ∪ signedSet)`
  - `sampleN(pool, n)` — Fisher-Yates partial shuffle via `Math.random()`,
    returns ≤ n unique ids, `[]` for an empty pool.

- **`app/api/referral/confirm/route.ts`** — POST, body `{ idToken }`, Admin SDK.
  Returns **200 in all cases** (silent-fail design; signin must never break).
  Reads `pending_referrer` from the request cookie. See §5 for the full
  decision table. On every *definitive* outcome it clears the cookie via the
  response; only a transient infra failure leaves it set.

- **`ReferralToastListener.tsx`** — mounted in the locale layout. On authed
  mount (and not already fired this session), POSTs `{ idToken }` to confirm.
  Separately holds an `onSnapshot` on the user's `referralBonuses` collection;
  an initial-load guard marks all existing docs as "seen" so historical
  bonuses don't toast. Only a newly-arriving `source: 'invited'` doc triggers
  `window.showNotification(...)` (qualitative copy).

- **`MapSection.tsx`** — add a second `onSnapshot` on `referralBonuses`
  alongside the existing `entitlements` snapshot; on change, refetch
  `/api/map-data` so newly granted spots unlock without a reload.

- **`entitlements.ts`** — `resolveEntitlements` reads **both** the
  `entitlements` and `referralBonuses` subcollections in parallel
  (`Promise.all`). `reduceEntitlements(docs, bonuses = [])` unions each bonus
  doc's `restaurantIds` into `out.restaurantIds`. **Foundation confirmed:** as
  of `d95ef65` (PR #10) `reduceEntitlements` already unions each entitlement
  doc's `restaurantIds` + `mustEatIds` into the resolved sets, and
  `/api/map-data` honors id-based entitlements. Plan 4 therefore just extends
  this live path: add the `bonuses` parameter and read the `referralBonuses`
  subcollection — no separate reconciliation needed.

- **`ProfileReferralCard.tsx`** — rendered at the **top** of the existing
  `deck` tab (no 5th tab). Builds and shares the `www.eatthisdot.com/?ref=<uid>`
  link. Qualitative copy only.

---

## 5. Edge Cases & Outcome Table

The cookie is **cleared** on every *definitive* outcome and **kept** only on a
*transient* failure (so the next authed load retries).

| Situation | Behavior | Cookie |
|---|---|---|
| Success (both bonus docs written) | 200, inviter toast fires via snapshot | clear |
| Self-referral (`inviterUid === friendUid` **or** emails match, case-insensitive) | 200, no-op | clear |
| Not a new account (friend `creationTime` outside freshness window) | 200, no-op | clear |
| Idempotent repeat (friend already has an `invited-by` doc) | 200, no-op | clear |
| Inviter deleted (`getUser` throws not-found) | caught → 200, no-op | clear |
| All-Berlin inviter (inviter pool empty) | write friend doc only; skip inviter doc (no "+0" toast) | clear |
| Sanity / infra outage (`Promise.all` rejects) | caught → Sentry log → 200, no-op | **keep** |
| No cookie present | 200 immediately, no Firestore/Sanity hit | — |

### New-account gate

Decided: only genuine new accounts earn the inviter a reward. `confirm` reads
the friend's `creationTime` via the Admin SDK; the bonus is granted only if the
account was created within a short freshness window (proposed: 10 minutes) of
the confirm call. Genuine signups (Google OAuth or Magic-Link first sign-in)
create the account at sign-in, so `creationTime ≈ now`. A returning/existing
user who clicks the link has an old `creationTime` → rejected (cookie cleared).
This closes the "old user clicks a link to reward someone" abuse path without a
dedicated branch.

### Idempotency

Query `users/{friendUid}/referralBonuses where source == 'invited-by' limit 1`.
If a doc exists, no-op + clear cookie. Each friend earns at most one
`invited-by` bonus, lifetime.

### Self-referral block

`inviterUid !== friendUid` **and**
`inviterEmail.toLowerCase() !== friendEmail.toLowerCase()`.

### Pool computation timing

Pools are computed at write time. `inviterPool` excludes everything the inviter
can already see (anon ∪ signed ∪ their resolved entitlements incl. existing
bonuses), so the bonus never grants spots they already have. `friendPool`
excludes only anon ∪ signed (the friend has no entitlements yet at signup).

---

## 6. Testing Plan

Decision: **vitest for all logic + manual smoke for the auth happy-path.** No
Playwright/e2e infra is introduced (the repo has none; the auth wall — real
Google OAuth / Magic-Link email — is exactly what e2e automates worst, and is
precisely the manual smoke's job). At implementation time the auth happy-path
smoke is driven live via the Playwright MCP with the user as human-in-the-loop
for the Google login.

### Layer 1 — vitest (`npm run test`)

- `lib/referral/__tests__/pools.test.ts`
  - `computeReferralPools`: correct set differences for inviter & friend pools
  - all-berlin inviter → empty `inviterPool`
  - `sampleN`: ≤ n, no duplicates, empty pool → `[]`
- `__tests__/lib/firebase/entitlements.test.ts` (extend)
  - `reduceEntitlements(docs, bonuses)` unions bonus `restaurantIds` into the set
  - `resolveEntitlements` reads both subcollections (mock both `.get()`s)
- `__tests__/app/api/referral-confirm.test.ts` (NEW) — one case per §5 row:
  happy-path, self-referral (uid + email), not-new-account, idempotent repeat,
  inviter-deleted, all-berlin-inviter (friend doc yes / inviter doc no),
  **sanity-outage (cookie kept)**, no-cookie (no backend calls).
  Mirrors the existing `stripe-webhook.test.ts` / `map-data.test.ts`
  mocked-Admin-SDK pattern.
- `__tests__/middleware.test.ts` (extend)
  - valid `?ref=<uid>` → 308, param stripped, cookie set
  - garbage `?ref=` → param stripped, **no** cookie

### Layer 2 — manual local smoke (`npm run dev`, two browsers)

- Happy-path: open inviter's `?ref` link in browser B → sign up → inviter
  (browser A, signed in) sees the live toast and the map refetches.
- Cookie is HttpOnly (DevTools lock icon); `sessionStorage` guard prevents
  re-fire.
- Self-referral block holds; idempotency holds (friend signs out/in → no
  second bonus).
- All-Berlin inviter → no inviter bonus doc / no toast.

### Layer 3 — staging

- Google-only signup flow (Resend is disabled on staging per migration §2, so
  the Magic-Link path is not exercisable there).

---

## 7. Out of Scope

Per migration roadmap: hearts, saved lists, visited markers, push
notifications, spot sharing, saved filter sets, streaks, friend-list
visibility, multi-city. Referral analytics/leaderboards are also out of scope.

---

## 8. Open Implementation Notes

1. **Freshness window value** — proposed 10 min; tune if signup→app-load
   latency (esp. Magic-Link round-trip) ever exceeds it.
2. **Single PR** — backend + middleware + UI ship together (solo-dev,
   atomic layers coupled). Targets `staging`, then PR `staging → main`.
3. **Tracking** — Epic #14 (`Epic: Plan 4 — Referrals`); the final PR closes it.
