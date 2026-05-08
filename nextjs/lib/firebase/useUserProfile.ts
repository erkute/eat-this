'use client';

import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export type AvatarChoice = 1 | 2 | 3;

export interface UserProfile {
  avatar:      AvatarChoice | null;
  onboardedAt: Timestamp | null;
}

// localStorage cache key — per-uid so a sign-out / sign-in to a different
// account on the same device doesn't leak the previous avatar choice.
const CACHE_KEY = (uid: string) => `eatthis_avatar_${uid}`;

function readCachedAvatar(uid: string | null): AvatarChoice | null {
  if (!uid || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY(uid));
    const n = Number(raw);
    return n === 1 || n === 2 || n === 3 ? (n as AvatarChoice) : null;
  } catch { return null; }
}

function writeCachedAvatar(uid: string, avatar: AvatarChoice) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(CACHE_KEY(uid), String(avatar)); } catch {}
}

// Subscribes to the user's profile doc. `avatar: null` means the user
// hasn't chosen one — UI falls back to a UID-derived default.
// `onboardedAt: null` means the onboarding hasn't been completed.
//
// Avatar is cached to localStorage so /profile renders the correct
// avatar on first paint, instead of flashing the UID-hash default while
// Firestore loads.
export function useUserProfile(uid: string | null) {
  const [profile, setProfile] = useState<UserProfile>(() => ({
    avatar:      readCachedAvatar(uid),
    onboardedAt: null,
  }));
  const [loading, setLoading] = useState<boolean>(!!uid);

  useEffect(() => {
    if (!uid) {
      setProfile({ avatar: null, onboardedAt: null });
      setLoading(false);
      return;
    }
    // uid may have changed since mount — reseed avatar from the cache
    // for this uid before Firestore resolves.
    setProfile((prev) => ({ ...prev, avatar: readCachedAvatar(uid) }));
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
        if (avatar !== null) writeCachedAvatar(uid, avatar);
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
      // Optimistic local cache + state — covers the case where the user
      // picks an avatar and immediately navigates to /profile before the
      // Firestore snapshot has fired.
      writeCachedAvatar(uid, choice);
      setProfile((prev) => ({ ...prev, avatar: choice }));
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
