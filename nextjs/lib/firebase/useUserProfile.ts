'use client';

import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export type AvatarChoice = 1 | 2 | 3;

export interface UserProfile {
  avatar:      AvatarChoice | null;
  onboardedAt: Timestamp | null;
}

// Subscribes to the user's profile doc. `avatar: null` means the user
// hasn't chosen one — UI falls back to a UID-derived default.
// `onboardedAt: null` means the onboarding hasn't been completed.
export function useUserProfile(uid: string | null) {
  const [profile, setProfile] = useState<UserProfile>({ avatar: null, onboardedAt: null });
  const [loading, setLoading] = useState<boolean>(!!uid);

  useEffect(() => {
    if (!uid) {
      setProfile({ avatar: null, onboardedAt: null });
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(db, 'users', uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        const rawAvatar = data?.avatar;
        const avatar: AvatarChoice | null =
          rawAvatar === 1 || rawAvatar === 2 || rawAvatar === 3 ? rawAvatar : null;
        const rawOnboardedAt = data?.onboardedAt;
        const onboardedAt: Timestamp | null =
          rawOnboardedAt != null && typeof (rawOnboardedAt as Timestamp).toDate === 'function'
            ? (rawOnboardedAt as Timestamp)
            : null;
        setProfile({ avatar, onboardedAt });
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [uid]);

  const setAvatar = useCallback(
    async (choice: AvatarChoice) => {
      if (!uid) return;
      await setDoc(doc(db, 'users', uid), { avatar: choice }, { merge: true });
    },
    [uid],
  );

  const markOnboarded = useCallback(
    async () => {
      if (!uid) return;
      await setDoc(doc(db, 'users', uid), { onboardedAt: serverTimestamp() }, { merge: true });
    },
    [uid],
  );

  return { profile, loading, setAvatar, markOnboarded };
}

// Deterministic fallback when the user hasn't picked an avatar yet.
export function defaultAvatarFromUid(uid: string): AvatarChoice {
  const slice = parseInt(uid.slice(0, 8), 16) || 0;
  return ((slice % 3) + 1) as AvatarChoice;
}
