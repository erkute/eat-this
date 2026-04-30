'use client';

import { useState } from 'react';
import styles from './ProfileBooster.module.css';

const COVERS = [
  '/pics/booster/booster1.webp',
  '/pics/booster/booster2.webp',
  '/pics/booster/booster5.webp',
];

export default function ProfileBooster() {
  const [selectedCover, setSelectedCover] = useState(0);

  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <p className={styles.label}>Booster Pack — Coming Soon</p>
        <h2 className={styles.title}>Mehr Karten freischalten</h2>
      </div>

      <div className={styles.packPreview}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={COVERS[selectedCover]} alt="" className={styles.packImg} loading="lazy" />
        <div className={styles.packInfo}>
          <p className={styles.packDesc}>10 zufällige Must-Eats aus Berlin</p>
          <span className={styles.packPrice}>€0,99</span>
        </div>
      </div>

      <div className={styles.coverPicker}>
        {COVERS.map((cover, i) => (
          <button
            key={cover}
            type="button"
            className={`${styles.coverThumb}${selectedCover === i ? ` ${styles.coverThumbActive}` : ''}`}
            onClick={() => setSelectedCover(i)}
            aria-pressed={selectedCover === i}
            aria-label={`Cover ${i + 1} auswählen`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" loading="lazy" />
          </button>
        ))}
      </div>

      <button type="button" className={styles.packBtn} disabled>
        Coming Soon
      </button>
    </div>
  );
}
