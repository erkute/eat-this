'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { subscribeStarterPackGranted } from '@/lib/auth/signInArrival';
import AuthSurfaceLoading from './AuthSurfaceLoading';

const Panel = dynamic(() => import('./SignInRewardPanel'), {
  ssr: false,
  loading: () => <AuthSurfaceLoading layer="tour" />,
});

/** Keep the grant listener ready while tour artwork and styles load on demand. */
export default function SignInReward() {
  const [arrival, setArrival] = useState<{ cards: string[] | null; sequence: number } | null>(null);
  useEffect(() => {
    const unsubscribe = subscribeStarterPackGranted(cards => {
      setArrival(previous => ({ cards: [...cards], sequence: (previous?.sequence ?? 0) + 1 }));
    });
    if (process.env.NODE_ENV === 'development') {
      const preview = new URLSearchParams(window.location.search).get('preview');
      if (preview === 'welcome' || preview === 'welcome-google' || preview === 'welcome-returning') {
        setArrival(previous => previous ?? { cards: null, sequence: 0 });
      }
    }
    return unsubscribe;
  }, []);
  return arrival ? <Panel key={arrival.sequence} cards={arrival.cards} /> : null;
}
