# Staging Server + Guest+20 Migration — Design

**Date:** 2026-05-27
**Author:** brainstormed with Claude
**Status:** Approved for implementation planning

---

## TL;DR

Before rebuilding the entitlements model from "Pack-Sequence + Trial-Map" to a clean
three-tier access model (Anon 20 / Signed-in 40 / Paid catalog), set up a dedicated
staging environment so the rebuild can be iterated without touching the live URL.
The staging environment uses a second App Hosting backend on a `staging` branch,
shared Firebase project, isolated Stripe (test mode) and Resend (disabled), and is
gated by Basic Auth + `noindex`. Run all rebuild work through GitHub Issues with a
Project Board so the migration is broken into trackable units.

The migration itself is destructive — zero traffic means no compatibility layer,
no V1/V2 function naming, no Firestore backfill. Old pack-sequence code is ripped
out entirely. Curation of which spots show up in each tier happens in Sanity Studio
via new schema flags.

A separate document (`docs/product/roadmap.md`) captures features that came up
during brainstorming but are not part of this migration (Hearts, Visited, Push,
etc.).

---

## Scope

### In scope
- Second App Hosting backend (`eat-this-staging`) on `staging` branch
- Env-isolation: Stripe test mode, Resend disabled, shared Firestore with `meta.env` markers
- Basic Auth + `noindex` + staging banner on the staging URL
- Three-tier access model (Anon 20 / Signed-in 40 / Booster / All Berlin) in `/api/map-data`
- Curation flags in Sanity: `restaurant.tierAnon`, `restaurant.tierSigned`, `mustEat.revealedForAnon`
- Geofence reveal mechanic — kept, but signed-in only
- Referral system: unlimited referrals, +10 spots each for inviter and friend, random-but-stable picks
- Cleanup: rip `welcomePack.ts`, `usePack.ts`, ProfileDeck pack-flow, `'starter'` entitlement type, Cloud Function `welcomePack`
- GitHub Issues + Projects v2 ticket system with labels, templates, milestone

### Out of scope (see roadmap)
- Hearts (loved-by-N count)
- Saved lists / favorites
- Visited-marker
- Push notifications
- Sharing spots
- Saved filter sets
- Streaks / gamification
- Friend-list visibility
- Multi-city expansion

---

## 1. Branching + Backend Architecture

### Branches
- `main` — auto-deploys to production backend `eat-this`
- `staging` — long-running branch, auto-deploys to new backend `eat-this-staging`
- Feature branches → PR into `staging` → manual smoke → PR into `main`

### Branch protection
- `main` requires PR from `staging` (no direct push)
- `staging` allows direct push (solo-dev workflow)

### Backend
- New Firebase App Hosting backend: `eat-this-staging`
  - Region: `us-central1` (same as prod)
  - Trigger: GitHub Webhook on push to `staging`
  - URL: `eat-this-staging--eat-this-8a13b.us-central1.hosted.app` (or whatever Firebase assigns)
- Pre-push hook (`npm run build`) applies to both branches — protects staging too

---

## 2. Environment Isolation

Both backends share the same Firebase project (Firestore, Auth, Functions, Sanity).
Isolation happens via env vars and per-backend secrets.

### Stripe (test mode on staging)
- App Hosting Secrets per backend:
  - `STRIPE_SECRET_KEY` → live key on prod, test key on staging
  - `STRIPE_WEBHOOK_SECRET` → per-endpoint, different value on each backend
- Stripe Dashboard: two webhook endpoints registered
  - `https://eat-this--…/api/stripe/webhook` (live mode)
  - `https://eat-this-staging--…/api/stripe/webhook` (test mode)
- Staging-only price IDs in test-mode catalog (mirror of live catalog)

### Resend (disabled on staging)
- In `lib/resend.ts` (or wherever sending happens), early-return if
  `process.env.NEXT_PUBLIC_ENV === 'staging'`
- Log to console instead so flows can still be smoke-tested
- Skips polluting the launch audience with test signups

