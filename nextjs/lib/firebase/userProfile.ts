import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from './config';
import type { UserProfile } from '@/lib/types';

export const USER_PROFILES = 'userProfiles';

export function avatarIndexFromUid(uid: string): 1 | 2 | 3 {
  // Deterministic: same uid -> always same avatar
  const slice = parseInt(uid.slice(0, 8), 16) || 0;
  return ((slice % 3) + 1) as 1 | 2 | 3;
}

export async function ensureUserProfile(uid: string): Promise<UserProfile> {
  const ref = doc(db, USER_PROFILES, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  const fresh: UserProfile = {
    uid,
    avatarIndex: avatarIndexFromUid(uid),
    mustEatStatus: { eaten: {} },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(ref, fresh, { merge: true });
  return fresh;
}

export async function setEaten(uid: string, mustEatId: string, eaten: boolean): Promise<void> {
  const ref = doc(db, USER_PROFILES, uid);
  const path = `mustEatStatus.eaten.${mustEatId}`;
  if (eaten) {
    await updateDoc(ref, { [path]: true, updatedAt: Date.now() });
  } else {
    await updateDoc(ref, { [path]: deleteField(), updatedAt: Date.now() });
  }
}
