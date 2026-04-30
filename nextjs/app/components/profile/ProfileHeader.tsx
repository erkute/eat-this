'use client';

import type { User } from 'firebase/auth';
import { defaultAvatarFromUid, useUserProfile } from '@/lib/firebase/useUserProfile';
import styles from './ProfileHeader.module.css';

interface Props {
  user: User;
}

export default function ProfileHeader({ user }: Props) {
  const { profile } = useUserProfile(user.uid);
  const idx = profile.avatar ?? defaultAvatarFromUid(user.uid);
  const name = user.displayName || (user.email ?? '').split('@')[0] || 'Du';

  return (
    <header className={styles.header}>
      <div className={styles.avatarWrap}>
        <div className={styles.avatar}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/pics/avatar/${idx}.webp`} alt="" />
        </div>
      </div>
      <div className={styles.info}>
        <p className={styles.label}>Dein Profil</p>
        <h1 className={styles.name}>{name}</h1>
      </div>
    </header>
  );
}
