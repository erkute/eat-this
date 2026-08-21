import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  create: vi.fn(),
  set: vi.fn(),
}));

vi.mock('@/lib/buddy/rateLimit', () => ({
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({
        create: (data: unknown) => mocks.create(name, id, data),
        set: (data: unknown, opts: unknown) => mocks.set(name, id, data, opts),
      }),
    }),
  }),
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { increment: (n: number) => ({ __inc: n }) },
  Timestamp: { fromMillis: (ms: number) => ({ __ts: ms }) },
}));

import { POST } from './route';

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

/* Three hops: App Hosting appends ingress + GFE after the real client, so
 * clientIpFromXff takes the third from the end. Mirrors the buddy route. */
function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://www.eatthisdot.com/api/count', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      'user-agent': CHROME,
      'x-forwarded-for': '84.13.22.9, 10.0.0.1, 10.0.0.2',
      ...headers,
    },
  });
}

/** The day document write, or undefined when nothing was counted. */
function dayWrite() {
  const call = mocks.set.mock.calls.find(([collection]) => collection === 'analytics_daily');
  return call?.[2] as Record<string, unknown> | undefined;
}

describe('POST /api/count', () => {
  beforeEach(() => {
    mocks.checkRateLimit.mockReset().mockResolvedValue({ allowed: true });
    mocks.create.mockReset().mockResolvedValue(undefined);
    mocks.set.mockReset().mockResolvedValue(undefined);
    process.env.COUNT_SALT = 'test-salt';
    // The route refuses to write outside production on purpose (see below);
    // every counting assertion here is about the production path.
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    delete process.env.COUNT_SALT;
    vi.unstubAllEnvs();
  });

  /* Local dev is wired to the PRODUCTION Firestore, so an unguarded endpoint
   * would file every developer page load as real traffic. */
  it.each(['development', 'test'])('writes nothing when NODE_ENV is %s', async (env) => {
    vi.stubEnv('NODE_ENV', env);

    const res = await POST(request({ path: '/' }));

    expect(res.status).toBe(204);
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('counts a page view and its referrer host', async () => {
    const res = await POST(
      request({
        path: '/bezirk/kreuzberg',
        referrer: 'https://www.google.com/search?q=berlin+ramen',
      })
    );

    expect(res.status).toBe(204);
    const write = dayWrite();
    expect(write?.pageviews).toEqual({ __inc: 1 });
    expect(write?.paths).toEqual({ '/bezirk/kreuzberg': { __inc: 1 } });
    // Host only — the query string carried the person's search terms.
    expect(write?.referrers).toEqual({ www_google_com: { __inc: 1 } });
  });

  it('counts a first-of-day visitor once, and not on the second view', async () => {
    await POST(request({ path: '/' }));
    expect(dayWrite()?.visitors, 'first view of the day is a visitor').toEqual({ __inc: 1 });

    // `create` throwing IS the "already seen today" signal.
    mocks.set.mockClear();
    mocks.create.mockRejectedValueOnce(new Error('ALREADY_EXISTS'));
    await POST(request({ path: '/map' }));

    const second = dayWrite();
    expect(second?.pageviews, 'the view still counts').toEqual({ __inc: 1 });
    expect(second?.visitors, 'the person does not count twice').toBeUndefined();
  });

  /* The storage-free opt-out. If these ever start counting, the privacy policy
   * is making a promise the code does not keep. */
  it.each([
    ['Sec-GPC', { 'sec-gpc': '1' }],
    ['DNT', { dnt: '1' }],
  ])('honours %s and writes nothing', async (_label, headers) => {
    const res = await POST(request({ path: '/' }, headers));

    expect(res.status).toBe(204);
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  /* The Azure crawler executes JavaScript, so it reaches this endpoint exactly
   * like a browser. Unfiltered it was ~2500 hits a day and rising. */
  it('drops the disguised Azure crawler', async () => {
    const res = await POST(
      request(
        { path: '/' },
        {
          'user-agent':
            'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36',
          'x-forwarded-for': '20.61.4.9, 10.0.0.1, 10.0.0.2',
        }
      )
    );

    expect(res.status).toBe(204);
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it('drops a declared crawler', async () => {
    await POST(request({ path: '/' }, { 'user-agent': 'Googlebot/2.1' }));
    expect(mocks.set).not.toHaveBeenCalled();
  });

  /* Scanners send an ordinary browser UA, so only the path shape catches them
   * here — a 404 never reaches this endpoint to be filtered by status. */
  it.each(['/wp-admin/install.php', '/../../etc/passwd', '/a?b=c', '/UPPER', '/a/b/c/d/e/f/g'])(
    'refuses the scanner path %s',
    async (path) => {
      await POST(request({ path }));
      expect(mocks.set).not.toHaveBeenCalled();
    }
  );

  it('drops an event name that is not on the allowlist', async () => {
    await POST(request({ path: '/', event: 'something_invented' }));
    const write = dayWrite();
    // Falls through to a plain page view rather than creating a junk key.
    expect(write?.events).toBeUndefined();
    expect(write?.pageviews).toEqual({ __inc: 1 });
  });

  it('counts an allowlisted event without counting a second page view', async () => {
    await POST(request({ path: '/map', event: 'map_opened' }));
    const write = dayWrite();
    expect(write?.events).toEqual({ map_opened: { __inc: 1 } });
    expect(write?.pageviews, 'the view was already counted by countView').toBeUndefined();
  });

  it('stops writing when the rate limit trips', async () => {
    mocks.checkRateLimit.mockResolvedValue({ allowed: false, reason: 'per_minute' });
    const res = await POST(request({ path: '/' }));

    expect(res.status).toBe(429);
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it('rejects a body big enough to be an attack', async () => {
    const res = await POST(request(JSON.stringify({ path: '/', referrer: 'x'.repeat(2000) })));
    expect(res.status).toBe(413);
    expect(mocks.set).not.toHaveBeenCalled();
  });

  /* The visitor hash may be stored; the raw IP may never be. */
  it('never writes a raw IP anywhere', async () => {
    await POST(request({ path: '/' }));
    const written = JSON.stringify([
      mocks.set.mock.calls,
      mocks.create.mock.calls,
      mocks.checkRateLimit.mock.calls,
    ]);
    expect(written).not.toContain('84.13.22.9');
  });
});
