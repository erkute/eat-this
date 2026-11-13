import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  clearAccess: vi.fn(),
  belongsTo: vi.fn(),
  clearSession: vi.fn(),
  setSession: vi.fn(),
}))

vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken: mocks.verifyIdToken }),
}))
vi.mock('@/lib/must-eat/premium-access', () => ({
  clearPremiumAccessCookie: mocks.clearAccess,
  premiumAccessBelongsTo: mocks.belongsTo,
  premiumAccessCookieName: () => 'et_premium_access',
}))
vi.mock('@/lib/must-eat/premium-session', () => ({
  clearPremiumSessionCookie: mocks.clearSession,
  setPremiumSessionCookie: mocks.setSession,
}))

import { DELETE, POST } from '@/app/api/auth/premium-access/route'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.verifyIdToken.mockResolvedValue({ uid: 'user-1' })
  mocks.setSession.mockResolvedValue(undefined)
})

describe('/api/auth/premium-access', () => {
  it('clears a capability that belongs to another account and sets a verified session', async () => {
    mocks.belongsTo.mockReturnValue(false)
    const response = await POST(new NextRequest('https://example.com/api/auth/premium-access', {
      method: 'POST',
      headers: { authorization: 'Bearer firebase-id-token', cookie: 'et_premium_access=other-account' },
    }))

    expect(response.status).toBe(200)
    expect(mocks.verifyIdToken).toHaveBeenCalledWith('firebase-id-token', true)
    expect(mocks.belongsTo).toHaveBeenCalledWith('other-account', 'user-1')
    expect(mocks.clearAccess).toHaveBeenCalledOnce()
    expect(mocks.setSession).toHaveBeenCalledWith(expect.anything(), 'firebase-id-token')
  })

  it('keeps this account\'s capability, which /api/map-data may set in parallel', async () => {
    mocks.belongsTo.mockReturnValue(true)
    const response = await POST(new NextRequest('https://example.com/api/auth/premium-access', {
      method: 'POST',
      headers: { authorization: 'Bearer firebase-id-token', cookie: 'et_premium_access=same-account' },
    }))

    expect(response.status).toBe(200)
    expect(mocks.clearAccess).not.toHaveBeenCalled()
    expect(mocks.setSession).toHaveBeenCalledOnce()
  })

  it('leaves the capability cookie alone when the request carries none', async () => {
    const response = await POST(new NextRequest('https://example.com/api/auth/premium-access', {
      method: 'POST',
      headers: { authorization: 'Bearer firebase-id-token' },
    }))

    expect(response.status).toBe(200)
    expect(mocks.clearAccess).not.toHaveBeenCalled()
    expect(mocks.setSession).toHaveBeenCalledOnce()
  })

  it('rejects invalid identity transitions', async () => {
    mocks.verifyIdToken.mockRejectedValueOnce(new Error('invalid'))
    const response = await POST(new NextRequest('https://example.com/api/auth/premium-access', {
      method: 'POST',
      headers: { authorization: 'Bearer invalid' },
    }))

    expect(response.status).toBe(401)
    expect(mocks.clearAccess).not.toHaveBeenCalled()
    expect(mocks.setSession).not.toHaveBeenCalled()
  })

  it('clears both cookies without an unread response body on logout', async () => {
    const response = await DELETE()
    expect(response.status).toBe(204)
    expect(response.body).toBeNull()
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(mocks.clearAccess).toHaveBeenCalledExactlyOnceWith(response)
    expect(mocks.clearSession).toHaveBeenCalledExactlyOnceWith(response)
  })
})


it.each(['auth/id-token-revoked', 'auth/user-disabled'])(
  'does not mint a session for %s', async (code) => {
    mocks.verifyIdToken.mockImplementation(async (_token, checkRevoked) => {
      if (checkRevoked) throw { code };
      return { uid: 'user-1' };
    });
    const response = await POST(new NextRequest('https://example.com/api/auth/premium-access', {
      method: 'POST', headers: { authorization: 'Bearer old-token' },
    }));
    expect(response.status).toBe(401);
    expect(mocks.setSession).not.toHaveBeenCalled();
  }
);
