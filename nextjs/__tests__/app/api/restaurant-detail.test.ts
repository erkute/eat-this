import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.mock('@/lib/sanity', () => ({ client: { fetch: (...args: unknown[]) => fetchMock(...args) } }));

import { GET } from '@/app/api/restaurant-detail/[slug]/route';

function parseCacheControl(header: string | null) {
  return Object.fromEntries(
    (header ?? '').split(',').map((part) => {
      const [key, value] = part.trim().split('=');
      return [key, value ? Number(value) : true];
    })
  ) as Record<string, number | true>;
}

async function call(slug = 'test-spot') {
  return GET(new Request(`https://example.com/api/restaurant-detail/${slug}`), {
    params: Promise.resolve({ slug }),
  });
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe('GET /api/restaurant-detail/[slug]', () => {
  /**
   * The browser answers from its own cache for max-age + SWR and revalidates
   * in the background, so the Sanity webhook only clears the SERVER cache.
   * A long SWR therefore keeps a stale body on screen for returning visitors
   * long after a deploy — that is how the EN map texts still read German
   * after a green rollout. Keep the stale window at most as long as max-age.
   */
  it('does not let the stale window outlive max-age', async () => {
    fetchMock.mockResolvedValue({ description: 'x' });
    const cc = parseCacheControl((await call()).headers.get('Cache-Control'));

    expect(cc['max-age']).toBe(300);
    expect(cc['stale-while-revalidate']).toBeLessThanOrEqual(cc['max-age'] as number);
  });

  it('never caches a not-found, so a freshly published spot appears at once', async () => {
    fetchMock.mockResolvedValue(null);
    const res = await call('unpublished');

    expect(res.status).toBe(404);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});
