import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAdminFirestore: vi.fn(),
}))

vi.mock('./firebase/admin', () => ({
  getAdminFirestore: mocks.getAdminFirestore,
}))
vi.mock('firebase-admin/firestore', () => ({
  Timestamp: { fromMillis: vi.fn((value: number) => value) },
}))

import { checkRateLimit, checkRateLimitFailClosed } from './rateLimit'

describe('rate limit failure policies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the legacy limiter fail-open for authentication paths', async () => {
    mocks.getAdminFirestore.mockImplementation(() => {
      throw new Error('firestore unavailable')
    })

    await expect(checkRateLimit('login:test', 1, 1000)).resolves.toBe(true)
  })

  it('fails closed for cost-sensitive operations', async () => {
    mocks.getAdminFirestore.mockImplementation(() => {
      throw new Error('firestore unavailable')
    })

    await expect(checkRateLimitFailClosed('import:test', 1, 1000)).resolves.toBe(false)
  })
})
