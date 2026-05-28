# Plan 2 — Schema + Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the data foundation for the tier model — add Sanity curation flags (`tierAnon`, `tierSigned`, `revealedForAnon`) and rip every line of the old pack-sequence code (`welcomePack.ts`, `usePack.ts`, Cloud Functions, Firestore rules, Pack UI), so Plan 3's `/api/map-data` refactor lands on a clean slate.

**Architecture:** Aggressive cleanup, no compatibility shims (zero-traffic permits this — per CLAUDE.md). The Sanity schema gains three boolean flags that prod can keep ignoring while operator curates content. The frontend stops calling Cloud Function `ensureWelcomePack`. The Cloud Function side keeps `onUserCreate` for future hooks but strips all pack-writes. A one-shot script wipes residual Firestore pack docs after deploy.

Plan 3 (the `/api/map-data` tier refactor) starts only after the schema flags are curated by the operator (~20 anon spots, ~20 signed spots, ~10 revealed must-eats in Sanity Studio).

**Tech Stack:** Sanity Studio (JS schema), Next.js 15, Vitest, Firebase Cloud Functions (Node 20 / firebase-functions v6), Firestore Rules

**Spec:** [`docs/specs/2026-05-27-staging-and-migration-design.md`](../specs/2026-05-27-staging-and-migration-design.md) §4 (Tier model) + §3 (Cloud Functions cleanup)

**Branch flow:** Work directly on `staging` branch. Each task = commit. After Task 11 smoke passes on staging URL, open PR `staging` → `main`.

---

## File Structure

### Modified
- `studio/schemaTypes/restaurant.js` — `+tierAnon`, `+tierSigned` boolean fields
- `studio/schemaTypes/mustEat.js` — `+revealedForAnon` boolean field
- `nextjs/lib/firebase/entitlements.ts` — drop `'starter'` from type union + reducer
- `nextjs/__tests__/lib/firebase/entitlements.test.ts` — drop/update tests that depend on starter
- `nextjs/app/components/profile/ProfileShell.tsx` — remove pack state + `createWelcomePack` call
- `nextjs/app/components/profile/ProfileDeck.tsx` — remove pack-sequence overlay
- `functions/index.js` — drop `provisionWelcomeForUid`, `pickRandomMustEatsWithParents`, `parentRestaurantIdsOf`, `ensureWelcomePack`, `openPack`; trim `onUserCreate` to a no-op shell
- `firestore.rules` — drop `users/{uid}/packs/*` and `userPacks/{uid}/packs/*` rules

### Deleted
- `nextjs/lib/firebase/welcomePack.ts`
- `nextjs/lib/firebase/usePack.ts`

### New
- `scripts/wipe-packs-collection.mjs` — one-shot Firestore wipe (operator runs)
- `docs/runbooks/2026-05-28-plan-2-deploy.md` — operator runbook for schema deploy + functions deploy + wipe script

### Out of scope (Plan 3)
- `/api/map-data` tier-based filter refactor
- `MustEatRevealOverlay` auth gating
- StagingBanner / middleware / robots / sitemap (Plan 1, done)
- Anything in ProfileBooster (booster purchase flow stays — Stripe path unchanged)

---

## Task 1: Add `tierAnon` field to restaurant schema

**Files:**
- Modify: `studio/schemaTypes/restaurant.js`

Add the field right after the existing `featured` flag so curation lives together. Same boolean pattern, default `false`.

- [ ] **Step 1: Verify branch**

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" rev-parse --abbrev-ref HEAD
```

Expected: `staging`. If not, `git checkout staging` first.

- [ ] **Step 2: Read the existing `featured` field block for reference**

```bash
grep -n "name: 'featured'" "/Users/ersane/Downloads/Projekte/Eat This/studio/schemaTypes/restaurant.js"
```

Expected: line ~55 → 60.

- [ ] **Step 3: Insert the new field block AFTER the `featured` block**

In `studio/schemaTypes/restaurant.js`, immediately after the closing `},` of the `featured` field (around line 60), insert:

```js
    {
      name: 'tierAnon',
      title: 'Anon-Tier — sichtbar ohne Login',
      type: 'boolean',
      initialValue: false,
      description: 'Anhaken um dieses Restaurant in den ~20 anonymen Spots zu zeigen, die jeder ohne Login auf der Map sieht. Sollte ein Restaurant mit mindestens einem Must-Eat sein.',
    },
