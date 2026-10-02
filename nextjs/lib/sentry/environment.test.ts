import { afterEach, describe, expect, it, vi } from 'vitest';

import { sentryEnvironment } from './environment';

describe('sentryEnvironment', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('trennt Staging von Produktion, obwohl beide Produktions-Builds sind', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_ENV', 'staging');
    expect(sentryEnvironment()).toBe('staging');
    vi.stubEnv('NEXT_PUBLIC_ENV', 'production');
    expect(sentryEnvironment()).toBe('production');
  });

  it('fällt lokal ohne NEXT_PUBLIC_ENV auf NODE_ENV zurück', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENV', '');
    expect(sentryEnvironment()).toBe('development');
  });
});
