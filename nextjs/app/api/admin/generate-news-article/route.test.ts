import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  applyGeneratedArticle: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  checkRateLimitFailClosed: vi.fn(),
  generateNewsArticle: vi.fn(),
  getCurrentUser: vi.fn(),
  readArticle: vi.fn(),
  targetFetch: vi.fn(),
  withConfig: vi.fn(),
  withTargetConfig: vi.fn(),
}));

const targetClient = { fetch: mocks.targetFetch };
const sanityClient = {
  users: { getById: mocks.getCurrentUser },
  withConfig: mocks.withTargetConfig,
};

vi.mock('@sentry/nextjs', () => ({
  captureException: mocks.captureException,
  captureMessage: mocks.captureMessage,
}));
vi.mock('@/lib/admin/generate-news-article.server', () => ({
  generateNewsArticle: mocks.generateNewsArticle,
}));
vi.mock('@/lib/admin/applyGeneratedArticle.server', () => ({
  applyGeneratedArticle: mocks.applyGeneratedArticle,
  readArticle: mocks.readArticle,
}));
vi.mock('@/lib/rateLimit', () => ({
  checkRateLimitFailClosed: mocks.checkRateLimitFailClosed,
}));
vi.mock('@/lib/sanity', () => ({
  client: { withConfig: mocks.withConfig },
}));

import { OPTIONS, POST } from './route';

const STUDIO_ORIGIN = 'https://eat-this.sanity.studio';
const previousAnthropicKey = process.env.ANTHROPIC_API_KEY;
const validBody = {
  brief: 'Ein ausreichend langes, faktenbasiertes Briefing für einen Berliner Food-Artikel.',
  documentId: 'drafts.article-1',
  projectId: 'ehwjnjr2',
  dataset: 'production',
  replace: false,
  sourceUrls: ['https://example.com/source'],
};
const generated = { titleDe: 'Generated article', sources: [{ title: 'a', url: 'https://a' }] };

