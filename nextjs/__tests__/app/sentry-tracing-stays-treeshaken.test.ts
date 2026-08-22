import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/* Performance tracing is tree-shaken out of the Sentry SDK. Measured: it takes
 * "First Load JS shared by all" from 188 kB to 137 kB — roughly 50 kB gzip off
 * every one of the 43 routes, including the map (341 → 291 kB).
 *
 * Error reporting is deliberately NOT affected: captureException, breadcrumbs,
 * stack traces and source-map resolution all still work. Only spans,
 * transactions, Web Vitals and trace headers are gone. Lighthouse CI measures
 * Web Vitals against production on every main push, which at this traffic is a
 * better sample than tracesSampleRate 0.1 ever was.
 *
 * Three things have to stay in sync, and none of them fails loudly if they
 * drift — the bundle just quietly grows by 50 kB again:
 *
 *   1. `webpack.treeshake.removeTracing` in next.config.ts does the actual
 *      removal. Note the shape: `bundleSizeOptimizations.excludeTracing` looks
 *      like it would do the same and does NOT — only `webpack.treeshake`
 *      reaches setupTreeshakingFromConfig in @sentry/nextjs 10.57.0. The
 *      previous config used the wrong block and claimed a saving it never made.
 *   2. `tracesSampleRate` must not come back in any of the three Sentry
 *      configs. It would be inert (the code it drives is gone) but it reads as
 *      if tracing were on.
 *   3. `onRouterTransitionStart` must not be exported from
 *      instrumentation-client.ts: it is `Sentry.captureRouterTransitionStart`,
 *      which is tree-shaken away, so the export would hand Next an undefined
 *      hook. */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

const SENTRY_CONFIGS = [
  'instrumentation-client.ts',
  'sentry.server.config.ts',
  'sentry.edge.config.ts',
];

describe('Sentry tracing stays out of the bundle', () => {
  it('next.config.ts removes tracing through the block that actually works', () => {
    const source = read('next.config.ts');

    expect(source).toMatch(/webpack:\s*\{\s*treeshake:\s*\{/);
    expect(source).toContain('removeTracing: true');
  });

  it.each(SENTRY_CONFIGS)('%s sets no tracesSampleRate', (file) => {
    const source = read(file);
    const active = source
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('//'))
      .join('\n');

    expect(active).not.toContain('tracesSampleRate');
  });

  it('instrumentation-client.ts exports no router-transition hook', () => {
    const source = read('instrumentation-client.ts');
    const active = source
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('//'))
      .join('\n');

    expect(active).not.toContain('onRouterTransitionStart');
    expect(active).not.toContain('captureRouterTransitionStart');
  });

  it('still initialises Sentry, so error reporting is untouched', () => {
    const source = read('instrumentation-client.ts');

    expect(source).toContain('Sentry.init(');
    expect(source).toContain('dsn:');
  });
});
