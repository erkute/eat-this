import { describe, expect, it } from 'vitest'

import {
  assertFirebaseProjectBoundary,
  PRODUCTION_FIREBASE_PROJECT_ID,
} from './project-boundary'

describe('Firebase project boundary', () => {
  it('accepts only the explicitly expected isolated staging project', () => {
    expect(() => assertFirebaseProjectBoundary({
      actualProjectId: 'eat-this-staging-isolated',
      expectedProjectId: 'eat-this-staging-isolated',
      staging: true,
      surface: 'client',
    })).not.toThrow()
  })

  it.each([
    { actualProjectId: 'eat-this-staging-isolated', expectedProjectId: undefined },
    { actualProjectId: PRODUCTION_FIREBASE_PROJECT_ID, expectedProjectId: 'eat-this-staging-isolated' },
    { actualProjectId: 'other-staging', expectedProjectId: 'eat-this-staging-isolated' },
    { actualProjectId: 'eat-this-staging-isolated', expectedProjectId: PRODUCTION_FIREBASE_PROJECT_ID },
  ])('fails closed for an unsafe staging binding: %o', (binding) => {
    expect(() => assertFirebaseProjectBoundary({
      ...binding,
      staging: true,
      surface: 'admin',
    })).toThrow()
  })

  it('also checks an explicitly configured production expectation', () => {
    expect(() => assertFirebaseProjectBoundary({
      actualProjectId: 'unexpected-project',
      expectedProjectId: PRODUCTION_FIREBASE_PROJECT_ID,
      staging: false,
      surface: 'admin',
    })).toThrow()
  })
})
