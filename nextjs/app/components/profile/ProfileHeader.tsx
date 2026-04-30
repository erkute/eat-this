'use client';

import type { User } from 'firebase/auth';
import styles from './ProfileHeader.module.css';

function avatarIndexFromUid(uid: string): 1 | 2 | 3 {
  const slice = parseInt(uid.slice(0, 8), 16) || 0;
  return ((slice % 3) + 1) as 1 | 2 | 3;
}

interface Props {
  user: User;
}

export default function ProfileHeader({ user }: Props) {
  const idx = avatarIndexFromUid(user.uid);
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
