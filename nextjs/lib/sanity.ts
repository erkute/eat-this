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
  // CDN and plain API draw on separate plan quotas, and the CDN's is far larger
  // and cheaper. It is therefore the default everywhere; `SANITY_USE_CDN=false`
  // stays as the escape hatch for the day the CDN quota gives out
  // (plan_limit_reached → local dev and fresh ISR revalidates fail). Flip it
  // per environment, no code change.
  //
  // Do not pull that lever site-wide without checking the numbers: it moves all
  // live traffic onto the smaller meter. The big consumer is the builds, see
  // .github/workflows/quality.yml.
  useCdn: process.env.SANITY_USE_CDN !== 'false',
  // Without these two the client waits five minutes for a quiet socket
  // (@sanity/client's default), and the request occupies the instance the whole
  // time. 30 s is far above any response Sanity itself needs.
  //
  // The timer runs on this process, so it also fires when the process has no
  // CPU to read the answer: instances still in their warmup, with one vCPU that
  // Cloud Run throttles outside requests, need the slack.
  //
  // Retries cover 429/502/503 and network errors such as a dead TLS handshake
  // or a closed kept-alive socket. A timeout is not one of them: in the
  // react-server build of get-it it carries no `isNetworkError`, so it surfaces
  // after the first attempt, whatever `maxRetries` says.
  timeout: 30_000,
  maxRetries: 3,
  perspective: 'published',
  token: process.env.SANITY_API_READ_TOKEN,
});
