# Runbook — Stand up the `eat-this-staging` backend

**Owner:** the human operator (you).
**Estimated time:** ~30 minutes hands-on + 10-15 minutes waiting for Firebase rollouts.

Run these in order. Each block ends with a sanity check you should verify before moving to the next.

## 1. Create the `staging` branch

```bash
cd /Users/ersane/Downloads/Projekte/Eat\ This
git checkout main
git pull
git checkout -b staging
git push -u origin staging
```

Verify on GitHub: branch `staging` exists at github.com/erkute/eat-this/branches.

## 2. Create the App Hosting backend

The Firebase Console flow is simpler than the CLI for first backend creation. Open:

  https://console.firebase.google.com/project/eat-this-8a13b/apphosting

Click **Create backend** → select repo `erkute/eat-this` → choose branch `staging` → name `eat-this-staging` → region `us-central1` (matches prod). Confirm.

Wait for the first rollout to complete (5-10 min). The URL will look like:

  https://eat-this-staging--eat-this-8a13b.us-central1.hosted.app

It will currently 500 — `STAGING_BASIC_AUTH_*` secrets aren't set yet. That's expected.

Verify: `firebase apphosting:backends:list` shows both `eat-this` and `eat-this-staging`.

## 3. Set secrets on the staging backend

```bash
cd nextjs

# NEXT_PUBLIC_ENV — must be plain env var, not secret, on staging
# Edit apphosting.yaml manually if a second yaml is used, OR add via console:
#   Firebase Console → eat-this-staging → Environment → Add variable
#   variable: NEXT_PUBLIC_ENV  value: staging  availability: BUILD,RUNTIME

# Basic Auth credentials
openssl rand -hex 8 | firebase apphosting:secrets:set STAGING_BASIC_AUTH_USER --data-file -
openssl rand -hex 16 | firebase apphosting:secrets:set STAGING_BASIC_AUTH_PASS --data-file -

firebase apphosting:secrets:grantaccess STAGING_BASIC_AUTH_USER --backend eat-this-staging
firebase apphosting:secrets:grantaccess STAGING_BASIC_AUTH_PASS --backend eat-this-staging

# Stripe test-mode keys — from dashboard.stripe.com → Developers → API keys → Test mode
firebase apphosting:secrets:set STRIPE_SECRET_KEY_STAGING
# (paste the test sk_test_... key when prompted)
firebase apphosting:secrets:grantaccess STRIPE_SECRET_KEY_STAGING --backend eat-this-staging
```

Then reference these in `apphosting.yaml` for the staging backend — see step 4.

## 4. Per-backend apphosting.yaml

The single `nextjs/apphosting.yaml` applies to all backends by default. To override per backend, App Hosting reads `apphosting.<backend-id>.yaml` if present. Create:

```bash
cp nextjs/apphosting.yaml nextjs/apphosting.eat-this-staging.yaml
```

Edit `nextjs/apphosting.eat-this-staging.yaml`:

- Change `NEXT_PUBLIC_ENV` value from `production` to `staging`
- Replace `secret: STRIPE_SECRET_KEY` with `secret: STRIPE_SECRET_KEY_STAGING` (test mode key)
- Add the two Basic Auth secret references:

  ```yaml
  - variable: STAGING_BASIC_AUTH_USER
    secret: STAGING_BASIC_AUTH_USER
    availability: [RUNTIME]
  - variable: STAGING_BASIC_AUTH_PASS
    secret: STAGING_BASIC_AUTH_PASS
    availability: [RUNTIME]
  ```

- Remove `RESEND_*` env entries entirely — staging doesn't send mail

Commit:

```bash
git add nextjs/apphosting.eat-this-staging.yaml
git commit -m "infra(apphosting): staging backend overrides"
git push origin staging
```

A new rollout fires automatically. Wait for it to complete.

## 5. Register the staging Stripe webhook

In the Stripe Dashboard (TEST mode toggled on, top-right):

  Developers → Webhooks → Add endpoint

- URL: `https://eat-this-staging--eat-this-8a13b.us-central1.hosted.app/api/stripe/webhook`
- Events: same set as the live webhook (copy from live config)
- After creating, click **Reveal signing secret** → copy the `whsec_...` value

Then:

```bash
firebase apphosting:secrets:set STRIPE_WEBHOOK_SECRET_STAGING --data-file=- <<<"whsec_..."
firebase apphosting:secrets:grantaccess STRIPE_WEBHOOK_SECRET_STAGING --backend eat-this-staging
```

Update `nextjs/apphosting.eat-this-staging.yaml` to reference `STRIPE_WEBHOOK_SECRET_STAGING` instead of `STRIPE_WEBHOOK_SECRET`. Commit + push staging → new rollout.

## 6. Smoke test the Basic Auth gate

Open in incognito:

  https://eat-this-staging--eat-this-8a13b.us-central1.hosted.app

Expected: browser prompts for username/password. Enter the values from step 3.

After successful auth, verify that the authenticated response includes
`X-Robots-Tag: noindex, nofollow`. There is no visible staging banner.

## 7. Create GitHub Project + Migration milestone

```bash
# Create the project
gh project create --owner erkute --title "Eat This"

# Note the project number from output (probably #1)
PROJECT_NUM=1

# Create the milestone
gh api -X POST repos/erkute/eat-this/milestones \
  -f title="Guest+20 Migration" \
  -f description="Tier-based access model + referrals" \
  -f due_on="2026-06-10T23:59:59Z"
```

Then in the GitHub UI for the project:
- Add columns: Backlog, Up Next, In Progress, In Review, Done
- Set the auto-add-to-project workflow: "When an issue is opened in erkute/eat-this → add to project"

## 8. Branch protection on `main`

```bash
gh api -X PUT repos/erkute/eat-this/branches/main/protection \
  -F required_pull_request_reviews.required_approving_review_count=0 \
  -F enforce_admins=false \
  -F required_status_checks=null \
  -F restrictions=null \
  -F allow_force_pushes=false \
  -F allow_deletions=false
```

This blocks direct pushes to `main` — all changes must come via PR (typically from `staging`).

## 9. Done

You now have:
- Two App Hosting backends (`eat-this` live on `main`, `eat-this-staging` on `staging`)
- Staging URL behind Basic Auth
- Staging Stripe in test mode with its own webhook
- GitHub Project board + Migration milestone wired up
- Branch protection on `main`

Next: Plan 2 takes over with Sanity schema changes + welcomePack cleanup.
