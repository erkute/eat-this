const PRODUCTION_PROJECT_ID = 'ehwjnjr2'
const PRODUCTION_DATASET = 'production'

const environment = process.env.SANITY_STUDIO_ENV
const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET

if (!['production', 'staging'].includes(environment)) {
  throw new Error('SANITY_STUDIO_ENV must be explicitly set to production or staging')
}
if (!projectId || !dataset) {
  throw new Error('SANITY_STUDIO_PROJECT_ID and SANITY_STUDIO_DATASET are required')
}
if (
  environment === 'staging' &&
  (projectId === PRODUCTION_PROJECT_ID || dataset === PRODUCTION_DATASET)
) {
  throw new Error('Staging Studio cannot use the production Sanity target')
}
if (
  environment === 'production' &&
  (projectId !== PRODUCTION_PROJECT_ID || dataset !== PRODUCTION_DATASET)
) {
  throw new Error('Production Studio target does not match the canonical Sanity target')
}

export const sanityTarget = { projectId, dataset }
