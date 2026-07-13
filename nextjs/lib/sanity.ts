import 'server-only'
import { createClient } from '@sanity/client'
import { isStaging } from '@/lib/env'

const PRODUCTION_PROJECT_ID = 'ehwjnjr2'
const projectId = process.env.SANITY_PROJECT_ID ?? PRODUCTION_PROJECT_ID
const dataset = process.env.SANITY_DATASET ?? 'production'

if (
  isStaging &&
  (!process.env.SANITY_PROJECT_ID ||
    !process.env.SANITY_DATASET ||
    projectId === PRODUCTION_PROJECT_ID ||
    dataset === 'production')
) {
  throw new Error('Staging must use an isolated Sanity project and dataset')
}

// The read token is optional while the production dataset is public. It is
// intentionally server-only so the dataset can be switched to private without
// ever exposing that credential in browser bundles.
export const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: true,
  perspective: 'published',
  token: process.env.SANITY_API_READ_TOKEN,
})
