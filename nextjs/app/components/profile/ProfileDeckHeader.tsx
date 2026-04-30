'use client';

import styles from './ProfileDeckHeader.module.css';

interface Props {
  unlockedCount: number;
  totalSlots: number;
}

export default function ProfileDeckHeader({ unlockedCount, totalSlots }: Props) {
  return (
    <header className={styles.header}>
      <p className={styles.city}>Berlin</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/pics/logo2.webp" alt="EAT THIS" className={styles.logo} />
      <span
        className={styles.count}
        aria-label={`${unlockedCount} von ${totalSlots} Must-Eats freigeschaltet`}
      >
        <span className={styles.countN} aria-hidden="true">{unlockedCount}</span>
        <span className={styles.countTotal} aria-hidden="true">/ {totalSlots}</span>
      </span>
    </header>
  );
}
