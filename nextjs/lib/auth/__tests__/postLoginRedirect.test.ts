// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  doc:    vi.fn((_db, ...path) => ({ path: path.join('/') })),
  getDoc: vi.fn(),
}))
vi.mock('@/lib/firebase/config', () => ({ db: {} }))

import { getDoc } from 'firebase/firestore'
import { postLoginRedirect } from '../postLoginRedirect'

function makeRouter() {
  return { replace: vi.fn(), push: vi.fn() }
}

describe('postLoginRedirect', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('routes to /onboarding when user doc is missing (DE)', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false, data: () => undefined } as never)
    const router = makeRouter()
    await postLoginRedirect('u1', router as never, 'de')
    expect(router.replace).toHaveBeenCalledWith('/onboarding')
  })

  it('routes to /onboarding when onboardedAt is null (DE)', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ avatar: 1, onboardedAt: null }),
    } as never)
    const router = makeRouter()
    await postLoginRedirect('u1', router as never, 'de')
    expect(router.replace).toHaveBeenCalledWith('/onboarding')
  })

  it('routes to /profile when onboardedAt is set (DE)', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ onboardedAt: { toDate: () => new Date() } }),
    } as never)
    const router = makeRouter()
    await postLoginRedirect('u1', router as never, 'de')
    expect(router.replace).toHaveBeenCalledWith('/profile')
  })

  it('prefixes /en for non-default locale', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false, data: () => undefined } as never)
    const router = makeRouter()
    await postLoginRedirect('u1', router as never, 'en')
    expect(router.replace).toHaveBeenCalledWith('/en/onboarding')
  })

  it('falls back to /onboarding on Firestore error (logged warn)', async () => {
    vi.mocked(getDoc).mockRejectedValueOnce(new Error('offline'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const router = makeRouter()
    await postLoginRedirect('u1', router as never, 'de')
    expect(router.replace).toHaveBeenCalledWith('/onboarding')
    warn.mockRestore()
  })
})
