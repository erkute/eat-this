'use client';

import type { MouseEvent, ReactNode } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { transitionToCategory } from '@/lib/categoryPackTransition';

/** A category link whose pack flies into the category page it opens. */
export default function CategoryPackLink({ slug, children }: { slug: string; children: ReactNode }) {
  const router = useRouter();
  const href = `/kategorie/${slug}`;

  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0
      || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const pack = event.currentTarget.querySelector('img');
    if (!pack || typeof document.startViewTransition !== 'function'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    event.preventDefault();
    transitionToCategory(pack, slug, () => router.push(href));
  }

  return <Link href={href} onClick={open}>{children}</Link>;
}
