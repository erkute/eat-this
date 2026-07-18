import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  checkRateLimitFailClosed: vi.fn(),
  getCurrentUser: vi.fn(),
  importRestaurant: vi.fn(),
  withConfig: vi.fn(),
}))

const sanityClient = {
  users: { getById: mocks.getCurrentUser },
}

vi.mock('@sentry/nextjs', () => ({
  captureException: mocks.captureException,
  captureMessage: mocks.captureMessage,
}))
vi.mock('@/lib/admin/import-restaurant.server', () => ({
  importRestaurant: mocks.importRestaurant,
}))
vi.mock('@/lib/rateLimit', () => ({
  checkRateLimitFailClosed: mocks.checkRateLimitFailClosed,
}))
vi.mock('@/lib/sanity', () => ({
  client: { withConfig: mocks.withConfig },
}))

import { OPTIONS, POST } from './route'

const STUDIO_ORIGIN = 'https://www.sanity.io'
const previousGoogleKey = process.env.GOOGLE_API_KEY
const previousAnthropicKey = process.env.ANTHROPIC_API_KEY

function request(
  body: unknown = { url: 'https://maps.app.goo.gl/example' },
  headers: Record<string, string> = {},
) {
  return new Request('https://www.eatthisdot.com/api/admin/import-restaurant', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer placeholder',
      'Content-Type': 'application/json',
      Origin: STUDIO_ORIGIN,
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/import-restaurant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_API_KEY = 'placeholder'
    process.env.ANTHROPIC_API_KEY = 'placeholder'
    mocks.withConfig.mockReturnValue(sanityClient)
    mocks.getCurrentUser.mockResolvedValue({
      id: 'sanity-user-id',
      name: 'Editor',
      email: 'editor@example.com',
      profileImage: null,
      role: 'administrator',
      provider: 'sanity',
    })
    mocks.checkRateLimitFailClosed.mockResolvedValue(true)
    mocks.importRestaurant.mockResolvedValue({ docId: 'restaurant-1', name: 'Test Spot' })
  })

  afterAll(() => {
    if (previousGoogleKey === undefined) delete process.env.GOOGLE_API_KEY
    else process.env.GOOGLE_API_KEY = previousGoogleKey
    if (previousAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY
    else process.env.ANTHROPIC_API_KEY = previousAnthropicKey
  })

  it('allows the deployed Studio origin in preflight requests', async () => {
    const response = await OPTIONS(
      new Request('https://www.eatthisdot.com/api/admin/import-restaurant', {
        method: 'OPTIONS',
        headers: { Origin: STUDIO_ORIGIN },
      }),
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe(STUDIO_ORIGIN)
    expect(response.headers.get('access-control-allow-headers')).toContain('Authorization')
  })

  it('rejects unknown browser origins before authentication', async () => {
    const response = await POST(request(undefined, { Origin: 'https://attacker.example' }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'origin_forbidden' })
    expect(mocks.withConfig).not.toHaveBeenCalled()
  })

  it('rejects requests without a Sanity session token', async () => {
    const response = await POST(request(undefined, { Authorization: '' }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({ error: 'missing_token' })
  })

  it('rejects an invalid Sanity session', async () => {
    mocks.getCurrentUser.mockRejectedValue(new Error('invalid token'))

    const response = await POST(request())

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({ error: 'invalid_token' })
    expect(mocks.importRestaurant).not.toHaveBeenCalled()
  })

  it('does not elevate a read-only Sanity user', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'viewer', role: 'viewer' })

    const response = await POST(request())

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({ error: 'insufficient_role' })
    expect(mocks.importRestaurant).not.toHaveBeenCalled()
  })

  it('rejects non-Google URLs before starting the paid import', async () => {
    const response = await POST(request({ url: 'https://example.com/restaurant' }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: 'invalid_url' })
    expect(mocks.checkRateLimitFailClosed).not.toHaveBeenCalled()
    expect(mocks.importRestaurant).not.toHaveBeenCalled()
  })

  it('rejects generic Google redirect URLs that could leave Maps', async () => {
    const response = await POST(
      request({ url: 'https://www.google.com/url?q=https://example.com/restaurant' }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: 'invalid_url' })
    expect(mocks.importRestaurant).not.toHaveBeenCalled()
  })

  it('rate limits paid imports per Sanity user', async () => {
    mocks.checkRateLimitFailClosed.mockResolvedValue(false)

    const response = await POST(request())

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toMatchObject({ error: 'rate_limited' })
    expect(mocks.importRestaurant).not.toHaveBeenCalled()
  })

  it('runs the import with the Studio user token and returns the created document', async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ docId: 'restaurant-1', name: 'Test Spot' })
    expect(mocks.withConfig).toHaveBeenCalledWith({
      token: 'placeholder',
      useCdn: false,
      perspective: 'raw',
    })
    expect(mocks.importRestaurant).toHaveBeenCalledWith(
      'https://maps.app.goo.gl/example',
      sanityClient,
    )
  })

  it('hides unexpected provider errors from the Studio response', async () => {
    mocks.importRestaurant.mockRejectedValue(new Error('secret provider detail'))

    const response = await POST(request())

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'import_failed',
      message: 'The import failed. Please try again.',
    })
    expect(mocks.captureException).toHaveBeenCalledOnce()
  })
})
