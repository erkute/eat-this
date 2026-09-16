import 'server-only';
import { createClient } from '@sanity/client';
import { isStaging } from '@/lib/env';

const PRODUCTION_PROJECT_ID = 'ehwjnjr2';
const projectId = process.env.SANITY_PROJECT_ID ?? PRODUCTION_PROJECT_ID;
const dataset = process.env.SANITY_DATASET ?? 'production';

if (
  isStaging &&
  (!process.env.SANITY_PROJECT_ID ||
    !process.env.SANITY_DATASET ||
    projectId === PRODUCTION_PROJECT_ID ||
    dataset === 'production')
) {
  throw new Error('Staging must use an isolated Sanity project and dataset');
}

// The read token is optional while the production dataset is public. It is
// intentionally server-only so the dataset can be switched to private without
// ever exposing that credential in browser bundles.
export const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  // CDN and plain API draw on SEPARATE plan quotas: 1.000.000 vs. 250.000
  // requests, and overage costs $1 per 250.000 vs. $1 per 25.000. The CDN is
  // therefore the default everywhere — four times the room at a tenth of the
  // price — and `SANITY_USE_CDN=false` stays purely as the escape hatch for
  // the day the CDN quota is the one that gives out (24.08.2026:
  // plan_limit_reached → local dev and fresh ISR revalidates failed). Flip it
  // per environment, no code change.
  //
  // Do not pull that lever site-wide again without checking the numbers first:
  // on 27.08.2026 it moved the whole live traffic onto the smaller meter and
  // emptied it in three days. The real driver was never the traffic — it was
  // ~50 CI builds a day at 952 requests each, see .github/workflows/quality.yml.
  useCdn: process.env.SANITY_USE_CDN !== 'false',
  // Without these two the client waits FIVE MINUTES for a socket that has gone
  // quiet (@sanity/client's default) — far past anything a render can use, and
  // the request occupies the instance the whole time. Real queries against the
  // CDN measure 0,12–0,31 s (16.09.2026, restaurant page + all-slugs, three
  // runs each), so 10 s is ~30x the slowest observed response and only fires
  // when the connection is actually dead, not when Sanity is merely slow.
  //
  // The failures this bounds are transport-level, not Sanity being down: a TLS
  // handshake that dies 20 s into a cold start, or a kept-alive socket the far
  // side already closed (Sentry JAVASCRIPT-5/2E/6J and siblings). Retries for
  // those already exist — get-it retries idempotent GETs on network errors —
  // so the retry count is a ceiling, not a new safety net: 4 attempts × 10 s
  // plus backoff stays under a minute instead of piling up to 5 minutes each.
  timeout: 10_000,
  maxRetries: 3,
  perspective: 'published',
  token: process.env.SANITY_API_READ_TOKEN,
});