```

- [ ] **Step 4: Verify syntactic validity**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/studio" && node -e "require('./schemaTypes/restaurant.js')" && echo "schema ok"
```

Expected: `schema ok`. (Sanity uses Node-style requires for schema files.)

- [ ] **Step 5: Commit**

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" add studio/schemaTypes/restaurant.js
git -C "/Users/ersane/Downloads/Projekte/Eat This" commit -m "sanity(schema): add restaurant.tierAnon flag"
```

---

## Task 2: Add `tierSigned` field to restaurant schema

**Files:**
- Modify: `studio/schemaTypes/restaurant.js`

- [ ] **Step 1: Insert tierSigned immediately after tierAnon**

In `studio/schemaTypes/restaurant.js`, right after the `tierAnon` block from Task 1, insert:

```js
    {
      name: 'tierSigned',
      title: 'Signed-Tier — sichtbar nach Login (+20)',
      type: 'boolean',
      initialValue: false,
      description: 'Anhaken um dieses Restaurant in den +20 Spots zu zeigen, die signed-in User zusätzlich zu den Anon-20 sehen. Disjunkt zu Anon-Tier — ein Spot ist entweder Anon ODER Signed.',
    },
```

- [ ] **Step 2: Verify**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/studio" && node -e "require('./schemaTypes/restaurant.js')" && echo "schema ok"
```

- [ ] **Step 3: Commit**

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" add studio/schemaTypes/restaurant.js
git -C "/Users/ersane/Downloads/Projekte/Eat This" commit -m "sanity(schema): add restaurant.tierSigned flag"
```

---

## Task 3: Add `revealedForAnon` field to mustEat schema

**Files:**
- Modify: `studio/schemaTypes/mustEat.js`

This flag marks ~10 must-eats across the Anon-20 set that show OPEN (visible) on the map for anonymous visitors as a demo of the reveal mechanic. The rest of those restaurants' must-eats stay covered (not interactive for anon).

- [ ] **Step 1: Read the existing mustEat schema to find a sensible insertion point**

```bash
grep -n "^      name: '" "/Users/ersane/Downloads/Projekte/Eat This/studio/schemaTypes/mustEat.js"
```

This lists all field names. Insert the new field as the LAST field in the document (just before the closing `]` of the `fields:` array).

- [ ] **Step 2: Insert revealedForAnon**

In `studio/schemaTypes/mustEat.js`, as the last entry in the `fields:` array (before the closing `]`):

```js
    {
      name: 'revealedForAnon',
      title: 'Anon-Demo — offen sichtbar ohne Login',
      type: 'boolean',
      initialValue: false,
      description: 'Anhaken bei genau ~10 Must-Eats, verteilt über die Anon-Tier-Restaurants. Diese werden auf der Map offen gezeigt für anonyme Besucher als Vorgeschmack auf das Reveal-Spiel. Pflicht: nur auf Restaurants mit tierAnon: true setzen.',
    },
```

- [ ] **Step 3: Verify**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/studio" && node -e "require('./schemaTypes/mustEat.js')" && echo "schema ok"
```

