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
