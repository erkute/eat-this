'use client';

import type { User } from 'firebase/auth';
import { avatarIndexFromUid } from '@/lib/firebase/userProfile';
import styles from './ProfileHeader.module.css';

interface Props {
  user: User;
  /** Override avatarIndex (z.B. wenn User später Picker hat). Default: deterministisch aus uid. */
  avatarIndex?: 1 | 2 | 3;
}

export default function ProfileHeader({ user, avatarIndex }: Props) {
  const idx = avatarIndex ?? avatarIndexFromUid(user.uid);
  const name = user.displayName || (user.email ?? '').split('@')[0] || 'Du';

  return (
    <header className={styles.header}>
      {/* Decorative manikins */}
      <span className={`${styles.manikin} ${styles.manikinTopRight}`} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/pics/avatar/${idx}.webp`} alt="" />
      </span>
      <span className={`${styles.manikin} ${styles.manikinMidLeft}`} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/pics/avatar/${idx === 3 ? 1 : idx + 1}.webp`} alt="" />
      </span>

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
