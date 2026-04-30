'use client';

import styles from './ProfileDeckHeader.module.css';

interface Props {
  unlockedCount: number;
  totalSlots: number;
}

export default function ProfileDeckHeader({ unlockedCount, totalSlots }: Props) {
  return (
    <header className={styles.header}>
      <h2 className={styles.heading}>
        <span className={styles.label}>Deine Sammlung</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pics/eat.webp" alt="EAT THIS" className={styles.logo} />
      </h2>
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
