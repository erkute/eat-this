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
  perspective: 'published',
  token: process.env.SANITY_API_READ_TOKEN,
});
