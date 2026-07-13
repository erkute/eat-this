import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createPremiumAccessToken,
  readPremiumAccessToken,
} from './premium-access'

describe('premium access capability', () => {
  beforeEach(() => {
    vi.stubEnv('PREMIUM_ACCESS_SIGNING_KEY', 'test-signing-key-with-enough-entropy')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('round-trips a deduplicated, sorted ID set', () => {
    const token = createPremiumAccessToken(['m2', 'm1', 'm2'], 'user-1', {
      nowMs: 1_000_000,
      ttlSeconds: 60,
    })

    expect([...readPremiumAccessToken(token, 'user-1', 1_030_000)]).toEqual(['m1', 'm2'])
    expect(readPremiumAccessToken(token, 'user-2', 1_030_000)).toEqual(new Set())
  })

  it('rejects tampering and expiry', () => {
    const token = createPremiumAccessToken(['m1'], 'user-1', {
      nowMs: 1_000_000,
      ttlSeconds: 60,
    })
    const [payload, mac] = token.split('.')

    expect(readPremiumAccessToken(`${payload}x.${mac}`, 'user-1', 1_010_000)).toEqual(new Set())
    expect(readPremiumAccessToken(token, 'user-1', 1_061_000)).toEqual(new Set())
  })
})
