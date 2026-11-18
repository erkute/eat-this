// Locale-aware navigation helpers from next-intl. Wires `Link`, `useRouter`,
// `usePathname`, `redirect`, `getPathname` to the routing config so they honour
// `localePrefix: 'as-needed'` automatically (no /de prefix on DE, /en prefix on
// EN). Soft navigation, no prefixing by hand.

import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, usePathname, useRouter } =
  createNavigation(routing);
