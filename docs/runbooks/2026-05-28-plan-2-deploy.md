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

⚠️ **Backup first.** Firestore daily exports must be enabled in GCP Console (Firestore → Backups & Recovery → Daily backups) before running this. If they aren't, do that first — the wipe is otherwise irreversible.

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
