'use client';

// Remy mount for the restaurant pages. Unlike BuddyWidgetLazy (home: preloads
// on idle), this loads NOTHING — no chat machinery, no chunk — until the first
// BUDDY_ASK_EVENT: the SEO surface pays only for this listener. The ask that
// triggers the mount is buffered by homeStage (pendingBuddyAsk), so the
// question survives the chunk load exactly like on the home hub.
//
// Providers (Auth/LoginModal/UserLocation) come from the surrounding layout —
// restaurant/layout.tsx mounts the same stack as the (spa) layout.

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { BUDDY_ASK_EVENT } from '@/lib/buddy/homeStage';

export const preloadBuddyWidget = () => import('./BuddyWidget');
const BuddyWidget = dynamic(preloadBuddyWidget, { ssr: false });

export default function RemyDock({ pageSlug }: { pageSlug?: string }) {
  const [mount, setMount] = useState(false);

  useEffect(() => {
    if (mount) return;
    const onAsk = () => setMount(true);
    window.addEventListener(BUDDY_ASK_EVENT, onAsk);
    return () => window.removeEventListener(BUDDY_ASK_EVENT, onAsk);
  }, [mount]);

  return mount ? <BuddyWidget pageSlug={pageSlug} /> : null;
}
