'use client';

import { useLayoutEffect } from 'react';
import { arriveAtSpot } from '@/lib/spotTransition';

export default function SpotArrival({ slug }: { slug: string }) {
  useLayoutEffect(() => {
    const page = document.querySelector<HTMLElement>('main');
    if (page) return arriveAtSpot(page, location.pathname);
  }, [slug]);
  return null;
}