function request(body: unknown = validBody, headers: Record<string, string> = {}) {
  return new Request('https://www.eatthisdot.com/api/admin/generate-news-article', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer placeholder',
      'Content-Type': 'application/json',
      Origin: STUDIO_ORIGIN,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/generate-news-article', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'placeholder';
    mocks.withConfig.mockReturnValue(sanityClient);
    mocks.withTargetConfig.mockReturnValue(targetClient);
    mocks.getCurrentUser.mockResolvedValue({ id: 'sanity-user-id', role: 'editor' });
    mocks.checkRateLimitFailClosed.mockResolvedValue(true);
    mocks.readArticle.mockResolvedValue(null);
    mocks.generateNewsArticle.mockResolvedValue(generated);
    mocks.applyGeneratedArticle.mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (previousAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previousAnthropicKey;
  });

  it('allows the deployed Studio origin in preflight requests', async () => {
    const response = await OPTIONS(
      new Request('https://www.eatthisdot.com/api/admin/generate-news-article', {
        method: 'OPTIONS',
        headers: { Origin: STUDIO_ORIGIN },
      })
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(STUDIO_ORIGIN);
  });

  it('rejects foreign origins before authentication', async () => {
    const response = await POST(request(validBody, { Origin: 'https://attacker.example' }));

    expect(response.status).toBe(403);
    expect(mocks.withConfig).not.toHaveBeenCalled();
  });

  it('requires a Sanity session', async () => {
    const response = await POST(request(validBody, { Authorization: '' }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: 'missing_token' });
  });

  it('rejects invalid Sanity sessions', async () => {
    mocks.getCurrentUser.mockRejectedValue(new Error('expired'));

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(mocks.generateNewsArticle).not.toHaveBeenCalled();
  });

  it('does not elevate a viewer', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'viewer', role: 'viewer' });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.generateNewsArticle).not.toHaveBeenCalled();
  });

  it.each([
    ['a short brief', { brief: 'too short' }],
    ['plain-http sources', { sourceUrls: ['http://example.com/source'] }],
    ['an unknown dataset', { dataset: 'other' }],
    ['a malformed document id', { documentId: '../x' }],
    ['a missing replace flag', { replace: undefined }],
  ])('validates %s before paid generation', async (_label, change) => {
    const response = await POST(request({ ...validBody, ...change }));

    expect(response.status).toBe(400);
    expect(mocks.checkRateLimitFailClosed).not.toHaveBeenCalled();
    expect(mocks.generateNewsArticle).not.toHaveBeenCalled();
  });

  it('rate limits paid generations per Sanity user', async () => {
    mocks.checkRateLimitFailClosed.mockResolvedValue(false);

    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(mocks.generateNewsArticle).not.toHaveBeenCalled();
  });

  it('writes the article into the draft with the user token and reports back', async () => {
    mocks.readArticle.mockResolvedValue({ _id: 'drafts.article-1', _type: 'newsArticle', category: 'culture' });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ sources: 1, titleDe: 'Generated article' });
    expect(mocks.withConfig).toHaveBeenCalledWith({ token: 'placeholder', useCdn: false, perspective: 'raw' });
    expect(mocks.withTargetConfig).toHaveBeenCalledWith({
      projectId: 'ehwjnjr2',
      dataset: 'production',
      apiVersion: '2024-01-01',
    });
    expect(mocks.readArticle).toHaveBeenCalledWith(targetClient, 'article-1');
    expect(mocks.generateNewsArticle).toHaveBeenCalledWith({
      brief: validBody.brief,
      category: 'culture',
      heroImageUrl: null,
      imageDescription: null,
      includeEnglish: true,
      length: 'standard',
      sourceUrls: ['https://example.com/source'],
    });
    expect(mocks.applyGeneratedArticle).toHaveBeenCalledWith(
      targetClient,
      'article-1',
      expect.objectContaining({ category: 'culture' }),
      generated,
      false
    );
  });

  it('describes the hero image only from the production dataset', async () => {
    const withImage = { _id: 'article-1', _type: 'newsArticle', image: { asset: { _ref: 'image-abc-10x10-jpg' } } };
    mocks.readArticle.mockResolvedValue(withImage);
    mocks.targetFetch.mockResolvedValue('https://cdn.sanity.io/images/ehwjnjr2/production/abc-10x10.jpg');

    await POST(request());
    expect(mocks.generateNewsArticle.mock.calls[0][0].heroImageUrl).toBe(
      'https://cdn.sanity.io/images/ehwjnjr2/production/abc-10x10.jpg'
    );

    mocks.generateNewsArticle.mockClear();
    await POST(request({ ...validBody, projectId: 'tqgkp8uc', dataset: 'staging' }));
    expect(mocks.generateNewsArticle.mock.calls[0][0].heroImageUrl).toBeNull();
  });

  it('refuses documents that are not articles', async () => {
    mocks.readArticle.mockResolvedValue({ _id: 'article-1', _type: 'restaurant' });

    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(mocks.generateNewsArticle).not.toHaveBeenCalled();
  });

  it('does not leak provider errors', async () => {
    mocks.generateNewsArticle.mockRejectedValue(new Error('secret provider detail'));

    const response = await POST(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'generation_failed',
      message: 'Der Artikel konnte nicht erzeugt werden. Bitte erneut versuchen.',
    });
    expect(mocks.captureException).toHaveBeenCalledOnce();
    expect(mocks.applyGeneratedArticle).not.toHaveBeenCalled();
  });

  it('tells the editor when the Anthropic credit is used up', async () => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    mocks.generateNewsArticle.mockRejectedValue(
      new Anthropic.BadRequestError(
        400,
        { type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low' } },
        'Your credit balance is too low to access the Anthropic API.',
        new Headers()
      )
    );

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: 'writer_unavailable' });
    expect(mocks.applyGeneratedArticle).not.toHaveBeenCalled();
  });

  it('says so when the finished text cannot be written', async () => {
    mocks.applyGeneratedArticle.mockRejectedValue(new Error('forbidden'));

    const response = await POST(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: 'apply_failed' });
  });
});
