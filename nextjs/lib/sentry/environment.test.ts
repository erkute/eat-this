import { afterEach, describe, expect, it, vi } from 'vitest';

import { sentryEnabled, sentryEnvironment } from './environment';

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

describe('sentryEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('meldet nur auf App Hosting, nicht aus lokalen Servern', () => {
    vi.stubEnv('NEXT_PUBLIC_ENV', '');
    expect(sentryEnabled()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_ENV', 'staging');
    expect(sentryEnabled()).toBe(true);
    vi.stubEnv('NEXT_PUBLIC_ENV', 'production');
    expect(sentryEnabled()).toBe(true);
  });
});
