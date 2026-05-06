// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useMagicLink } from '../auth/useMagicLink'

const fetchMock = vi.fn()

const apiResponse = (ok: boolean, body: unknown) =>
  Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response)

describe('useMagicLink', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => useMagicLink())
    expect(result.current.state).toBe('idle')
    expect(result.current.errorMessage).toBe('')
  })

  it('transitions to sent on success and saves email to localStorage', async () => {
    fetchMock.mockReturnValueOnce(apiResponse(true, {}))
    const { result } = renderHook(() => useMagicLink())
    await act(async () => { await result.current.sendLink('test@example.com') })
    expect(result.current.state).toBe('sent')
    expect(localStorage.getItem('emailForSignIn')).toBe('test@example.com')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/send-magic-link',
      expect.objectContaining({
        method: 'POST',
        body:   JSON.stringify({ email: 'test@example.com' }),
      })
    )
  })

  it('maps known API error code to localised message and clears localStorage', async () => {
    fetchMock.mockReturnValueOnce(apiResponse(false, { error: 'invalid-email' }))
    const { result } = renderHook(() => useMagicLink())
    await act(async () => { await result.current.sendLink('bad') })
    expect(result.current.state).toBe('error')
    expect(result.current.errorMessage).toBe('Bitte gib eine gültige E-Mail-Adresse ein.')
    expect(localStorage.getItem('emailForSignIn')).toBeNull()
  })

  it('falls back to a generic message for unknown API error codes', async () => {
    fetchMock.mockReturnValueOnce(apiResponse(false, { error: 'something-new' }))
    const { result } = renderHook(() => useMagicLink())
    await act(async () => { await result.current.sendLink('x@y.com') })
    expect(result.current.errorMessage).toBe('Etwas ist schiefgelaufen. Versuch es nochmal.')
  })

  it('shows the network message when fetch rejects', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    const { result } = renderHook(() => useMagicLink())
    await act(async () => { await result.current.sendLink('x@y.com') })
    expect(result.current.state).toBe('error')
    expect(result.current.errorMessage).toBe('Netzwerkfehler – bitte erneut versuchen.')
    expect(localStorage.getItem('emailForSignIn')).toBeNull()
  })

  it('reset returns to idle', async () => {
    fetchMock.mockReturnValueOnce(apiResponse(true, {}))
    const { result } = renderHook(() => useMagicLink())
    await act(async () => { await result.current.sendLink('test@example.com') })
    act(() => { result.current.reset() })
    expect(result.current.state).toBe('idle')
    expect(result.current.errorMessage).toBe('')
  })
})
