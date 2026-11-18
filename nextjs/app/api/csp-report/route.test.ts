import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captureMessage = vi.hoisted(() => vi.fn());
vi.mock('@sentry/nextjs', () => ({ captureMessage }));

import { POST } from './route';

const post = (body: string) =>
  POST(
    new Request('http://x/api/csp-report', {
      method: 'POST',
      headers: { 'content-type': 'application/csp-report' },
      body,
    })
  );

const report = (blocked: string) =>
  JSON.stringify({
    'csp-report': {
      'document-uri': 'https://www.eatthisdot.com/map?me=abc',
      'effective-directive': 'connect-src',
      'blocked-uri': blocked,
    },
  });

describe('/api/csp-report', () => {
  beforeEach(() => {
    captureMessage.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('reports a violation once, grouped by directive and blocked origin', async () => {
    const first = await post(report('https://route-test.example/a?b=1'));
    const repeat = await post(report('https://route-test.example/other'));

    expect(first.status).toBe(204);
    expect(repeat.status).toBe(204);
    expect(captureMessage).toHaveBeenCalledOnce();
    expect(captureMessage).toHaveBeenCalledWith(
      'CSP would block https://route-test.example (connect-src)',
      {
        level: 'warning',
        fingerprint: ['csp-report', 'connect-src', 'https://route-test.example'],
        extra: { page: '/map', source: null },
      }
    );
  });

  it('answers 204 to anything else and reports nothing', async () => {
    for (const body of ['', 'garbage', report('chrome-extension://abc/x.js'), 'x'.repeat(9000)]) {
      expect((await post(body)).status).toBe(204);
    }
    expect(captureMessage).not.toHaveBeenCalled();
  });
});
