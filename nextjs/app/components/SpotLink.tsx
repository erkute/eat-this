'use client';

import type { ComponentProps } from 'react';
import { Link } from '@/i18n/navigation';
import { beginSpotTransition } from '@/lib/spotTransition';

/** Native localized navigation; the destination may make a subtle settling motion. */
export default function SpotLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props} onClick={(event) => {
      props.onClick?.(event);
      beginSpotTransition(event);
    }}>
      {children}
    </Link>
  );
}
