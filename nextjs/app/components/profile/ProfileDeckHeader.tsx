'use client';

import styles from './ProfileDeckHeader.module.css';

interface Props {
  unlockedCount: number;
  totalSlots: number;
}

export default function ProfileDeckHeader({ unlockedCount, totalSlots }: Props) {
  return (
    <div className={styles.header}>
      <p className={styles.label}>Deine Sammlung</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/pics/eat.webp" alt="EAT THIS" className={styles.logo} />
      <span className={styles.count}>
        <span className={styles.countN}>{unlockedCount}</span>
        <span className={styles.countTotal}>/ {totalSlots}</span>
      </span>
    </div>
  );
}
