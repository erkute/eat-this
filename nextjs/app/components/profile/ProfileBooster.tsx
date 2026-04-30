'use client';

import { useState } from 'react';
import styles from './ProfileBooster.module.css';

const PACKS = [
  { id: 'classic', image: '/pics/booster/booster1.webp' },
  { id: 'kiez',    image: '/pics/booster/booster2.webp' },
  { id: 'premium', image: '/pics/booster/booster5.webp' },
];

const PRICE = '€0,99';
const DESC  = '10 zufällige Must-Eats aus ganz Berlin';

export default function ProfileBooster() {
  const [selected, setSelected]     = useState<number | null>(null);
  const [comingSoon, setComingSoon] = useState(false);

  function handleBuy() {
    setComingSoon(true);
    setTimeout(() => setComingSoon(false), 2600);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <p className={styles.label}>Booster Packs</p>
        <h2 className={styles.title}>Mehr Karten freischalten</h2>
        <p className={styles.subtitle}>{DESC}</p>
      </div>

      <div className={`${styles.packRow}${selected !== null ? ` ${styles.packRowHasSelection}` : ''}`}>
        {PACKS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.packCard}${selected === i ? ` ${styles.packCardActive}` : ''}`}
            onClick={() => setSelected(i)}
            aria-pressed={selected === i}
            aria-label={`Booster Pack ${i + 1} auswählen`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt="" className={styles.packImg} loading="lazy" />
          </button>
        ))}
      </div>

      <button
        type="button"
        className={`${styles.buyBtn}${comingSoon ? ` ${styles.buyBtnSoon}` : ''}`}
        onClick={handleBuy}
      >
        {comingSoon ? 'Coming Soon' : `Kaufen — ${PRICE}`}
      </button>

      <div className={styles.paymentRow} aria-label="Akzeptierte Zahlungsmethoden">
        {/* PayPal wordmark */}
        <svg className={styles.payIcon} viewBox="0 0 80 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="PayPal">
          <text x="0" y="16" fontSize="14" fontWeight="700" fontFamily="Arial,sans-serif" fill="#003087">Pay</text>
          <text x="26" y="16" fontSize="14" fontWeight="700" fontFamily="Arial,sans-serif" fill="#009cde">Pal</text>
        </svg>
        <span className={styles.payDot} aria-hidden="true">·</span>
        {/* Visa wordmark */}
        <svg className={styles.payIcon} viewBox="0 0 48 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Visa">
          <text x="0" y="13" fontSize="13" fontWeight="900" fontFamily="Arial,sans-serif" letterSpacing="1" fill="#1a1f71">VISA</text>
        </svg>
        <span className={styles.payDot} aria-hidden="true">·</span>
        {/* Mastercard two-circle mark */}
        <svg className={styles.payIconMc} viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard">
          <circle cx="14" cy="12" r="10" fill="#eb001b"/>
          <circle cx="24" cy="12" r="10" fill="#f79e1b"/>
          <path d="M19 5.4a10 10 0 0 1 0 13.2A10 10 0 0 1 19 5.4z" fill="#ff5f00"/>
        </svg>
        <span className={styles.payDot} aria-hidden="true">·</span>
        <span className={styles.payLabel}>Apple Pay</span>
      </div>
    </div>
  );
}
