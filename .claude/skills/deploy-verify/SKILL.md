---
name: deploy-verify
description: Verify whether the latest Eat This deploy actually rolled out to App Hosting. Use after pushing to main / triggering a rollout, or when a deploy "looks stuck". Checks the backend timestamp (the source of truth) instead of polling page HTML, which lies because of the Firebase CDN edge cache.
disable-model-invocation: true
---

# Deploy Verify (Eat This)

The job: confirm a rollout finished, **without** being fooled by the CDN edge cache.

## Project facts

- **Two separate Firebase projects.** Production and staging are not two backends in one project — `lib/firebase/project-boundary.ts` actively rejects the production project ID on staging, and the old staging backend inside the production project was deleted.

  | Branch | Firebase project | Backend | URL |
  | --- | --- | --- | --- |
  | `main` | `eat-this-8a13b` | `eat-this` | `https://www.eatthisdot.com` |
  | `staging` | `eat-this-staging-8a13b` | `eat-this-staging` | `…--eat-this-staging-8a13b.us-central1.hosted.app` |

  Both region `us-central1`. Staging is Basic-Auth gated + `noindex`.
- **Always pass `--project` explicitly.** A backend name alone resolves against whatever project is active, and the two projects have same-shaped backends — the wrong pair silently reports the wrong timestamp.
- Push to `main` → production auto-builds `nextjs/` (~3–10 min typical). Push to `staging` → the staging backend. Flow is feature branch → PR into `staging` → PR into `main`, so confirm **which** backend you are verifying before reading a timestamp.
- Firestore rules and Sanity Studio deploy **separately** (not via git push).

## The one rule

**The backend "Updated Date" is the truth. Page-content / CSS-marker polls are NOT** — Firebase's CDN serves cached SSR HTML (old chunk URLs) for minutes to >20 min after a successful rollout. `-H "Cache-Control: no-cache"` does **not** reliably defeat the edge cache. A content poll that "still shows the old version" is the expected false alarm, not evidence of a stuck build.

## Steps

1. **Check the backend timestamp:**
   ```bash
   # production
   firebase apphosting:backends:get eat-this --project eat-this-8a13b
   # staging
   firebase apphosting:backends:get eat-this-staging --project eat-this-staging-8a13b
   ```
   Read the **"Updated Date"** (shown in local TZ, UTC+2). If it's at/after when you pushed, the latest rollout succeeded — you're done. There is **no** `apphosting:rollouts:list` command in the CLI; don't look for it.

2. **Cross-check the commit** that's live, if needed: compare the deployed revision against `git rev-parse HEAD`.

3. **Decide if it's actually stuck:** only suspect a hang when *both* (a) well past ~10 min have elapsed **and** (b) the backend "Updated Date" is still old. A fresh timestamp + stale page = CDN cache, not a hang. Do not trigger a redundant manual rollout on a content poll alone (this has happened — one redundant rollout was fired needlessly).

4. **Manual rollout (only if genuinely stuck):**
   ```bash
   firebase apphosting:rollouts:create eat-this -g "$(git rev-parse HEAD)" -f --project eat-this-8a13b
   ```
   The **full** SHA is required — short SHAs are rejected.

## Reminders

- Firestore rules changed? They need `firebase deploy --only firestore:rules` separately.
- Breaking stylesheet change? Bump `CSS_VERSION` in `nextjs/lib/constants.ts` — that is the `?v=` cache-bust on `style.min.css`. (There is no service worker in this app; don't go looking for `sw.js`.)
- Never `git push --no-verify` without explicit user instruction — the pre-push hook runs `npm run build:isolated` as a gate.

Report back: the backend Updated Date, whether it matches the expected commit/time, and a clear **rolled out / still building / stuck** verdict.