### Sanity (shared, read-only on staging)
- Staging reads `production` dataset (no content drift, no Studio switch)
- `SANITY_API_WRITE_TOKEN` set on prod only — staging gets no write capability
- `import-restaurant` API route 401s on staging (intentional)

### Firestore (shared with marker pattern)
- All writes from staging stamp `meta.env: 'staging'` on the doc
- Helper in `lib/firebase/stagingMeta.ts`:
  ```ts
  export function withStagingMeta<T>(data: T): T & { meta?: { env: string } } {
    if (process.env.NEXT_PUBLIC_ENV !== 'staging') return data
    return { ...data, meta: { env: 'staging' } }
  }
  ```
- Prod-facing queries that surface data (admin views, counts) filter
  `meta.env != 'staging'`
- Acceptable risk: staging users are visible in raw Firestore console but
  programmatically isolated

### Env variable
- `NEXT_PUBLIC_ENV=production` on `eat-this` backend
- `NEXT_PUBLIC_ENV=staging` on `eat-this-staging` backend
- Set in `apphosting.yaml` per backend (or via `apphosting:secrets:set`)

---

## 3. Cloud Functions Cleanup

No V1/V2 versioning — zero traffic means no users to protect.

### Removals
- `functions/index.js`: `welcomePack` callable function → delete entirely
  (new model uses no Firestore pack-doc, only `/api/map-data` tier checks)
- `users/{uid}/packs/*` Firestore subcollection → one-shot wipe script in `scripts/`

### Survives unchanged
- `users/{uid}/unlockedMustEats` collection + `useUnlockedMustEats` hook —
  per-user reveal state for the geofence mechanic, still written one-doc-per-reveal
  from `MustEatRevealOverlay`. Only the batch-write inside the deleted
  `openWelcomePack` function goes away; per-reveal writes stay.
- `users/{uid}/entitlements/*` — Stripe purchases write here unchanged

### Adds
- Cloud Function `confirmReferral` (callable, triggered by DOI-confirm flow):
  - Validates `inviterUid` exists and is not the same as `friendUid`
  - Writes `users/{inviterUid}/referralBonuses/{newId}` with 10 random restaurantIds
  - Writes `users/{friendUid}/referralBonuses/welcome` with 10 random restaurantIds
  - Both bonus docs are immutable once written

---

## 4. Tier Access Model

### Tiers

Tiers are cumulative — a user's visible set is the union of every tier they
qualify for. A Booster user sees Anon + Signed + Booster + any Referral bonuses
they've earned.

| Tier | Trigger | Adds to visible set |
|------|---------|---------------------|
| Anon | no auth | 20 spots flagged `tierAnon` in Sanity, all have must-eats |
| Signed-in | Firebase Auth user | + 20 spots flagged `tierSigned` |
| Booster | Stripe entitlement `category` | + all spots in that category |
| All Berlin | Stripe entitlement `all-berlin` | full catalog (overrides above) |
| Referral bonus | per successful referral | + 10 spots from persisted bonus doc (stacks) |

### `/api/map-data` rewrite

```ts
const tier = !uid ? 'anon' : ent.hasAllBerlin ? 'all' : ent.categorySlugs.size > 0 ? 'booster' : 'signed'

const tierAnonSet    = await getRestaurantsFlagged('tierAnon')    // 20 spots
const tierSignedSet  = await getRestaurantsFlagged('tierSigned')  // 20 spots
const referralBonus  = uid ? await getReferralBonusRestaurants(uid) : []

let visible: Restaurant[]
if (tier === 'all') visible = all
else if (tier === 'booster') visible = union(tierAnonSet, tierSignedSet, categoryMatched, referralBonus)
else if (tier === 'signed') visible = union(tierAnonSet, tierSignedSet, referralBonus)
else visible = tierAnonSet  // anon
```

Locked-preview behavior (showing greyed-out unreachable spots) is preserved
from current code so the upsell stays visible.

