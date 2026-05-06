// Locale-aware navigation helpers from next-intl. Wires `Link`, `useRouter`,
// `usePathname`, `redirect`, `getPathname` to the routing config so they
// honour `localePrefix: 'as-needed'` automatically (no /de prefix on DE,
// /en prefix on EN). Replaces the legacy `LocaleLink` wrapper that did the
// prefixing by hand and forced a full page reload — soft-nav is fine now
// that the vanilla SPA bundles are gone.

import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
