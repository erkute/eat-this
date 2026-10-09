import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  checkRateLimitFailClosed: vi.fn(),
  fetch: vi.fn(),
  firebaseServesDataset: vi.fn(),
  getCurrentUser: vi.fn(),
  readMustEatCard: vi.fn(),
  withConfig: vi.fn(),
  withTargetConfig: vi.fn(),
  writeMustEatCard: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({ captureException: mocks.captureException }));
vi.mock('@/lib/rateLimit', () => ({ checkRateLimitFailClosed: mocks.checkRateLimitFailClosed }));
vi.mock('@/lib/sanity', () => ({ client: { withConfig: mocks.withConfig } }));
vi.mock('@/lib/must-eat/card-admin.server', () => {
  class MustEatCardError extends Error {}
  return {
    MAX_CARD_BYTES: 15 * 1024 * 1024,
    MustEatCardError,
    firebaseServesDataset: mocks.firebaseServesDataset,
    readMustEatCard: mocks.readMustEatCard,
    writeMustEatCard: mocks.writeMustEatCard,
  };
});

import { MustEatCardError } from '@/lib/must-eat/card-admin.server';
import { OPTIONS, POST } from './route';

const URL = 'https://www.eatthisdot.com/api/admin/must-eat-card';
const STUDIO_ORIGIN = 'https://eat-this.sanity.studio';
const TARGET = { projectId: 'ehwjnjr2', dataset: 'production' };
const CARD = {
  dish: 'Banh Mi Vegan',
  description: 'Baguette, Tofu',
  descriptionEn: 'Baguette, tofu',
  price: '',
  exists: true,
  restaurantId: 'spot-1',
  preview: null,
};

function readRequest(body: Record<string, unknown> = { id: 'card-1', ...TARGET }) {
  return new Request(URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer placeholder', 'Content-Type': 'application/json', Origin: STUDIO_ORIGIN },
    body: JSON.stringify(body),
  });
}

function saveRequest(entries: Record<string, string | File> = {}) {
  const form = new FormData();
  const base = { id: 'card-1', ...TARGET, dish: 'Banh Mi Vegan', description: 'Baguette', descriptionEn: 'Baguette', price: '' };
  for (const [key, value] of Object.entries({ ...base, ...entries })) form.set(key, value);
  return new Request(URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer placeholder', Origin: STUDIO_ORIGIN },
    body: form,
  });
}

describe('POST /api/admin/must-eat-card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withConfig.mockReturnValue({
      users: { getById: mocks.getCurrentUser },
      withConfig: mocks.withTargetConfig,
    });
    mocks.withTargetConfig.mockReturnValue({ fetch: mocks.fetch });
    mocks.getCurrentUser.mockResolvedValue({ id: 'sanity-user-id', role: 'editor' });
    mocks.checkRateLimitFailClosed.mockResolvedValue(true);
    mocks.firebaseServesDataset.mockReturnValue(true);
    mocks.fetch.mockResolvedValue([
      { _id: 'card-1', restaurantId: 'spot-old' },
      { _id: 'drafts.card-1', restaurantId: 'spot-1' },
    ]);
    mocks.readMustEatCard.mockResolvedValue(CARD);
    mocks.writeMustEatCard.mockResolvedValue(CARD);
  });

  it('answers the Studio preflight and refuses other origins', async () => {
    const ok = await OPTIONS(new Request(URL, { method: 'OPTIONS', headers: { Origin: STUDIO_ORIGIN } }));
    expect(ok.status).toBe(204);
    const foreign = await POST(
      new Request(URL, { method: 'POST', headers: { Origin: 'https://evil.example' }, body: '{}' })
    );
    expect(foreign.status).toBe(403);
  });

  it('requires a writing Sanity role', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'viewer', role: 'viewer', roles: [{ name: 'viewer' }] });
    const response = await POST(readRequest());
    expect(response.status).toBe(403);
    expect(mocks.readMustEatCard).not.toHaveBeenCalled();
  });

  it('refuses a dataset whose Firebase project this server does not write to', async () => {
    mocks.firebaseServesDataset.mockReturnValue(false);
    const response = await POST(saveRequest());
    expect(response.status).toBe(409);
    expect(mocks.writeMustEatCard).not.toHaveBeenCalled();
  });

  it('rejects malformed ids before touching Sanity', async () => {
    const response = await POST(readRequest({ id: '../etc', ...TARGET }));
    expect(response.status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('reads the card with the spot from the draft', async () => {
    const response = await POST(readRequest({ id: 'drafts.card-1', ...TARGET }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ dish: 'Banh Mi Vegan', spotId: 'spot-1' });
    expect(mocks.withTargetConfig).toHaveBeenCalledWith(expect.objectContaining(TARGET));
    expect(mocks.readMustEatCard).toHaveBeenCalledWith('card-1', { preview: true });
  });

  it('answers 404 for a Must Eat the dataset does not know', async () => {
    mocks.fetch.mockResolvedValue([]);
    const response = await POST(readRequest());
    expect(response.status).toBe(404);
  });

  it('saves text and image under the spot Sanity names, not the request', async () => {
    const image = new File([new Uint8Array([1, 2, 3])], 'karte.png', { type: 'image/png' });
    const response = await POST(saveRequest({ image, restaurantId: 'spot-forged' }));
    expect(response.status).toBe(200);
    const call = mocks.writeMustEatCard.mock.calls[0][0];
    expect(call.id).toBe('card-1');
    expect(call.restaurantId).toBe('spot-1');
    expect(call.text).toEqual({ dish: 'Banh Mi Vegan', description: 'Baguette', descriptionEn: 'Baguette', price: '' });
    expect(Buffer.isBuffer(call.image)).toBe(true);
  });

  it('needs a spot before saving', async () => {
    mocks.fetch.mockResolvedValue([{ _id: 'drafts.card-1', restaurantId: null }]);
    const response = await POST(saveRequest());
    expect(response.status).toBe(400);
    expect(mocks.writeMustEatCard).not.toHaveBeenCalled();
  });

  it('only takes PNG, JPG or WebP', async () => {
    const pdf = new File([new Uint8Array([1])], 'karte.pdf', { type: 'application/pdf' });
    const response = await POST(saveRequest({ image: pdf }));
    expect(response.status).toBe(400);
    expect(mocks.writeMustEatCard).not.toHaveBeenCalled();
  });

  it('passes card validation messages through', async () => {
    mocks.writeMustEatCard.mockRejectedValue(new MustEatCardError('Gericht und beide Beschreibungen ausfüllen.'));
    const response = await POST(saveRequest({ dish: '' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: 'Gericht und beide Beschreibungen ausfüllen.' });
  });

  it('stops after the rate limit', async () => {
    mocks.checkRateLimitFailClosed.mockResolvedValue(false);
    const response = await POST(saveRequest());
    expect(response.status).toBe(429);
    expect(mocks.writeMustEatCard).not.toHaveBeenCalled();
  });
});