### Reveal mechanic (signed-in only)

- `mustEat.revealedForAnon: true` on exactly 10 must-eats across `tierAnon`
  restaurants → shown open on the map for everyone
- All other must-eats on `tierAnon` restaurants → shown covered on anon view,
  **not interactive** (no geofence trigger, no tap-to-reveal)
- Signed-in users: all must-eats except those 10 are covered initially,
  revealable via 50m geofence using existing `useUserLocation` +
  `useUnlockedMustEats` + `MustEatRevealOverlay` code
- The 10 anon-revealed must-eats stay open for signed-in users — not double-covered

### Sanity schema deltas

```
restaurant:
  + tierAnon: boolean (default false; ~20 docs flagged)
  + tierSigned: boolean (default false; ~20 docs flagged)

mustEat:
  + revealedForAnon: boolean (default false; exactly 10 across tierAnon spots)
```

Studio validation: a custom Sanity rule warns (not blocks) if `tierAnon` count
≠ 20, `tierSigned` count ≠ 20, or `revealedForAnon` count ≠ 10. Warning, not
error, because curation is iterative.

### Cleanups in code

| File | Action |
|------|--------|
| `nextjs/lib/firebase/welcomePack.ts` | Delete |
| `nextjs/lib/firebase/usePack.ts` | Delete |
| `nextjs/app/components/profile/ProfileDeck.tsx` | Remove pack-card-flyin sequence, keep deck-stack for unlocked must-eats |
| `nextjs/lib/firebase/entitlements.ts` | Drop `'starter'` from `Entitlement.type` union and `reduceEntitlements` |
| `nextjs/app/api/map-data/route.ts` | Refactor to tier-based filter described above |
| `functions/index.js` | Remove `welcomePack` export |
| Firestore rules | Remove `users/{uid}/packs/*` rules |

---

## 5. Referral System

### Flow
1. Inviter on Profile-Page taps "Freunde einladen" → gets link
   `https://eatthisdot.com/?ref=<inviterUid>`
2. Friend clicks link → cookie `pending_referrer=<inviterUid>` set, HttpOnly, 30 days
3. Friend signs up via DOI flow
4. DOI confirm endpoint reads cookie, calls Cloud Function `confirmReferral`
5. Function validates + writes both bonus docs
6. Inviter sees toast via Firestore snapshot listener: "🎉 Ein Freund ist beigetreten — +10 Spots"

### Bonus pick algorithm
- Pool for inviter: `allRestaurants \ visibleToInviter(at-write-time)`
- Pool for friend: `allRestaurants \ (tierAnon ∪ tierSigned)`
- Pick: 10 random via `Math.random()` server-side
- IDs persisted in bonus doc — never recomputed → stable forever
- Pool shrinks per referral; if pool < 10, bonus is smaller (no error)

### Bonus doc shape
```
users/{uid}/referralBonuses/{autoId}:
  restaurantIds: string[]
  source: 'invited' | 'invited-by' | 'welcome-bonus'
  partnerUid: string  // the other side of the referral
  createdAt: serverTimestamp
```

### Anti-fraud
- DOI-confirmation required — Cloud Function fires only after email-verified signup
- Self-referral block: `inviterUid !== friendUid && inviterEmail !== friendEmail`
- No IP/device-fingerprint blocking (solo-dev stack, not worth complexity)

### Monetisation note
With no cap and bonus on both sides, after ~30 successful referrals a user
effectively has All Berlin. This is intentional per current product direction
(growth > revenue). The cap-injection point is `confirmReferral` — adding
`if (existingBonuses.length >= MAX_REFERRALS) skip` is a one-line change later.

### UI placement
- Profile page: dedicated "Freunde einladen" section
  - Link display (copy button + native share + WhatsApp/iMessage direct buttons)
  - Counter: "X Freunde haben sich registriert → +Y0 Spots freigeschaltet"
- Toast/notification: Firestore snapshot listener on `users/{uid}/referralBonuses`
  triggers toast when new doc appears with `source: 'invited'`

