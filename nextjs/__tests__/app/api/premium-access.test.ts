import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  clearAccess: vi.fn(),
  clearSession: vi.fn(),
  setSession: vi.fn(),
}))

vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken: mocks.verifyIdToken }),
}))
vi.mock('@/lib/must-eat/premium-access', () => ({
  clearPremiumAccessCookie: mocks.clearAccess,
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
  it('atomically clears the prior capability and sets a verified session', async () => {
    const response = await POST(new Request('https://example.com/api/auth/premium-access', {
      method: 'POST',
      headers: { authorization: 'Bearer firebase-id-token' },
    }))

    expect(response.status).toBe(200)
    expect(mocks.verifyIdToken).toHaveBeenCalledWith('firebase-id-token')
    expect(mocks.clearAccess).toHaveBeenCalledOnce()
    expect(mocks.setSession).toHaveBeenCalledWith(expect.anything(), 'firebase-id-token')
  })

  it('rejects invalid identity transitions', async () => {
    mocks.verifyIdToken.mockRejectedValueOnce(new Error('invalid'))
    const response = await POST(new Request('https://example.com/api/auth/premium-access', {
      method: 'POST',
      headers: { authorization: 'Bearer invalid' },
    }))

    expect(response.status).toBe(401)
    expect(mocks.clearAccess).not.toHaveBeenCalled()
    expect(mocks.setSession).not.toHaveBeenCalled()
  })

  it('clears both cookies on logout', async () => {
    const response = await DELETE()
    expect(response.status).toBe(200)
    expect(mocks.clearAccess).toHaveBeenCalledOnce()
    expect(mocks.clearSession).toHaveBeenCalledOnce()
  })
})
