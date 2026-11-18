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
  // price — and `SANITY_USE_CDN=false` stays purely as the escape hatch for the
  // day the CDN quota is the one that gives out (plan_limit_reached → local dev
  // and fresh ISR revalidates fail). Flip it per environment, no code change.
  //
  // Do not pull that lever site-wide without checking the numbers first: it
  // moves the whole live traffic onto the smaller meter, which empties within
  // days. The big consumer is not the traffic but the builds, see
  // .github/workflows/quality.yml.
  useCdn: process.env.SANITY_USE_CDN !== 'false',
  // Without these two the client waits FIVE MINUTES for a socket that has gone
  // quiet (@sanity/client's default) — far past anything a render can use, and
  // the request occupies the instance the whole time. Real queries against the
  // CDN take 0,12–0,46 s, so 30 s is far above any response Sanity itself
  // needs.
  //
  // The timer runs on this process, though, so it also fires when the process
  // has no CPU to read the answer: most ESOCKETTIMEDOUT fall on instances still
  // in their warmup, with one vCPU that Cloud Run throttles outside requests.
  // In a local build with its CPU throttled to 5 %, 36 of 36 pages fail at 10 s
  // and none at 30 s.
  //
  // Retries cover 429/502/503 and network errors such as a dead TLS handshake
  // or a closed kept-alive socket. A timeout is NOT one of them: in the
  // react-server build of get-it it carries no `isNetworkError`, so it surfaces
  // after the first attempt, whatever `maxRetries` says.
  timeout: 30_000,
  maxRetries: 3,
  perspective: 'published',
  token: process.env.SANITY_API_READ_TOKEN,
});
