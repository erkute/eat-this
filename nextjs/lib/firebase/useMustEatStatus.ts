'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './config';
import { ensureUserProfile, setEaten as setEatenFs, USER_PROFILES } from './userProfile';
import type { UserProfile } from '@/lib/types';

export function useMustEatStatus(uid: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRef = useRef<UserProfile | null>(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const ref = doc(db, USER_PROFILES, uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          // First-time user — create the doc lazily here so we don't double-write
          ensureUserProfile(uid).catch((err) =>
            console.error('[userProfile] ensure failed:', err),
          );
        }
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
      const isEaten = !!profileRef.current?.mustEatStatus?.eaten?.[mustEatId];
      await setEatenFs(uid, mustEatId, !isEaten).catch((err) =>
        console.error('[useMustEatStatus] toggle failed:', err),
      );
    },
    [uid],
  );

  return { profile, loading, toggleEaten };
}
