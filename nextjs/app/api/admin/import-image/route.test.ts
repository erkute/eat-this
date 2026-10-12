import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  checkRateLimitFailClosed: vi.fn(),
  fetchRemoteImage: vi.fn(),
  getCurrentUser: vi.fn(),
  upload: vi.fn(),
  withConfig: vi.fn(),
  withTargetConfig: vi.fn(),
}));

const userClient = {
  users: { getById: mocks.getCurrentUser },
  withConfig: mocks.withTargetConfig,
};

vi.mock('@sentry/nextjs', () => ({ captureException: mocks.captureException }));
vi.mock('@/lib/rateLimit', () => ({
  checkRateLimitFailClosed: mocks.checkRateLimitFailClosed,
}));
vi.mock('@/lib/sanity', () => ({ client: { withConfig: mocks.withConfig } }));
vi.mock('@/lib/admin/remoteImage.server', async () => {
  class RemoteImageError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'RemoteImageError';
    }
  }
  return { fetchRemoteImage: mocks.fetchRemoteImage, RemoteImageError };
});

import { RemoteImageError } from '@/lib/admin/remoteImage.server';
import { OPTIONS, POST } from './route';

const STUDIO_ORIGIN = 'https://eat-this.sanity.studio';
const BODY = {
  url: 'https://example.com/foto.jpg',
  projectId: 'ehwjnjr2',
  dataset: 'production',
  credit: 'Foto: Max Muster',
};

function request(body: unknown = BODY, headers: Record<string, string> = {}) {
  return new Request('https://www.eatthisdot.com/api/admin/import-image', {
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

describe('POST /api/admin/import-image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withConfig.mockReturnValue(userClient);
    mocks.withTargetConfig.mockReturnValue({ assets: { upload: mocks.upload } });
    mocks.getCurrentUser.mockResolvedValue({ id: 'sanity-user-id', role: 'editor' });
    mocks.checkRateLimitFailClosed.mockResolvedValue(true);
    mocks.fetchRemoteImage.mockResolvedValue({
      body: Buffer.from('jpeg'),
      contentType: 'image/jpeg',
      filename: 'foto.jpg',
      imageUrl: 'https://example.com/foto.jpg',
      pageUrl: null,
    });
    mocks.upload.mockResolvedValue({
      _id: 'image-abc-800x600-jpg',
      url: 'https://cdn.sanity.io/images/ehwjnjr2/production/abc-800x600.jpg',
      metadata: { dimensions: { width: 800, height: 600 } },
    });
  });

  it('answers the Studio preflight', async () => {
    const response = await OPTIONS(
      new Request('https://www.eatthisdot.com/api/admin/import-image', {
        method: 'OPTIONS',
        headers: { Origin: STUDIO_ORIGIN },
      })
    );
    expect(response.status).toBe(204);
  });

  it('rejects foreign origins before authentication', async () => {
    const response = await POST(request(BODY, { Origin: 'https://attacker.example' }));
    expect(response.status).toBe(403);
    expect(mocks.withConfig).not.toHaveBeenCalled();
    expect(mocks.fetchRemoteImage).not.toHaveBeenCalled();
  });

  it('requires a Sanity session', async () => {
    const response = await POST(request(BODY, { Authorization: '' }));
    expect(response.status).toBe(401);
    expect(mocks.fetchRemoteImage).not.toHaveBeenCalled();
  });

  it('does not let a viewer upload', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'viewer', role: 'viewer' });
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(mocks.fetchRemoteImage).not.toHaveBeenCalled();
  });

  it('only uploads into the known datasets', async () => {
    const response = await POST(request({ ...BODY, projectId: 'other', dataset: 'production' }));
    expect(response.status).toBe(400);
    expect(mocks.fetchRemoteImage).not.toHaveBeenCalled();
  });

  it('stops at the rate limit before fetching', async () => {
    mocks.checkRateLimitFailClosed.mockResolvedValue(false);
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(mocks.fetchRemoteImage).not.toHaveBeenCalled();
  });

  it('passes the fetch error message through to the editor', async () => {
    mocks.fetchRemoteImage.mockRejectedValue(new RemoteImageError('Unter dem Link liegt kein Bild.'));
    const response = await POST(request());
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ message: 'Unter dem Link liegt kein Bild.' });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('uploads with the editor session into the requested dataset', async () => {
    const response = await POST(request({ ...BODY, projectId: 'tqgkp8uc', dataset: 'staging' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      assetId: 'image-abc-800x600-jpg',
      previewUrl: 'https://cdn.sanity.io/images/ehwjnjr2/production/abc-800x600.jpg',
      width: 800,
      height: 600,
      pageUrl: null,
    });
    expect(mocks.withConfig).toHaveBeenCalledWith(expect.objectContaining({ token: 'placeholder' }));
    expect(mocks.withTargetConfig).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'tqgkp8uc', dataset: 'staging' })
    );
    expect(mocks.upload).toHaveBeenCalledWith(
      'image',
      expect.any(Buffer),
      expect.objectContaining({ filename: 'foto.jpg', creditLine: 'Foto: Max Muster' })
    );
  });

  it('reports a Sanity write refusal as 403', async () => {
    mocks.upload.mockRejectedValue(Object.assign(new Error('nope'), { statusCode: 403 }));
    const response = await POST(request());
    expect(response.status).toBe(403);
  });
});
