'use client';

// The global ask listener stays ready. The homepage stage warms the widget
// as it approaches the viewport; unopened chat code stays off the hero's path.

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { BUDDY_ASK_EVENT } from '@/lib/buddy/homeStage';

import { loadBuddyWidget } from './loadBuddyWidget';

const BuddyWidget = dynamic(loadBuddyWidget, { ssr: false });

export default function RemyDock() {
  const [mount, setMount] = useState(false);

  useEffect(() => {
    if (mount) return;
    const onAsk = () => setMount(true);
    window.addEventListener(BUDDY_ASK_EVENT, onAsk);
    return () => window.removeEventListener(BUDDY_ASK_EVENT, onAsk);
  }, [mount]);

  return mount ? <BuddyWidget /> : null;
}