---

## 6. Ticket System

### GitHub Issues + Projects v2

**Labels:**
- Domain: `migration`, `seo`, `voice`, `bug`, `infra`, `design`, `content`, `chore`, `epic`
- Priority: `p0`, `p1`, `p2`

**Templates** (`.github/ISSUE_TEMPLATE/`):
- `bug.yml` — Wo, was erwartet, was passiert, Repro-Steps, Screenshots
- `feature.yml` — User Story, Akzeptanzkriterien, betroffene Files
- `migration-task.yml` — Was rippt aus, was kommt rein, Test-Plan, Rollback-Pfad

**Project Board:**
- Columns: Backlog → Up Next → In Progress → In Review → Done
- Views: Default Kanban, Migration Milestone, This Week (`p0`+`p1`)
- Auto-add: all new issues land in Backlog

**Migration milestone:**
- Name: `Guest+20 Migration`
- Due: ~2 weeks from kickoff
- Contains all migration-tagged issues (list in §8 below)

### Workflow
- Issue creation: `gh issue create -t "…" -l migration,p1 -m "Guest+20 Migration"`
- Branch naming: `feature/issue-NN-short-slug`
- PR body: `Closes #NN` → auto-close on merge + auto-move to Done
- Claude commits include `Closes #NN` where applicable

### Claude's interaction
- Session-start: `gh issue list --label p0,p1 --state open` to see what's open
- On bug discovery: `gh issue create` with bug template + labels
- On PR merge: `gh issue close` automatic via PR body

---

## 7. Staging URL Protection

### Layer 1 — Robots
- `app/robots.ts`:
  - if `NEXT_PUBLIC_ENV === 'staging'`: return `User-agent: *\nDisallow: /`
  - else: current allowlist behavior
- `<meta name="robots" content="noindex,nofollow">` in root layout if staging

### Layer 2 — X-Robots-Tag header
- `middleware.ts` on staging: sets `X-Robots-Tag: noindex, nofollow` on every response
- Belt + suspenders — Google honors header even if robots.txt is bypassed

### Layer 3 — Visual marker
- Root layout: when staging, render top banner "STAGING — not production" in coral
- Tappable → links to prod URL

