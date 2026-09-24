import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  checkRateLimitFailClosed: vi.fn(),
  fetchDraft: vi.fn(),
  getCurrentUser: vi.fn(),
  saveNewsPreview: vi.fn(),
  withConfig: vi.fn(),
  withDraftConfig: vi.fn(),
}));

const userClient = {
  users: { getById: mocks.getCurrentUser },
  withConfig: mocks.withDraftConfig,
};

vi.mock('@sentry/nextjs', () => ({ captureException: mocks.captureException }));
vi.mock('@/lib/rateLimit', () => ({
  checkRateLimitFailClosed: mocks.checkRateLimitFailClosed,
}));
vi.mock('@/lib/sanity', () => ({ client: { withConfig: mocks.withConfig } }));
vi.mock('@/lib/admin/newsPreview.server', () => ({ saveNewsPreview: mocks.saveNewsPreview }));

import { OPTIONS, POST } from './route';

const STUDIO_ORIGIN = 'https://eat-this.sanity.studio';

function request(body: unknown = { id: 'drafts.news-x' }, headers: Record<string, string> = {}) {
  return new Request('https://www.eatthisdot.com/api/admin/news-preview', {
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

describe('POST /api/admin/news-preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withConfig.mockReturnValue(userClient);
    mocks.withDraftConfig.mockReturnValue({ fetch: mocks.fetchDraft });
    mocks.getCurrentUser.mockResolvedValue({ id: 'sanity-user-id', role: 'editor' });
    mocks.checkRateLimitFailClosed.mockResolvedValue(true);
    mocks.fetchDraft.mockResolvedValue({ _id: 'drafts.news-x', titleDe: 'Entwurf' });
    mocks.saveNewsPreview.mockResolvedValue('a'.repeat(32));
  });

  it('answers the Studio preflight', async () => {
    const response = await OPTIONS(
      new Request('https://www.eatthisdot.com/api/admin/news-preview', {
        method: 'OPTIONS',
        headers: { Origin: STUDIO_ORIGIN },
      })
    );
    expect(response.status).toBe(204);
  });

  it('rejects foreign origins before authentication', async () => {
    const response = await POST(request(undefined, { Origin: 'https://attacker.example' }));
    expect(response.status).toBe(403);
    expect(mocks.withConfig).not.toHaveBeenCalled();
  });

  it('requires a Sanity session', async () => {
    const response = await POST(request(undefined, { Authorization: '' }));
    expect(response.status).toBe(401);
  });

  it('does not let a viewer read drafts', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'viewer', role: 'viewer' });
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(mocks.fetchDraft).not.toHaveBeenCalled();
  });

  it('accepts an editor project role behind the legacy role field', async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 'token',
      role: 'write',
      roles: [{ name: 'editor', title: 'Editor' }],
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
  });

  it('rejects ids that are not Sanity document ids', async () => {
    const response = await POST(request({ id: '*]{secrets}' }));
    expect(response.status).toBe(400);
    expect(mocks.fetchDraft).not.toHaveBeenCalled();
  });

  it('reads the draft perspective with the editor session and returns the preview path', async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ path: `/news/vorschau/${'a'.repeat(32)}` });
    expect(mocks.withConfig).toHaveBeenCalledWith(expect.objectContaining({ token: 'placeholder' }));
    expect(mocks.withDraftConfig).toHaveBeenCalledWith(
      expect.objectContaining({ perspective: 'drafts' })
    );
    // Published id, so the drafts perspective overlays the draft on it.
    expect(mocks.fetchDraft).toHaveBeenCalledWith(expect.any(String), { id: 'news-x' });
    expect(mocks.saveNewsPreview).toHaveBeenCalledWith({
      _id: 'drafts.news-x',
      titleDe: 'Entwurf',
    });
  });

  it('answers 404 when the article does not exist', async () => {
    mocks.fetchDraft.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(404);
    expect(mocks.saveNewsPreview).not.toHaveBeenCalled();
  });
});
