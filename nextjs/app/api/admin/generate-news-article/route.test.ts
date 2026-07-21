import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  checkRateLimitFailClosed: vi.fn(),
  generateNewsArticle: vi.fn(),
  getCurrentUser: vi.fn(),
  withConfig: vi.fn(),
}))

const sanityClient = {
  users: { getById: mocks.getCurrentUser },
}

vi.mock('@sentry/nextjs', () => ({
  captureException: mocks.captureException,
  captureMessage: mocks.captureMessage,
}))
vi.mock('@/lib/admin/generate-news-article.server', () => ({
  generateNewsArticle: mocks.generateNewsArticle,
}))
vi.mock('@/lib/rateLimit', () => ({
  checkRateLimitFailClosed: mocks.checkRateLimitFailClosed,
}))
vi.mock('@/lib/sanity', () => ({
  client: { withConfig: mocks.withConfig },
}))

import { OPTIONS, POST } from './route'

const STUDIO_ORIGIN = 'https://eat-this.sanity.studio'
const previousAnthropicKey = process.env.ANTHROPIC_API_KEY
const validBody = {
  brief: 'Ein ausreichend langes, faktenbasiertes Briefing für einen Berliner Food-Artikel.',
  category: 'guides',
  heroImageUrl: null,
  imageDescription: '',
  includeEnglish: true,
  length: 'standard',
  sourceUrls: ['https://example.com/source'],
}

function request(
  body: unknown = validBody,
  headers: Record<string, string> = {},
) {
  return new Request('https://www.eatthisdot.com/api/admin/generate-news-article', {
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

describe('POST /api/admin/generate-news-article', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = 'placeholder'
    mocks.withConfig.mockReturnValue(sanityClient)
    mocks.getCurrentUser.mockResolvedValue({
      id: 'sanity-user-id',
      role: 'editor',
    })
    mocks.checkRateLimitFailClosed.mockResolvedValue(true)
    mocks.generateNewsArticle.mockResolvedValue({
      titleDe: 'Generated article',
    })
  })

  afterAll(() => {
    if (previousAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY
    else process.env.ANTHROPIC_API_KEY = previousAnthropicKey
  })

  it('allows the deployed Studio origin in preflight requests', async () => {
    const response = await OPTIONS(
      new Request('https://www.eatthisdot.com/api/admin/generate-news-article', {
        method: 'OPTIONS',
        headers: { Origin: STUDIO_ORIGIN },
      }),
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe(STUDIO_ORIGIN)
  })

  it('rejects foreign origins before authentication', async () => {
    const response = await POST(request(validBody, { Origin: 'https://attacker.example' }))

    expect(response.status).toBe(403)
    expect(mocks.withConfig).not.toHaveBeenCalled()
  })

  it('requires a Sanity session', async () => {
    const response = await POST(request(validBody, { Authorization: '' }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({ error: 'missing_token' })
  })

  it('rejects invalid Sanity sessions', async () => {
    mocks.getCurrentUser.mockRejectedValue(new Error('expired'))

    const response = await POST(request())

    expect(response.status).toBe(401)
    expect(mocks.generateNewsArticle).not.toHaveBeenCalled()
  })

  it('does not elevate a viewer', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'viewer', role: 'viewer' })

    const response = await POST(request())

    expect(response.status).toBe(403)
    expect(mocks.generateNewsArticle).not.toHaveBeenCalled()
  })

  it('validates the brief and HTTPS source URLs before paid generation', async () => {
    const response = await POST(
      request({
        ...validBody,
        brief: 'too short',
        sourceUrls: ['http://example.com/source'],
      }),
    )

    expect(response.status).toBe(400)
    expect(mocks.checkRateLimitFailClosed).not.toHaveBeenCalled()
    expect(mocks.generateNewsArticle).not.toHaveBeenCalled()
  })

  it('accepts only production Sanity image URLs for vision alt text', async () => {
    const response = await POST(
      request({
        ...validBody,
        heroImageUrl: 'https://attacker.example/image.jpg',
      }),
    )

    expect(response.status).toBe(400)
    expect(mocks.generateNewsArticle).not.toHaveBeenCalled()
  })

  it('rate limits paid generations per Sanity user', async () => {
    mocks.checkRateLimitFailClosed.mockResolvedValue(false)

    const response = await POST(request())

    expect(response.status).toBe(429)
    expect(mocks.generateNewsArticle).not.toHaveBeenCalled()
  })

  it('normalizes input and returns the generated draft payload', async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ titleDe: 'Generated article' })
    expect(mocks.withConfig).toHaveBeenCalledWith({
      token: 'placeholder',
      useCdn: false,
      perspective: 'raw',
    })
    expect(mocks.generateNewsArticle).toHaveBeenCalledWith({
      brief: validBody.brief,
      category: 'guides',
      heroImageUrl: null,
      imageDescription: null,
      includeEnglish: true,
      length: 'standard',
      sourceUrls: ['https://example.com/source'],
    })
  })

  it('does not leak provider errors', async () => {
    mocks.generateNewsArticle.mockRejectedValue(new Error('secret provider detail'))

    const response = await POST(request())

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'generation_failed',
      message: 'Der Artikel konnte nicht erzeugt werden. Bitte erneut versuchen.',
    })
    expect(mocks.captureException).toHaveBeenCalledOnce()
  })
})