- [ ] **Step 4: Commit**

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" add studio/schemaTypes/mustEat.js
git -C "/Users/ersane/Downloads/Projekte/Eat This" commit -m "sanity(schema): add mustEat.revealedForAnon flag"
```

---

## Task 4: Drop `'starter'` from entitlements.ts

**Files:**
- Modify: `nextjs/lib/firebase/entitlements.ts`
- Modify: `nextjs/__tests__/lib/firebase/entitlements.test.ts`

The `'starter'` type was the bridge between welcomePack and the entitlements resolver. New tier model uses auth state directly — no starter docs needed. Existing tests reference starter — they need updates.

- [ ] **Step 1: Read existing test cases for starter coverage**

```bash
grep -n "starter\|'starter'" "/Users/ersane/Downloads/Projekte/Eat This/nextjs/__tests__/lib/firebase/entitlements.test.ts"
```

Expected: multiple lines. List them so you know what tests need rewrites or deletions.

- [ ] **Step 2: Modify the test file FIRST (TDD discipline)**

Open `nextjs/__tests__/lib/firebase/entitlements.test.ts`. For each test that uses `type: 'starter'`:

- If the test was specifically about starter behavior (e.g., "starter docs add restaurantIds + mustEatIds to ResolvedEntitlements"), DELETE the test entirely.
- If the test mixed starter with other types (e.g., "all-berlin + starter + category"), remove the starter doc from the test fixture and update assertions if needed.

Also update the `Entitlement` type import expectations — TypeScript checks may flag that `'starter'` is no longer assignable. Tests should construct fixtures matching the trimmed type union.

- [ ] **Step 3: Run tests — must fail or report type errors before implementation**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/nextjs" && npx vitest run __tests__/lib/firebase/entitlements.test.ts
```

Expected: at least some failures (because reducer in entitlements.ts still handles 'starter', but the type union — if tightened — won't match).

Actually since we haven't modified `entitlements.ts` yet, the tests will likely still pass. That's OK — this is a TDD-LITE situation where the test changes are tightly coupled to the production change. Proceed to Step 4.

- [ ] **Step 4: Modify entitlements.ts**

Open `nextjs/lib/firebase/entitlements.ts`. Two changes:

A) Remove `'starter'` from the `Entitlement.type` union:

Before:
```ts
export interface Entitlement {
  type: 'starter' | 'category' | 'all-berlin'
  ...
}
```

After:
```ts
export interface Entitlement {
  type: 'category' | 'all-berlin'
  ...
}
```

B) Remove the `else if (data.type === 'starter')` branch from `reduceEntitlements`:

Before:
```ts
} else if (data.type === 'starter') {
  data.restaurantIds.forEach((id) => out.restaurantIds.add(id))
  data.mustEatIds.forEach((id) => out.mustEatIds.add(id))
}
```

After: just delete the entire `else if` block.

C) The `restaurantIds` and `mustEatIds` Sets on `ResolvedEntitlements` are now never populated by the reducer. **Leave them in the interface** — they'll be reused by Plan 4 (referral bonuses). Don't strip them.

- [ ] **Step 5: Run tests — must pass**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/nextjs" && npx vitest run __tests__/lib/firebase/entitlements.test.ts
```

Expected: PASS. If still failing, fix the test fixtures to match the new type union (no `'starter'` allowed).

- [ ] **Step 6: TypeScript check — confirm no NEW errors in the project (pre-existing OK)**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/nextjs" && npx tsc --noEmit 2>&1 | grep -E "(starter|entitlements)" | head -20
```

Expected: no output (no new errors in entitlements.ts or files importing the type).

If errors appear in OTHER files (e.g., a checker in `/api/map-data/route.ts` or somewhere that constructs `Entitlement` literals with `type: 'starter'`), those are call sites that ALSO need patching in this task. Hunt them down with:

```bash
grep -rn "'starter'" "/Users/ersane/Downloads/Projekte/Eat This/nextjs" --include="*.ts" --include="*.tsx"
```

Fix each occurrence — likely just delete the line that creates a starter entitlement doc, or remove a conditional branch.

