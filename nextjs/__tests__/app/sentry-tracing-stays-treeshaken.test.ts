import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/*
 * Performance tracing is tree-shaken out of the Sentry SDK, roughly 50 kB gzip
 * off every route, the map included.
 *
 * Error reporting is not affected: captureException, breadcrumbs, stack traces
 * and source-map resolution all still work. Only spans, transactions, Web
 * Vitals and trace headers are gone; Lighthouse CI measures Web Vitals against
 * production.
 *
 * Three things have to stay in sync, and none of them fails loudly if they
 * drift; the bundle just quietly grows again:
 *
 *   1. `webpack.treeshake.removeTracing` in next.config.ts does the actual
 *      removal. `bundleSizeOptimizations.excludeTracing` looks like it would
 *      do the same and does not: only `webpack.treeshake` reaches
 *      setupTreeshakingFromConfig in @sentry/nextjs.
 *   2. `tracesSampleRate` must not come back in any of the three Sentry
 *      configs. It would be inert (the code it drives is gone) but it reads as
 *      if tracing were on.
 *   3. `onRouterTransitionStart` must not be exported from
 *      instrumentation-client.ts: it is `Sentry.captureRouterTransitionStart`,
 *      which is tree-shaken away, so the export would hand Next an undefined
 *      hook.
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

const SENTRY_CONFIGS = [
  'lib/sentry/client-sdk.ts',
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

  it('still initialises the deferred SDK for error reporting', () => {
    const source = read('lib/sentry/client-sdk.ts');

    expect(source).toContain('Sentry.init(');
    expect(source).toContain('dsn:');
  });
});
