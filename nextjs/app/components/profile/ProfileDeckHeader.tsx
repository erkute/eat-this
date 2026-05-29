'use client';

import styles from './ProfileDeckHeader.module.css';

interface Props {
  unlockedCount: number;
  totalSlots: number;
}

export default function ProfileDeckHeader({ unlockedCount, totalSlots }: Props) {
  return (
    <header className={styles.header}>
      <span
        className={styles.count}
        aria-label={`${unlockedCount} von ${totalSlots} Must Eats freigeschaltet`}
      >
        <span className={styles.countN} aria-hidden="true">{unlockedCount}</span>
        <span className={styles.countTotal} aria-hidden="true">/ {totalSlots}</span>
      </span>
    </header>
  );
}