- [ ] **Step 7: Commit**

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" add nextjs/lib/firebase/entitlements.ts nextjs/__tests__/lib/firebase/entitlements.test.ts
git -C "/Users/ersane/Downloads/Projekte/Eat This" commit -m "entitlements: drop 'starter' type — new tier model uses auth state"
```

If Step 6 hunted down additional files, include them in the `git add` line.

---

## Task 5: Strip pack code from ProfileShell.tsx

**Files:**
- Modify: `nextjs/app/components/profile/ProfileShell.tsx`

ProfileShell currently:
- Imports `usePack` (line 5) and `createWelcomePack` (line 6)
- Calls `usePack(user?.uid ?? null)` (line 25)
- Conditionally invokes `createWelcomePack` (around line 51)
- Passes `pack` down to children (around line 104)

After this task: no pack-related state, no pack-related call. Children that previously consumed `pack` get the prop removed too (Task 6 handles ProfileDeck side).

- [ ] **Step 1: Read the full file**

```bash
cat "/Users/ersane/Downloads/Projekte/Eat This/nextjs/app/components/profile/ProfileShell.tsx"
```

You need full context — the file is only 154 lines. Read it end-to-end.

- [ ] **Step 2: Edit**

Remove:
- Line 5 (`import { usePack } from '@/lib/firebase/usePack'`)
- Line 6 (`import { createWelcomePack } from '@/lib/firebase/welcomePack'`)
- Any other import of `usePack`, `createWelcomePack`, `BoosterPack`, or related types from pack files
- The `const pack = usePack(...)` line and all subsequent references to `pack` in the component
- The `useEffect` (or wherever) that calls `createWelcomePack(user.uid, mustEats)` and its `.catch(...)` block
- The `pack` prop in the children render (e.g., `<ProfileDeck ... pack={pack} ... />`)
- The `pack:` field in any type interface defined in this file (search for `pack:` near `ReturnType<typeof usePack>`)

Leave intact:
- All other ProfileShell logic (auth, theme, layout, ProfileBooster integration, etc.)

- [ ] **Step 3: TypeScript check**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/nextjs" && npx tsc --noEmit 2>&1 | grep "ProfileShell\|profile/" | head -20
```

Expected: errors about ProfileDeck props (because ProfileDeck still expects `pack`). That's fine — Task 6 fixes ProfileDeck side. To make TS happy in the interim, you may need to coordinate: do BOTH ProfileShell AND ProfileDeck edits as ONE task — see Step 4.

- [ ] **Step 4: Coordinate with Task 6 (deferred commit)**

DO NOT commit yet. ProfileShell and ProfileDeck are tightly coupled — leaving Shell broken between commits would crash the build. Continue to Task 6 immediately. Single commit at the end of Task 6 covers both files.

---

## Task 6: Strip pack-sequence overlay from ProfileDeck.tsx

**Files:**
- Modify: `nextjs/app/components/profile/ProfileDeck.tsx`

