// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('firebase/auth', () => ({
  sendSignInLinkToEmail: vi.fn(),
}))
vi.mock('../firebase/config', () => ({ auth: {} }))

import { sendSignInLinkToEmail } from 'firebase/auth'
import { useMagicLink } from '../auth/useMagicLink'

describe('useMagicLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => useMagicLink())
    expect(result.current.state).toBe('idle')
    expect(result.current.errorMessage).toBe('')
  })

  it('transitions to sent on success and saves email to localStorage', async () => {
    vi.mocked(sendSignInLinkToEmail).mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useMagicLink())
    await act(async () => { await result.current.sendLink('test@example.com') })
    expect(result.current.state).toBe('sent')
    expect(localStorage.getItem('emailForSignIn')).toBe('test@example.com')
  })

  it('transitions to error on firebase failure and clears localStorage', async () => {
    vi.mocked(sendSignInLinkToEmail).mockRejectedValueOnce({ code: 'auth/invalid-email' })
    const { result } = renderHook(() => useMagicLink())
    await act(async () => { await result.current.sendLink('bad') })
    expect(result.current.state).toBe('error')
    expect(result.current.errorMessage).toBe('Bitte gib eine gültige E-Mail-Adresse ein.')
    expect(localStorage.getItem('emailForSignIn')).toBeNull()
  })

  it('shows generic error for unknown firebase codes', async () => {
    vi.mocked(sendSignInLinkToEmail).mockRejectedValueOnce({ code: 'auth/unknown-thing' })
    const { result } = renderHook(() => useMagicLink())
    await act(async () => { await result.current.sendLink('x@y.com') })
    expect(result.current.errorMessage).toBe('Etwas ist schiefgelaufen. Versuch es nochmal.')
  })

  it('reset returns to idle', async () => {
    vi.mocked(sendSignInLinkToEmail).mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useMagicLink())
    await act(async () => { await result.current.sendLink('test@example.com') })
    act(() => { result.current.reset() })
    expect(result.current.state).toBe('idle')
    expect(result.current.errorMessage).toBe('')
  })
})
