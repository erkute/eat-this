import { describe, it, expect } from 'vitest'
import { buildReferralLink } from '@/lib/referral/link'

describe('buildReferralLink', () => {
  it('builds a direct-www link carrying the ref param', () => {
    expect(buildReferralLink('abc123XYZ')).toBe('https://www.eatthisdot.com/?ref=abc123XYZ')
  })
})
