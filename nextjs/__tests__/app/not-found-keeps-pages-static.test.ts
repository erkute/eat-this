import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/* `not-found.tsx` sits in the tree of EVERY route. One headers() read anywhere
 * in that tree makes every route dynamic — and next-intl's server APIs read
 * headers() to resolve the active locale.
 *
 * That is not a theoretical risk. It happened: a single `Link` from
 * `@/i18n/navigation` inside the server component NotFoundContent turned the
 * whole site dynamic. `next build --debug` reported "Static generation failed
 * … reason: headers" 791 times, the build wrote ZERO prerendered HTML files,
 * and every page — including the ~690 restaurant pages — was re-rendered per
 * request and answered `Cache-Control: no-store`. The App Hosting CDN stored
 * nothing for months.
 *
 * The failure is invisible: the build still prints "Generating static pages
 * (811/811)" and still marks the routes `●`. Only the empty
 * `.next/server/app/**` and a three-entry prerender-manifest give it away.
 * Hence this test.
 *
 * Client components in the subtree are fine — their next-intl calls run in the
 * browser. Only server components matter here. */

/* The ROOT not-found and everything it renders. These sit outside `[locale]`,
 * so no layout has called setRequestLocale() — any locale lookup here falls
 * through to headers().
 *
 * `app/[locale]/not-found.tsx` is deliberately NOT in this list: it lives
 * below `[locale]/layout.tsx`, which calls setRequestLocale(locale), so its
 * getLocale() is answered from that cache and never touches headers. The
 * shared components below are reachable from BOTH, so they must stay clean
 * either way. */
const SERVER_COMPONENTS_IN_NOT_FOUND_TREE = [
  'app/not-found.tsx',
  'app/components/NotFoundContent.tsx',
  'app/components/NotFoundAppFrame.tsx',
];

const LOCALE_RESOLVING_IMPORTS = [
  "from '@/i18n/navigation'",
  "from 'next-intl/server'",
  "from 'next/headers'",
];

describe('404 tree keeps the rest of the site prerenderable', () => {
  it.each(SERVER_COMPONENTS_IN_NOT_FOUND_TREE)(
    '%s pulls in nothing that reads headers()',
    (file) => {
      const source = readFileSync(join(process.cwd(), file), 'utf8');

      // A client component may import whatever it likes — it never runs the
      // server-side locale lookup.
      if (/^['"]use client['"]/.test(source.trimStart())) return;

      for (const forbidden of LOCALE_RESOLVING_IMPORTS) {
        expect(source, `${file} must not import ${forbidden}`).not.toContain(forbidden);
      }
    }
  );

  it('NotFoundContent builds its own locale prefix instead of inferring one', () => {
    const source = readFileSync(join(process.cwd(), 'app/components/NotFoundContent.tsx'), 'utf8');

    expect(source).toContain('const linkTo =');
    expect(source).toContain("locale === 'en' ? `/en${href}` : href");
    expect(source).not.toContain('<Link');
  });
});
