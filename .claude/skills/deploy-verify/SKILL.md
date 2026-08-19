---
name: deploy-verify
description: Verify whether the latest Eat This deploy actually rolled out to App Hosting. Use after pushing to main / triggering a rollout, or when a deploy "looks stuck". Checks the backend timestamp (the source of truth) instead of polling page HTML, which lies because of the Firebase CDN edge cache.
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

## The one rule

**The backend "Updated Date" is the truth. Page-content / CSS-marker polls are NOT** — Firebase's CDN serves cached SSR HTML (old chunk URLs) for minutes to >20 min after a successful rollout. `-H "Cache-Control: no-cache"` does **not** reliably defeat the edge cache. A content poll that "still shows the old version" is the expected false alarm, not evidence of a stuck build.

**But read what the timestamp actually says: "a rollout landed", not "yours did."** One push, one rollout — there the two are the same sentence. A batch of merges is not: each merge fires its own rollout and App Hosting runs them **serially**, so the timestamp goes fresh when the FIRST one finishes while the rest are still queued. Stopping there reports the deploy as done for a commit several rollouts too early. Whenever more than one commit reached the branch, do step 2.

## Steps

1. **Check the backend timestamp:**

   ```bash
   # production
   firebase apphosting:backends:get eat-this --project eat-this-8a13b
   # staging
   firebase apphosting:backends:get eat-this-staging --project eat-this-staging-8a13b
   ```

   Read the **"Updated Date"** (shown in local TZ, UTC+2). If it's at/after when you pushed, **a** rollout succeeded — for a single push that is yours and you are done, for a batch of merges it is probably the first of several.

   A backend that has not finished yet still shows the **previous** rollout's date, which reads exactly like a stuck deploy. That is what step 4 is for — don't act on the first stale-looking read.

   `apphosting:rollouts:list <backendId>` does exist (this file used to claim otherwise), but it is the worse tool here:
   - without `-l/--location` it fails with `HTTP 400 … given collection path not supported for aggregated list`, and `--location` already warns that it is being removed in the next major release
   - the output is **not** sorted by time — on this backend the first entries were three weeks old among 597 rollouts, so "the latest rollout" means sorting `createTime` yourself

   Use it only when you need a rollout's `state` (`SUCCEEDED` / failed) or its build id. For the plain "did my push land" question, the backend timestamp answers it in one line.

2. **Several rollouts queued? Wait for the LAST one.** The list is not sorted, so sort it yourself and read the final entry's `state`:

   ```bash
   firebase apphosting:rollouts:list eat-this-staging --location us-central1 \
     --project eat-this-staging-8a13b > /tmp/ro.json
   python3 -c "
   import json, io
   raw = io.open('/tmp/ro.json').read(); d = json.loads(raw[raw.find('['):])
   for r in sorted(d, key=lambda r: r['createTime'])[-6:]:
       print(r['name'].split('/')[-1], r['createTime'], r['state'])"
   ```

   States run `QUEUED` → `PROGRESSING` → `SUCCEEDED`. Only the last entry's build carries the branch tip.

3. **Cross-check the commit** that is actually live — the one check neither the CDN nor a half-drained queue can fool. Take the last rollout's `build` id and read its source:

   ```bash
   firebase apphosting:builds:get eat-this-staging build-2026-08-19-005 \
     --location us-central1 --project eat-this-staging-8a13b
   ```

   `builds:get <backendId> <buildId>` takes both as **positional** arguments — there is no `--backend` flag, and passing one fails with `error: unknown option '--backend'`. The commit is at **`source.codebase.hash`** (with `.branch` and a `.uri` link beside it) — there is no top-level `commit` key to grep for. That hash equal to `git rev-parse origin/<branch>`, plus a top-level `state: READY`, is the actual "rolled out" evidence.

   Cheaper, when you only need "is the new build being served": grep a **server-served asset** for something the deploy changed — e.g. a selector it deleted from `globals.css`, absent in every linked `/_next/static/css/*.css`. This works where a page-content poll does not, because those files are content-hashed: a stale edge cache serves the old file under its old name, never the new name with old content.

4. **Decide if it's actually stuck:** only suspect a hang when _both_ (a) well past ~10 min have elapsed **and** (b) the backend "Updated Date" is still old. Budget the ~10 min **per rollout, not per push** — five queued rollouts took ~29 min end to end on staging (~6 min each) with nothing wrong. A fresh timestamp + stale page = CDN cache, not a hang. Do not trigger a redundant manual rollout on a content poll alone (this has happened — one redundant rollout was fired needlessly).

5. **Manual rollout (only if genuinely stuck):**
   ```bash
   firebase apphosting:rollouts:create eat-this -g "$(git rev-parse HEAD)" -f --project eat-this-8a13b
   ```
   The **full** SHA is required — short SHAs are rejected.

## Reminders

- Firestore rules changed? They need `firebase deploy --only firestore:rules` separately.
- Breaking stylesheet change? Bump `CSS_VERSION` in `nextjs/lib/constants.ts` — that is the `?v=` cache-bust on `style.min.css`. (There is no service worker in this app; don't go looking for `sw.js`.)
- Never `git push --no-verify` without explicit user instruction — the pre-push hook runs `npm run build:isolated` as a gate.

Report back: the backend Updated Date, whether it matches the expected commit/time, and a clear **rolled out / still building / stuck** verdict.
