import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  sendMagicLinkEmail: vi.fn(),
}))

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  clientIp: () => 'test-ip',
}))
vi.mock('@/lib/auth/sendMagicLink', () => ({
  sendMagicLinkEmail: mocks.sendMagicLinkEmail,
}))

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_ENV', 'staging')
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://staging.example.com')
  mocks.checkRateLimit.mockReset()
  mocks.checkRateLimit.mockResolvedValue(true)
  mocks.sendMagicLinkEmail.mockReset()
  mocks.sendMagicLinkEmail.mockResolvedValue({ ok: true })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

// Der Einladende muss den Posteingang ueberleben. Der pending_referrer-Cookie
// liegt im Browser, der den Einladungslink angeklickt hat — die Anmeldung
// schliesst routinemaessig in einem anderen ab (Gmail-App -> eigener Webview).
// Die Continue-URL ist der einzige Traeger, der beide Browser verbindet.
describe('/api/auth/send-magic-link referrer carrier', () => {
  const INVITER = 'i'.repeat(28)

  async function post(headers: Record<string, string>, body: Record<string, unknown>) {
    const { POST } = await import('@/app/api/auth/send-magic-link/route')
    return POST(new Request('https://staging.example.com/api/auth/send-magic-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }))
  }

  it('carries the pending referrer into the continue URL', async () => {
    await post(
      { cookie: `pending_referrer=${INVITER}` },
      { email: 'friend@example.com', continueUrl: 'https://staging.example.com/map?r=hasir' },
    )

    const { continueUrl } = mocks.sendMagicLinkEmail.mock.calls[0][0]
    const url = new URL(continueUrl)
    expect(url.searchParams.get('ref')).toBe(INVITER)
    // Das Ziel selbst bleibt unangetastet — der Referrer faehrt mit, er
    // ersetzt nichts.
    expect(url.pathname).toBe('/map')
    expect(url.searchParams.get('r')).toBe('hasir')
  })

  it('leaves the continue URL alone when no referral is pending', async () => {
    await post({}, { email: 'friend@example.com' })

    expect(mocks.sendMagicLinkEmail).toHaveBeenCalledWith({
      email: 'friend@example.com',
      continueUrl: 'https://staging.example.com/',
      appUrl: 'https://staging.example.com',
    })
  })

  it('ignores a client-supplied ref and a malformed cookie', async () => {
    await post(
      { cookie: 'pending_referrer=nope' },
      { email: 'friend@example.com', continueUrl: 'https://staging.example.com/?ref=' + 'x'.repeat(28) },
    )

    const { continueUrl } = mocks.sendMagicLinkEmail.mock.calls[0][0]
    expect(new URL(continueUrl).searchParams.get('ref')).toBeNull()
  })

  it('does not let a foreign continue origin smuggle the referrer off-site', async () => {
    await post(
      { cookie: `pending_referrer=${INVITER}` },
      { email: 'friend@example.com', continueUrl: 'https://evil.example/steal' },
    )

    const { continueUrl } = mocks.sendMagicLinkEmail.mock.calls[0][0]
    expect(new URL(continueUrl).origin).toBe('https://staging.example.com')
    expect(new URL(continueUrl).searchParams.get('ref')).toBe(INVITER)
  })
})

describe('/api/auth/send-magic-link staging boundary', () => {
  it('rejects a production continue origin and keeps assets on staging', async () => {
    const { POST } = await import('@/app/api/auth/send-magic-link/route')
    const response = await POST(new Request(
      'https://staging.example.com/api/auth/send-magic-link',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'guest@example.com',
          continueUrl: 'https://www.eatthisdot.com/profile',
        }),
      },
    ))

    expect(response.status).toBe(200)
    expect(mocks.sendMagicLinkEmail).toHaveBeenCalledWith({
      email: 'guest@example.com',
      continueUrl: 'https://staging.example.com/',
      appUrl: 'https://staging.example.com',
    })
  })
})
