'use client';

import { useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './config';
import { ensureUserProfile, setEaten as setEatenFs } from './userProfile';
import type { UserProfile } from '@/lib/types';

export function useMustEatStatus(uid: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    ensureUserProfile(uid).catch((err) => console.error('[userProfile] ensure failed:', err));
    const ref = doc(db, 'userProfiles', uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (cancelled) return;
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
        setLoading(false);
      },
      (err) => {
        console.error('[useMustEatStatus] snapshot error:', err);
        if (!cancelled) setLoading(false);
      },
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, [uid]);

  const toggleEaten = useCallback(
    async (mustEatId: string) => {
      if (!uid) return;
      const isEaten = !!profile?.mustEatStatus.eaten[mustEatId];
      await setEatenFs(uid, mustEatId, !isEaten).catch((err) =>
        console.error('[useMustEatStatus] toggle failed:', err),
      );
    },
    [uid, profile],
  );

  return { profile, loading, toggleEaten };
}
