'use client';

import { useState } from 'react';
import styles from './ProfileBooster.module.css';

interface Pack {
  id:    string;
  image: string;
  name:  string;
  desc:  string;
  price: string;
}

const HERO: Pack = {
  id:    'berlin',
  image: '/pics/booster/booster1.webp',
  name:  'Berlin Komplett',
  desc:  'Alle 150 Must Eats sofort freischalten',
  price: '19,99 €',
};

const CATEGORIES: Pack[] = [
  { id: 'cafes',       image: '/pics/booster/booster2.webp',      name: 'Cafés',     desc: 'Alle Café-Spots',       price: '2,99 €' },
  { id: 'fruehstueck', image: '/pics/booster/booster3.webp',      name: 'Frühstück', desc: 'Alle Frühstücks-Spots', price: '2,99 €' },
  { id: 'lunch',       image: '/pics/booster/booster5.webp',      name: 'Lunch',     desc: 'Alle Lunch-Spots',      price: '2,99 €' },
  { id: 'dinner',      image: '/pics/booster/booster_pack_5.webp', name: 'Dinner',    desc: 'Alle Dinner-Spots',     price: '2,99 €' },
];

const RANDOM: Pack = {
  id:    'random10',
  image: '/pics/booster/booster.webp',
  name:  '10 Zufällige',
  desc:  '10 Must Eats aus ganz Berlin',
  price: '0,99 €',
};

export default function ProfileBooster() {
  const [comingSoonId, setComingSoonId] = useState<string | null>(null);

  function handleBuy(id: string) {
    setComingSoonId(id);
    setTimeout(() => setComingSoonId(null), 2600);
  }
  const isSoon = (id: string) => comingSoonId === id;

  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <p className={styles.label}>Booster Packs</p>
        <h2 className={styles.title}>Mehr Karten freischalten</h2>
      </div>

      {/* ── Hero pack: Berlin Komplett ── */}
      <article className={styles.heroPack}>
        <div className={styles.heroImgWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO.image} alt="" className={styles.heroImg} loading="lazy" />
        </div>
        <h3 className={styles.heroName}>{HERO.name}</h3>
        <p className={styles.heroDesc}>{HERO.desc}</p>
        <button
          type="button"
          className={`${styles.heroBuyBtn}${isSoon(HERO.id) ? ` ${styles.buyBtnSoon}` : ''}`}
          onClick={() => handleBuy(HERO.id)}
          disabled={isSoon(HERO.id)}
        >
          {isSoon(HERO.id) ? (
            <span className={styles.heroBuyAction}>Coming Soon</span>
          ) : (
            <>
              <span className={styles.heroBuyAction}>Pack holen</span>
              <span className={styles.heroBuyPrice}>{HERO.price}</span>
            </>
          )}
        </button>
      </article>

      {/* ── Category 2×2 grid ── */}
      <section className={styles.catSection}>
        <p className={styles.sectionLabel}>Nach Kategorie</p>
        <div className={styles.catGrid}>
          {CATEGORIES.map((p) => (
            <article key={p.id} className={styles.catPack}>
              <div className={styles.catImgWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt="" className={styles.catImg} loading="lazy" />
              </div>
              <span className={styles.catName}>{p.name}</span>
              <button
                type="button"
                className={`${styles.catBuyBtn}${isSoon(p.id) ? ` ${styles.buyBtnSoon}` : ''}`}
                onClick={() => handleBuy(p.id)}
                disabled={isSoon(p.id)}
              >
                {isSoon(p.id) ? 'Bald' : p.price}
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ── Random row: small impulse-buy ── */}
      <article className={styles.randomPack}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={RANDOM.image} alt="" className={styles.randomImg} loading="lazy" />
        <div className={styles.randomInfo}>
          <span className={styles.randomName}>{RANDOM.name}</span>
          <span className={styles.randomDesc}>{RANDOM.desc}</span>
        </div>
        <button
          type="button"
          className={`${styles.randomBuyBtn}${isSoon(RANDOM.id) ? ` ${styles.buyBtnSoon}` : ''}`}
          onClick={() => handleBuy(RANDOM.id)}
          disabled={isSoon(RANDOM.id)}
        >
          {isSoon(RANDOM.id) ? 'Bald' : RANDOM.price}
        </button>
      </article>

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
