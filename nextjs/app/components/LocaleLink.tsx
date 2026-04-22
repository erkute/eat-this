'use client';

/**
 * Locale-aware anchor that does a full page reload (plain <a>, not next/link).
 * Full reloads are intentional until the legacy app.min.js / map-init.min.js
 * are migrated to React — next/link's client-side navigation skips their
 * DOMContentLoaded init. Remove this comment once Phase B is complete.
 */

import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
};

export default function LocaleLink({ href, children, ...rest }: Props) {
  const locale = useLocale();
  const prefixed = locale === routing.defaultLocale || !href.startsWith('/')
    ? href
    : `/${locale}${href}`;
  return (
    <a href={prefixed} {...rest}>
      {children}
    </a>
  );
}