### Layer 4 — Basic Auth gate
- `middleware.ts` on staging: check `Authorization: Basic <base64>` header
- Credentials from App Hosting Secrets: `STAGING_BASIC_AUTH_USER` + `STAGING_BASIC_AUTH_PASS`
- Exempt paths: `/api/stripe/webhook` (Stripe can't send auth headers)
- Browser shows native auth dialog on first visit, cookie holds session after

### Layer 5 — Empty sitemap
- `app/sitemap.ts`: if staging, return empty array
- `app/robots.ts` does not reference a sitemap URL when staging

### Layer 6 — Distinct favicon (polish, optional)
- Staging serves a red-tinted variant of the favicon → browser tab visually distinct
- Skip on day 1, add if confusion arises

---

## 8. Build Sequence

Migration milestone, in suggested order:

**Infra setup (before any code changes):**
1. Create second App Hosting backend `eat-this-staging`
2. Push empty `staging` branch, verify auto-deploy
3. Set per-backend secrets: `STRIPE_*` (test mode), `STAGING_BASIC_AUTH_*`, `NEXT_PUBLIC_ENV=staging`
4. Register staging webhook endpoint in Stripe Dashboard
5. Set up GitHub Issue labels via `gh label create` script
6. Create Issue templates (`.github/ISSUE_TEMPLATE/`)
7. Create GitHub Project + Migration milestone

**Staging URL protection:**
8. Add `NEXT_PUBLIC_ENV` gating to `app/robots.ts` + `middleware.ts` + root layout
9. Add Basic Auth middleware (exempt webhook)
10. Add staging banner component

**Sanity schema changes:**
11. Add `restaurant.tierAnon`, `restaurant.tierSigned`, `mustEat.revealedForAnon` to schema
12. Deploy schema
13. Curate 20 anon-spots, 20 signed-spots, 10 revealed must-eats in Studio

**Code cleanup:**
14. Delete `lib/firebase/welcomePack.ts`
15. Delete `lib/firebase/usePack.ts`
16. Strip pack-flyin sequence from `ProfileDeck.tsx`
17. Remove `'starter'` from `entitlements.ts`
18. Remove `welcomePack` export from `functions/index.js`
19. Remove `packs/*` from Firestore rules
20. One-shot wipe `users/*/packs` Firestore docs (write a script in `scripts/`)

**Tier-based map data:**
21. Refactor `/api/map-data/route.ts` to tier-based filter
22. Update anon-map CSS so covered must-eats are visually distinct
23. Gate 50m-geofence-reveal on signed-in only

**Referral system:**
24. Profile UI: "Freunde einladen" section + link generator + share buttons
25. Cookie capture on `?ref=…` click (middleware or root layout)
26. Cloud Function `confirmReferral` (validation + bonus writes)
27. DOI-confirm endpoint calls `confirmReferral`
28. `/api/map-data`: union `referralBonuses` restaurant IDs into visible set
29. Profile UI: counter + Firestore-snapshot toast

**Cutover:**
30. Smoke test full flow on staging URL
31. PR `staging` → `main`
32. Verify prod deploy
33. Decommission staging backend (optional — keep for next migration)

---

## 9. Open Questions

- **Anon-Reveal-State persistence:** Decision was no anon localStorage at all. If
  product-feel suffers ("user reveals nothing as anon"), revisit by allowing
  in-session reveals with no persistence.
- **`tierAnon`/`tierSigned` overlap:** Should a spot ever appear in both? Decision:
  no, they're disjoint sets. Studio validation enforces.
- **Referral cookie collision with `ref` query param elsewhere in app:** Currently
  no other `ref` param exists. Reserve the name.
- **Friend-side bonus pool when `tierSigned` + `tierAnon` covers most of catalog:**
  At ~150 total restaurants, leaving 110 in the friend-bonus pool. Plenty of room.
- **Migration timeline:** estimate 2 weeks; track via milestone Due date and adjust
  if scope slips.

---

## 10. Rollback Plan

Each major chunk is a separate PR from `staging` → `main`, so rollback = revert
that PR.

- Worst case: full migration deployed, severe bug surfaces → `git revert <merge-sha>` + push to `main`
- Firestore data: no destructive ops on prod data beyond the one-shot `users/*/packs` wipe.
  That wipe is reversible only via Firestore backup → enable daily Firestore export
  in GCP Console **before** running the wipe script (one-time setup).

---

## Appendix — Files Touched

```
nextjs/
  app/
    [locale]/
      layout.tsx                 — staging banner
    api/
      map-data/route.ts          — tier-based filter
    components/
      profile/
        ProfileDeck.tsx          — drop pack sequence
        ProfileReferral.tsx      — NEW
      map/
        MustEatRevealOverlay.tsx — gate on auth
  lib/
    firebase/
      welcomePack.ts             — DELETE
      usePack.ts                 — DELETE
      entitlements.ts            — drop 'starter'
      stagingMeta.ts             — NEW helper
      referrals.ts               — NEW
  middleware.ts                  — basic auth + X-Robots-Tag
  app/
    robots.ts                    — env gating
    sitemap.ts                   — empty on staging
functions/
  index.js                       — drop welcomePack, add confirmReferral
scripts/
  wipe-packs-collection.ts       — NEW one-shot
sanity-studio/
  schemas/
    restaurant.ts                — add tierAnon, tierSigned
    mustEat.ts                   — add revealedForAnon
.github/
  ISSUE_TEMPLATE/
    bug.yml                      — NEW
    feature.yml                  — NEW
    migration-task.yml           — NEW
```

(File paths verify-as-correct at brainstorm time; adjust during implementation.)
