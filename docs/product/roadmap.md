# Product Roadmap — post Guest+20 Migration

**Last updated:** 2026-06-14

This is the parking lot for features brainstormed but not in scope for the
[Guest+20 Migration](../superpowers/specs/2026-05-27-staging-and-migration-design.md).
Each section is one epic. When work begins on an epic, a dedicated design spec
gets written and the epic gets cross-linked from here.

Each entry below should have a matching `epic` issue on GitHub for tracking.

**Status legend:** ✅ done · 🚧 in progress · 💡 parking lot

---

## ✅ Hearts (loved-by-N count) — BUILT

**Status:** Implemented (PR #170, branch `claude/task-review-kevr6c`).
Design spec: [`docs/specs/2026-06-09-hearts-design.md`](../specs/2026-06-09-hearts-design.md).

**What shipped**
- A heart **is** a saved spot — merged with the existing `users/{uid}/favorites`,
  so there's no separate private-bookmark concept. (Resolves the "merge with
  Saved Lists?" open question below.)
- Public count "geherzt von N Leuten" / "loved by N people" on the **map detail
  sheet** and the **SEO restaurant page**. Logged-in users only can heart
  (anon → `/login`); everyone sees the count. No ratings/dislike/comments.
- Counter lives in `restaurants/{_id}.heartCount` (Sanity `_id` key), maintained
  server-side by the **`/api/heart`** Admin SDK transaction — the original
  Cloud Function trigger was replaced when the `functions/` layer was removed in
  the clean-architecture reset. One account contributes at most +1.

**Resolved open questions**
- Anonymous hearts → **no** (spam surface, no per-user state).
- Count surfaces on the restaurant detail surfaces; **map list-row badge deferred**.
- Users' own hearts are collated in profile (= their saved spots).
- Hearts stay **purely social** — no entitlement unlock.

**Deferred follow-ups:** map list-row count badge.

---

## ✅ Saved Lists / Favorites — DECIDED (merged into Hearts)

**Resolved with the Hearts epic:** **merged.** A heart IS a favorite; the saved
spots in `users/{uid}/favorites` are the hearts, and the public aggregate is the
heart count. No separate private-bookmark concept. Users see their own saved
spots collated in the profile. (Was: "Merge with hearts or keep separate?" —
merge won; "loved-by-N" being a public signal is acceptable because the heart
*is* the save.)

---

## Visited-Marker

**Concept**
- "Hier war ich" toggle on each spot
- Map shows visited spots with a check-mark or different color
- Profile-Page shows total visited count

**Data model**
- `users/{uid}/visited/{restaurantSlug}` — one doc per visit
- Includes optional fields: `visitedAt`, `note`, `photo`?

**Open questions**
- Can user mark multiple visits per spot (timeline of visits)? Or boolean per spot?
- Does "visited" auto-trigger when geofence enters within X meters?
- Visibility — private only, or shared with friends?

**Dependencies:** Friend-list (if shared visited) — otherwise standalone

---

## Push Notifications

**Concept**
- Notify when user is within 50m of a covered must-eat → "Tap to reveal"
- Optionally: notify when friend joins (already covered by Firestore-snapshot toast for in-app)
- Optionally: notify when a new spot in a category they own gets added

**Stack**
- FCM (Firebase Cloud Messaging) — was in the codebase, then ripped per memory `project_disabled_features_reintegration`
- Background geofence triggers need iOS native or PWA Service Worker (Service Worker is limited on iOS — geofence in background = native-only typically)

**Open questions**
- PWA push support: where does iOS Safari stand in 2026? Last status was very limited.
- Quiet hours / DND
- Opt-in flow — when to ask permission (post-signup feels natural; on-first-geofence-hit better conversion)

**Dependencies:** Service Worker re-introduced (was ripped). Heavy.

---

## Sharing Spots

**Concept**
- Tap "share" on a spot → native share sheet (Web Share API)
- Share link includes `?ref=<inviterUid>` so a successful signup from a shared link counts as a referral

**Data model**
- No new data — reuses existing Restaurant route + referral cookie

**Open questions**
- Should "shared spot" link land on the restaurant detail page or on the map with that spot pre-selected?
- Anti-spam: same spot shared 100x from same user — capped?

**Dependencies:** Referral system (done in migration)

---

## Saved Filter Sets / Quick-Filters

**Concept**
- User configures map filters (cuisine, district, "open now", price range) → saves as a named set
- Quick-access from a Quick-Filter row at the top of the map sheet
- e.g., "Veggie in Kreuzberg", "Date Night Spots", "Cheap Lunch"

**Data model**
- `users/{uid}/filterSets/{autoId}` — name + serialised filter state

**Open questions**
- How many filter sets per user (cap)?
- Default sets prefilled for new users ("Best Lunch", "Sweet Treats")?
- Sharing filter sets between users?

**Dependencies:** Tier-model migration

---

## Streaks / Gamification

**Concept**
- "X Tage in Folge enthüllt" — streak counter
- Badges for milestones: 5 spots revealed, 25 spots, 100, "alle Bezirke besucht", etc.
- Visible on profile page

**Open questions**
- Does streak reset on missed day, or grace period?
- Visibility — private, public, shared-with-friends?
- Anti-cheat: same-user multi-account streak farming
- Risk: gamification adds urgency-loop that conflicts with the brand's slow editorial voice

**Recommendation:** Keep light. Maybe just total-revealed count, no streak/badge layer. Mood-fit check needed.

**Dependencies:** Geofence-reveal flow active

---

## Friend-List Visibility

**Concept**
- See which friends signed up via your referral link in profile
- Optional: see what friends have visited / hearted (privacy implications)

**Data model**
- `users/{uid}/referralBonuses` already tracks `partnerUid` — can resolve to friend's profile info
- For friend's visits/hearts visibility, separate sharing-toggle per user

**Open questions**
- Friend privacy: opt-in to be visible? GDPR considerations (DE/EU)
- What info shown — display name only, or photo/visited-count?

**Dependencies:** Referral system (done in migration), Visited-Marker (if shared visits)

---

## Multi-City Expansion

**Concept**
- Open beyond Berlin: München, Hamburg, etc.
- Each city has its own anon/signed sets, own booster categories, own All-City entitlement

**Implications**
- Sanity schema: `city` field on restaurant (currently implicit Berlin-only)
- URL routing: `/berlin/...`, `/muenchen/...` or subdomains
- Stripe catalog multiplied per city
- Anon-20 + Signed-20 curation needs to happen per city
- Map default-center per city

**Open questions**
- Single backend or per-city backend?
- Pricing per city — same €20 or city-relative?
- Content sourcing strategy for new cities (you can't curate München from Berlin alone)

**Dependencies:** Berlin model proven + revenue justifies expansion

---

## Open Catch-All

If something comes up that doesn't fit above, log it here with a one-paragraph
description and a GitHub epic issue. Don't let ideas live only in chat history.
