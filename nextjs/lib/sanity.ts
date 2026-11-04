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
  // CDN measure 0,12–0,46 s (16.09. and 04.11.2026), so 10 s is far above any
  // response Sanity itself needs.
  //
  // The timer runs on this process, though, so it also fires when the process
  // has no CPU to read the answer: 92 % of the ESOCKETTIMEDOUT logged between
  // 25.10. and 04.11.2026 fell on instances still in their warmup, which Cloud
  // Run throttles (`cpuIdle: true`) (Sentry JAVASCRIPT-AH).
  //
  // Retries cover 429/502/503 and network errors such as a dead TLS handshake
  // or a closed kept-alive socket (Sentry JAVASCRIPT-5/2E/6J). A timeout is NOT
  // one of them: in the react-server build of get-it it carries no
  // `isNetworkError`, so it surfaces after the first attempt, whatever
  // `maxRetries` says (measured against a silent socket, 04.11.2026).
  timeout: 10_000,
  maxRetries: 3,
  perspective: 'published',
  token: process.env.SANITY_API_READ_TOKEN,
});
