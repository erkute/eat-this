export const PRODUCTION_FIREBASE_PROJECT_ID = 'eat-this-8a13b'

export function assertFirebaseProjectBoundary(options: {
  actualProjectId: string | undefined
  expectedProjectId: string | undefined
  staging: boolean
  surface: 'admin' | 'client'
}): void {
  const { actualProjectId, expectedProjectId, staging, surface } = options

  if (staging) {
    if (!expectedProjectId) {
      throw new Error(`Staging ${surface} Firebase expected project is not configured`)
    }
    if (
      expectedProjectId === PRODUCTION_FIREBASE_PROJECT_ID ||
      actualProjectId === PRODUCTION_FIREBASE_PROJECT_ID
    ) {
      throw new Error(`Staging ${surface} Firebase resolved the production project`)
    }
  }

  if (expectedProjectId && actualProjectId !== expectedProjectId) {
    throw new Error(`Firebase ${surface} project does not match the expected project`)
  }
}
