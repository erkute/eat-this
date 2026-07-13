import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

const { createSessionCookie, verifySessionCookie } = vi.hoisted(() => ({
  createSessionCookie: vi.fn(),
  verifySessionCookie: vi.fn(),
}))
vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ createSessionCookie, verifySessionCookie }),
}))

import {
  clearPremiumSessionCookie,
  premiumSessionCookieName,
  readPremiumSessionUid,
  setPremiumSessionCookie,
} from './premium-session'

beforeEach(() => {
  vi.clearAllMocks()
  createSessionCookie.mockResolvedValue('firebase-session')
  verifySessionCookie.mockResolvedValue({ uid: 'user-1' })
})

describe('Premium Firebase session binding', () => {
  it('exchanges an ID token for an HttpOnly session cookie', async () => {
    const response = NextResponse.json({ ok: true })
    await setPremiumSessionCookie(response, 'firebase-id-token')

    expect(createSessionCookie).toHaveBeenCalledWith('firebase-id-token', {
      expiresIn: 60 * 60 * 1000,
    })
    expect(response.cookies.get(premiumSessionCookieName())?.value).toBe('firebase-session')
  })

  it('returns only a verified session uid and clears the cookie', async () => {
    await expect(readPremiumSessionUid('firebase-session')).resolves.toBe('user-1')
    verifySessionCookie.mockRejectedValueOnce(new Error('invalid'))
    await expect(readPremiumSessionUid('invalid-session')).resolves.toBeNull()

    const response = NextResponse.json({ ok: true })
    clearPremiumSessionCookie(response)
    expect(response.cookies.get(premiumSessionCookieName())?.value).toBe('')
  })
})