ProfileDeck (490 lines) renders the pack-flyin sequence as an overlay when `pack` is unopened, then the unlocked must-eats grid. Strip the pack-overlay path entirely; keep the unlocked-must-eats grid which is still useful (used by Plan 3's geofence reveal).

- [ ] **Step 1: Locate the pack-related imports + JSX**

```bash
grep -n "openWelcomePack\|BoosterPack\|pack\." "/Users/ersane/Downloads/Projekte/Eat This/nextjs/app/components/profile/ProfileDeck.tsx" | head -30
```

This gives you a map of pack-related touchpoints.

- [ ] **Step 2: Edit**

Remove:
- `import { openWelcomePack } from '@/lib/firebase/welcomePack'` (around line 12)
- `import type { BoosterPack } from '@/lib/firebase/usePack'` (around line 14)
- The `pack` prop from the component's props interface
- All conditional rendering branches based on `pack` (e.g., `{pack && !pack.opened && <PackOverlay ... />}`)
- The `openWelcomePack(...).catch(...)` block (lines ~137-142)
- Any state/refs that only exist to support the pack overlay (e.g., `packAnimationState`, refs to the fly-in cards)

Keep intact:
- The unlocked-must-eats grid render (driven by `useUnlockedMustEats`)
- Empty-state rendering (`if no unlocked must-eats: show CTA`)
- All other ProfileDeck UI (header, layout, scroll behavior)

- [ ] **Step 3: TypeScript check passes**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/nextjs" && npx tsc --noEmit 2>&1 | grep "ProfileDeck\|ProfileShell" | head
```

Expected: no errors specifically in these files. Pre-existing errors elsewhere are fine.

- [ ] **Step 4: Build passes**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/nextjs" && npm run build 2>&1 | tail -10
```

Expected: build succeeds. If module-not-found errors mention `@/lib/firebase/welcomePack` or `usePack`, you have stragglers in OTHER files. Find them:

```bash
grep -rn "from '@/lib/firebase/welcomePack\|from '@/lib/firebase/usePack" "/Users/ersane/Downloads/Projekte/Eat This/nextjs" --include="*.ts" --include="*.tsx"
```

Fix any remaining imports by either deleting them OR (if functionality is still needed) adding to the cleanup list. Realistically only ProfileShell + ProfileDeck should import these.

- [ ] **Step 5: Commit (covers Task 5 + Task 6)**

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" add nextjs/app/components/profile/ProfileShell.tsx nextjs/app/components/profile/ProfileDeck.tsx
git -C "/Users/ersane/Downloads/Projekte/Eat This" commit -m "profile: rip pack-sequence overlay + ensureWelcomePack call"
```

---

## Task 7: Delete welcomePack.ts and usePack.ts

**Files:**
- Delete: `nextjs/lib/firebase/welcomePack.ts`
- Delete: `nextjs/lib/firebase/usePack.ts`

Possible: tests for these files. Check first.

- [ ] **Step 1: Find any tests that reference these modules**

```bash
grep -rn "from '@/lib/firebase/welcomePack\|from '@/lib/firebase/usePack" "/Users/ersane/Downloads/Projekte/Eat This/nextjs/__tests__" 2>&1 | head
```

If any test files match, DELETE those test files too (the modules they test are about to be gone).

```bash
find "/Users/ersane/Downloads/Projekte/Eat This/nextjs/__tests__" -name "welcomePack*" -o -name "usePack*" | head
```

- [ ] **Step 2: Delete the source files**

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" rm nextjs/lib/firebase/welcomePack.ts nextjs/lib/firebase/usePack.ts
```

If Step 1 found test files, delete those too:

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" rm <path-to-each-test-file>
```

- [ ] **Step 3: Verify no remaining imports**

```bash
grep -rn "lib/firebase/welcomePack\|lib/firebase/usePack" "/Users/ersane/Downloads/Projekte/Eat This/nextjs" 2>&1 | head
```

Expected: no output. If any remain, find and fix them.

- [ ] **Step 4: Run full test suite + build**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/nextjs" && npx vitest run 2>&1 | tail -5
```

Expected: passes (modulo the 5 pre-existing failures noted in Plan 1).

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/nextjs" && npm run build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" commit -m "lib(firebase): delete welcomePack.ts + usePack.ts"
```

(Files are already staged from Step 2's `git rm`.)

---

## Task 8: Strip welcomePack from functions/index.js

**Files:**
- Modify: `functions/index.js`

Remove the 3 exports + 3 helpers tied to welcome pack provisioning. Trim `onUserCreate` to a minimal shell so it doesn't fail (kept as a hook point for future signup-time logic like analytics events).

- [ ] **Step 1: Read the relevant lines**

```bash
sed -n '83,160p' "/Users/ersane/Downloads/Projekte/Eat This/functions/index.js"
# ↑ provisionWelcomeForUid + helpers

sed -n '350,445p' "/Users/ersane/Downloads/Projekte/Eat This/functions/index.js"
# ↑ ensureWelcomePack + openPack + onUserCreate
```

- [ ] **Step 2: Find the other two helpers**

```bash
grep -n "function pickRandomMustEatsWithParents\|function parentRestaurantIdsOf" "/Users/ersane/Downloads/Projekte/Eat This/functions/index.js"
```

Note the line numbers.

- [ ] **Step 3: Edit — delete the following blocks (line numbers approximate)**

Delete:
- Lines ~85-148: `provisionWelcomeForUid` function + its leading comments
- The block of `pickRandomMustEatsWithParents` (find it via Step 2 line number)
- The block of `parentRestaurantIdsOf` (find it via Step 2 line number)
- Lines ~352-414: `exports.ensureWelcomePack` + `exports.openPack`
- Inside `onUserCreate` (around line 419): remove the legacy starter unlock block AND the `provisionWelcomeForUid` call. Leave `onUserCreate` as a thin shell that logs the signup and exits.

Result for `onUserCreate`:

```js
// On signup: future hook point — analytics, audience sync, etc.
// Plan 2 (2026-05-28) removed legacy starter unlock + welcomePack write.
exports.onUserCreate = require('firebase-functions/v1').auth.user().onCreate(async (user) => {
  logger.info('[onUserCreate] new user', user.uid, user.email);
});
```

- [ ] **Step 4: Lint check**

```bash
cd "/Users/ersane/Downloads/Projekte/Eat This/functions" && node -c index.js && echo "syntax ok"
```

Expected: `syntax ok`.

- [ ] **Step 5: Confirm no remaining references**

```bash
grep -n "welcomePack\|provisionWelcomeForUid\|pickRandomMustEats\|parentRestaurantIds\|userPacks\|/packs/" "/Users/ersane/Downloads/Projekte/Eat This/functions/index.js"
```

Expected: no output (or only comments).

- [ ] **Step 6: Commit**

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" add functions/index.js
git -C "/Users/ersane/Downloads/Projekte/Eat This" commit -m "functions: rip provisionWelcomeForUid + ensureWelcomePack + openPack"
```

---

## Task 9: Update firestore.rules

**Files:**
- Modify: `firestore.rules`

Remove the rule that allows `users/{uid}/packs/*` writes — that collection won't be written to anymore. Also remove any legacy `userPacks/*` rules if present.

- [ ] **Step 1: Find pack-related rule blocks**

```bash
grep -n "packs\|userPacks" "/Users/ersane/Downloads/Projekte/Eat This/firestore.rules"
```

- [ ] **Step 2: Edit firestore.rules**

Delete the rule blocks for:
- `match /users/{uid}/packs/{packId} { ... }` (around line 46)
- Any `match /userPacks/{uid}/packs/{packId} { ... }` if present

Leave intact:
- `match /users/{uid}/entitlements/{...}` — still used by Stripe purchases (and Plan 4's referral bonuses)
- `match /users/{uid}/unlockedMustEats/{...}` — geofence reveal state, used by Plan 3
- All other rules

- [ ] **Step 3: Verify the rules file still parses**

The Firebase emulator or `firebase deploy --only firestore:rules --dry-run` would validate, but for now a syntactic check is enough:

```bash
grep -c "^\s*match" "/Users/ersane/Downloads/Projekte/Eat This/firestore.rules"
```

Note the count. After your edit, that number should be smaller by however many `match` blocks you removed.

- [ ] **Step 4: Commit**

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" add firestore.rules
git -C "/Users/ersane/Downloads/Projekte/Eat This" commit -m "firestore-rules: drop packs/* — collection deprecated"
```

---

## Task 10: Write wipe-packs script

**Files:**
- Create: `scripts/wipe-packs-collection.mjs`

A one-shot Node script the operator runs after deploy. Deletes residual Firestore docs at `users/*/packs/*` and `userPacks/*`. Idempotent — safe to re-run.

- [ ] **Step 1: Check if scripts directory uses .mjs or .ts elsewhere**

```bash
ls "/Users/ersane/Downloads/Projekte/Eat This/scripts/" | head -10
```

Match the existing style. If TypeScript is standard there, write a `.ts`; if ESM `.mjs`, use that. (The setup-gh-labels.sh script is shell, doesn't matter here.)

- [ ] **Step 2: Create the script**

If the project uses ESM `.mjs` (most likely):

```js
// scripts/wipe-packs-collection.mjs
// One-shot: delete residual pack docs from Firestore after Plan 2 deploys.
// Idempotent — re-runnable. Requires GOOGLE_APPLICATION_CREDENTIALS or
// firebase login + admin SDK auto-discovery.
//
// Run: node scripts/wipe-packs-collection.mjs

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function deleteSubcollection(parentCollection, subcollection) {
  const parentSnap = await db.collection(parentCollection).get();
  let deleted = 0;
  for (const parentDoc of parentSnap.docs) {
    const subSnap = await parentDoc.ref.collection(subcollection).get();
    if (subSnap.empty) continue;
    const batch = db.batch();
    subSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += subSnap.size;
  }
  return deleted;
}

async function deleteRootCollection(name) {
  const snap = await db.collection(name).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

const usersPacks   = await deleteSubcollection('users', 'packs');
const userPacksRoot = await deleteRootCollection('userPacks');

console.log(`✓ deleted ${usersPacks} docs from users/*/packs`);
console.log(`✓ deleted ${userPacksRoot} docs from userPacks/* (root collection)`);
console.log('Done.');
process.exit(0);
```

- [ ] **Step 3: DO NOT run the script. It's operator-driven (and prod-affecting).**

- [ ] **Step 4: Commit**

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" add scripts/wipe-packs-collection.mjs
git -C "/Users/ersane/Downloads/Projekte/Eat This" commit -m "scripts(wipe-packs): one-shot to clear residual pack docs"
```

---

## Task 11: Operator runbook + cutover

**Files:**
- Create: `docs/runbooks/2026-05-28-plan-2-deploy.md`

Captures the manual steps the operator runs after Plan 2's PR lands on `main`: Sanity Studio deploy, Cloud Functions deploy, wipe-packs script run, Sanity curation.

- [ ] **Step 1: Write the runbook**

Create `docs/runbooks/2026-05-28-plan-2-deploy.md`:

```markdown
# Runbook — Plan 2 Cutover

**Prerequisites:** Plan 2 PR merged into `main`. Firebase + Sanity CLI authenticated.

## 1. Deploy Sanity Studio (new schema fields appear in Studio UI)

```bash
cd studio
npx sanity deploy
```

Verify in the Studio (eg. `studio.eatthisdot.com`):
- Open any Restaurant document → "Anon-Tier" + "Signed-Tier" booleans visible
- Open any Must-Eat document → "Anon-Demo" boolean visible

## 2. Deploy Cloud Functions (rip welcomePack handlers)

```bash
cd functions
firebase deploy --only functions
```

This removes `ensureWelcomePack` + `openPack` from prod and replaces `onUserCreate` with the new no-op shell.

Verify in Firebase Console → Functions:
- `ensureWelcomePack` and `openPack` should no longer be listed
- `onUserCreate` should be present (modified)

## 3. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

Verify in Firebase Console → Firestore → Rules tab that the `users/{uid}/packs/*` block is gone.

## 4. Wipe residual pack Firestore docs

```bash
cd /Users/ersane/Downloads/Projekte/Eat\ This
node scripts/wipe-packs-collection.mjs
```

Output should list how many docs were deleted across `users/*/packs` and `userPacks/*`. Zero is fine (already empty).

## 5. Curate the tier sets in Sanity Studio

Operator-paced task (no time pressure — Plan 3 is what reads these flags):

- Open Studio
- Pick **20 restaurants** with at least one Must Eat → flag `tierAnon: true`
- Pick **20 more restaurants** (disjoint from anon) → flag `tierSigned: true`
- Across the 20 anon-flagged restaurants, pick **10 Must-Eats** as the demo set → flag `revealedForAnon: true`

Validation: open a GROQ query
```
*[_type == "restaurant" && tierAnon == true] | { name }
```
expect ~20 results.

## 6. Sign off

When all steps green: Plan 2 is fully landed. Plan 3 (`/api/map-data` tier refactor) can start.
```

- [ ] **Step 2: Commit**

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" add docs/runbooks/2026-05-28-plan-2-deploy.md
git -C "/Users/ersane/Downloads/Projekte/Eat This" commit -m "docs(runbook): Plan 2 cutover steps"
```

---

## Task 12: Smoke on staging + PR to main

- [ ] **Step 1: Push staging branch**

```bash
git -C "/Users/ersane/Downloads/Projekte/Eat This" push origin staging
```

Pre-push hook runs full build. Wait for `✓ pre-push: build clean.`

Firebase auto-rolls out staging after the push.

- [ ] **Step 2: Wait for rollout + smoke test**

Wait ~5-10 min. Then:

```bash
curl -sI -u "$STAGING_USER:$STAGING_PASS" "https://eat-this-staging--eat-this-8a13b.us-central1.hosted.app/" | head -3
```

Expected: 200 with X-Robots-Tag still present.

Manual smoke (incognito):
- Login at staging URL with Basic Auth credentials
- Open profile page → should render WITHOUT errors, WITHOUT pack-sequence overlay
- Sign in with a test account (Magic Link) → flow completes, no Cloud Function error in console
- Map loads — still shows anon-trial 20 (Plan 3 hasn't refactored map-data yet)

- [ ] **Step 3: Open PR**

```bash
gh pr create --base main --head staging --title "Plan 2: Schema + Cleanup" --body "$(cat <<'BODY'
## Summary

Second of four plans for the Guest+20 migration. Lays the data foundation for the new tier model.

**Schema additions (Sanity):**
- `restaurant.tierAnon` — curated 20 anon-tier spots
- `restaurant.tierSigned` — curated 20 signed-tier spots
- `mustEat.revealedForAnon` — 10 demo must-eats shown open to anon

**Rip list:**
- `nextjs/lib/firebase/welcomePack.ts` (deleted)
- `nextjs/lib/firebase/usePack.ts` (deleted)
- Pack-sequence overlay in `ProfileDeck.tsx`
- `createWelcomePack` call in `ProfileShell.tsx`
- `'starter'` from `entitlements.ts` type union + reducer
- `ensureWelcomePack` + `openPack` Cloud Functions
- `provisionWelcomeForUid`, `pickRandomMustEatsWithParents`, `parentRestaurantIdsOf` helpers
- `users/{uid}/packs/*` Firestore rules
- Legacy starter unlock in `onUserCreate`

**Operator follow-up:**
- Deploy Sanity Studio + Functions + Firestore rules (see `docs/runbooks/2026-05-28-plan-2-deploy.md`)
- Run `scripts/wipe-packs-collection.mjs`
- Curate tier flags in Studio (operator-paced)

**Plan 3** (`/api/map-data` tier refactor) waits on the Sanity curation.

## Test plan
- [x] Vitest: entitlements tests updated, all passing
- [x] `npm run build` clean (pre-push hook verified)
- [x] Manual smoke on staging: profile renders without pack overlay, no console errors
- [ ] After merge: operator runs `docs/runbooks/2026-05-28-plan-2-deploy.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

- [ ] **Step 4: Operator merges + runs runbook**

Operator reviews PR, merges, then executes `docs/runbooks/2026-05-28-plan-2-deploy.md`.

---

## Open questions / known risks

- **Pre-existing failing tests (restaurant-prose, stripe-checkout):** Carried over from Plan 1. Plan 2 doesn't fix them. They're not regressions of this work.
- **Studio validation for "exactly 10 revealedForAnon must-eats":** Not enforced in this plan — just a description hint. Plan 3 can add a custom validation function if curation drift becomes an issue.
- **ProfileDeck size (490 lines):** Already-large file before Plan 2 trim. Task 6 reduces it; if the trimmed file is still doing too much, note as DONE_WITH_CONCERNS and we backlog a Plan 5 refactor.
- **`onUserCreate` left as a no-op shell:** Could be deleted entirely. Kept as a hook point so future signup-time logic (audience sync, analytics) has an obvious home. Costs ~zero per signup (no Firestore writes).

---

## Rollback plan

Plan 2's deletions are recoverable via `git revert` of the merge commit on `main`. Firestore data (deleted by the wipe script) is recoverable only via Firestore daily backups — verify backups are enabled BEFORE running the wipe script for the first time (Runbook Step 4 reminds the operator).

---

## After this plan

Operator curates the tier sets in Sanity (~20 + 20 + 10 flags). Once that's done, Plan 3 starts:
- `/api/map-data` refactor to tier-based filter
- `MustEatRevealOverlay` auth gate (only signed-in can reveal)
- Anon-map CSS: covered-state visually distinct
