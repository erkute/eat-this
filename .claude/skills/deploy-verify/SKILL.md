---
name: deploy-verify
description: Verify whether the latest Eat This deploy actually rolled out to App Hosting. Use after pushing to main / triggering a rollout, or when a deploy "looks stuck". Checks rollout status and the associated source commit; backend timestamps and cached page HTML alone do not prove deployment.
disable-model-invocation: true
---

# Deploy Verify (Eat This)

The job: confirm a rollout finished, **without** being fooled by the CDN edge cache.

## Project facts

- **Two separate Firebase projects.** Production and staging are not two backends in one project — `lib/firebase/project-boundary.ts` actively rejects the production project ID on staging, and the old staging backend inside the production project was deleted.

  | Branch    | Firebase project         | Backend            | URL                                                |
  | --------- | ------------------------ | ------------------ | -------------------------------------------------- |
  | `main`    | `eat-this-8a13b`         | `eat-this`         | `https://www.eatthisdot.com`                       |
  | `staging` | `eat-this-staging-8a13b` | `eat-this-staging` | `…--eat-this-staging-8a13b.us-central1.hosted.app` |

  Both region `us-central1`. Staging is Basic-Auth gated + `noindex`.

- **Always pass `--project` explicitly.** A backend name alone resolves against whatever project is active, and the two projects have same-shaped backends — the wrong pair silently reports the wrong timestamp.
- Push to `main` → production auto-builds `nextjs/` (~3–10 min typical). Push to `staging` → the staging backend. Flow is feature branch → PR into `staging` → PR into `main`, so confirm **which** backend you are verifying before reading a timestamp.
- Firestore rules and Sanity Studio deploy **separately** (not via git push).

## Evidence required (updated 2026-09-30)

A backend timestamp is a progress signal, not proof that the expected commit
is serving. Confirm the relevant rollout is `SUCCEEDED`, then verify its
associated build is `READY` and `source.codebase.hash` matches the expected
full commit SHA. Do this for a single push as well as queued rollouts.

Page content and CSS checks are useful smoke tests after rollout verification.
CDN caches can retain old HTML; a content mismatch alone does not establish a
failed rollout. The user's live confirmation and a Git comparison must not be
reported as an independently verified App Hosting rollout.

## Steps

1. **Check the backend timestamp:**

   ```bash
   # production
   firebase apphosting:backends:get eat-this --project eat-this-8a13b
   # staging
   firebase apphosting:backends:get eat-this-staging --project eat-this-staging-8a13b
   ```

   Read the **"Updated Date"** and its timezone. A recent value is a reason to inspect the rollout, not to report success. Continue with steps 2 and 3 for every deployment.

   A backend that has not finished yet still shows the **previous** rollout's date, which reads exactly like a stuck deploy. That is what step 4 is for — don't act on the first stale-looking read.

   Earlier runs of `apphosting:rollouts:list <backendId>` exposed two CLI details:
   - without `-l/--location` it fails with `HTTP 400 … given collection path not supported for aggregated list`, and `--location` already warns that it is being removed in the next major release
   - the output is **not** sorted by time — on this backend the first entries were three weeks old among 597 rollouts, so "the latest rollout" means sorting `createTime` yourself

   Use the rollout state and associated build ID to establish which commit landed. CLI flags may differ by installed version; consult local `--help` if the examples are rejected.

2. **Find the rollout for the expected commit.** The list is not sorted, so sort it by `createTime`, inspect the recent entries, and match the associated build in step 3:

   ```bash
   firebase apphosting:rollouts:list eat-this-staging --location us-central1 \
     --project eat-this-staging-8a13b > /tmp/ro.json
   python3 -c "
   import json, io
   raw = io.open('/tmp/ro.json').read(); d = json.loads(raw[raw.find('['):])
   for r in sorted(d, key=lambda r: r['createTime'])[-6:]:
       print(r['name'].split('/')[-1], r['createTime'], r['state'])"
   ```

   States run `QUEUED` → `PROGRESSING` → `SUCCEEDED`. Do not assume the last entry carries the branch tip: verify its build hash. A newer push may have arrived during the check.

3. **Cross-check the commit** that is actually live — the one check neither the CDN nor a half-drained queue can fool. Take the selected rollout's `build` id and read its source (replace the illustrative build ID below):

   ```bash
   firebase apphosting:builds:get eat-this-staging build-2026-08-19-005 \
     --location us-central1 --project eat-this-staging-8a13b
   ```

   `builds:get <backendId> <buildId>` takes both as **positional** arguments — there is no `--backend` flag, and passing one fails with `error: unknown option '--backend'`. The commit is at **`source.codebase.hash`** (with `.branch` and a `.uri` link beside it) — there is no top-level `commit` key to grep for. That hash must equal the expected full commit SHA. A build in `READY` alone is insufficient: its associated rollout must also be `SUCCEEDED`.

   Additional smoke evidence, after checking the rollout and build: grep a **server-served asset** for something the deploy changed — e.g. a selector it deleted from `globals.css`, absent in every linked `/_next/static/css/*.css`. This works where a page-content poll does not, because those files are content-hashed: a stale edge cache serves the old file under its old name, never the new name with old content.

4. **Decide if it's actually stuck:** only suspect a hang when _both_ (a) well past ~10 min have elapsed **and** (b) the backend "Updated Date" is still old. Budget the ~10 min **per rollout, not per push** — five queued rollouts took ~29 min end to end on staging (~6 min each) with nothing wrong. A fresh timestamp with stale page content can be a cache effect; inspect rollout state and logs before concluding that the build is stuck. Do not trigger a redundant manual rollout on a content poll alone (this has happened — one redundant rollout was fired needlessly).

5. **Manual rollout (only if genuinely stuck):**
   ```bash
   firebase apphosting:rollouts:create eat-this -g "$(git rev-parse origin/main)" -f --project eat-this-8a13b
   ```
   Fetch the remote refs first and verify the target environment. The **full** SHA is required — short SHAs are rejected. Use the intended production commit, never an unrelated local feature-branch HEAD.

## Reminders

- Firestore rules changed? Deploy separately with an explicit project: `firebase deploy --only firestore:rules --project eat-this-8a13b` for production, or `--project eat-this-staging-8a13b` for staging.
- Stylesheets are built through Next.js and CSS modules. The former `CSS_VERSION` / `style.min.css` instruction is obsolete; do not recreate that mechanism.
- Never `git push --no-verify` without explicit user instruction — the pre-push hook runs `npm run build:isolated` as a gate.

Report the target environment, rollout state, associated build state and source SHA, and whether they match the expected commit. State **rolled out / still building / failed / unverified**, then report smoke-test results separately. A timestamp alone is not a success verdict.
